// app/chat/[matchId].tsx
// Chat-skjerm (stabil realtime): subscribe først etter at alle postgres_changes callbacks er registrert.
// Fikser crash: "cannot add `postgres_changes` callbacks ... after `subscribe()`".

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/contexts/AuthContext";
import { theme } from "../../src/ui/theme";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { useI18n } from "../../src/i18n/I18nProvider";

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function timeShort(iso: string) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, t } = useI18n();

  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = useMemo(() => {
    const mid = params?.matchId;
    return Array.isArray(mid) ? mid[0] : mid;
  }, [params?.matchId]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  const listRef = useRef<FlatList<Msg>>(null as any);

  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", matchId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) throw error;
      setMessages((data as any as Msg[]) ?? []);

      // scroll til bunn etter initial load
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: false });
        } catch {}
      }, 50);
    } catch (e: any) {
      Alert.alert(t("chat.errorTitle"), e?.message ?? t("chat.loadError"));
    } finally {
      setLoading(false);
    }
  }, [matchId, t]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription (viktig: .on(...) før .subscribe())
  useEffect(() => {
    if (!matchId || !user?.id) return;

    const channel = supabase
      .channel(`realtime:chat:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${matchId}`,
        },
        (payload: any) => {
          const msg = payload?.new as Msg | undefined;
          if (!msg?.id) return;

          setMessages((prev) => {
            // dedupe
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // scroll til bunn når ny melding kommer
          setTimeout(() => {
            try {
              listRef.current?.scrollToEnd({ animated: true });
            } catch {}
          }, 30);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id]);

  // Oppdater når skjermen får fokus (f.eks. etter å ha vært ute)
  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      return () => {};
    }, [fetchMessages])
  );

  const sendMessage = useCallback(async () => {
    if (!matchId || !user?.id) return;
    const body = text.replace(/\s+/g, " ").trim();
    if (!body) return;

    setSending(true);
    setText("");

    // Optimistisk insert
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      conversation_id: matchId,
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: matchId,
        sender_id: user.id,
        body,
      });

      if (error) throw error;

      // refresh (for å erstatte tmp-id med ekte id)
      await fetchMessages();
    } catch (e: any) {
      // Rull tilbake optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert(t("chat.errorTitle"), e?.message ?? t("chat.sendError"));
      setText(body);
    } finally {
      setSending(false);
      setText("");
    }
  }, [matchId, user?.id, text, fetchMessages, t]);

  if (!matchId) {
    return (
      <View style={styles.center}>
        <Text>{t("chat.unavailable")}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.compactHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("chat.title")}</Text>
            <Text style={styles.headerSubtitle}>{t("chat.subtitle")}</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.muted}>{t("chat.loading")}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.messageList}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.messageContent}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => { try { listRef.current?.scrollToEnd({ animated: false }); } catch {} }}
              ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyTitle}>{language === "en" ? "No messages yet" : "Ingen meldinger ennå"}</Text><Text style={styles.emptyBody}>{language === "en" ? "Write the first message below." : "Skriv den første meldingen nedenfor."}</Text></View>}
              renderItem={({ item }) => {
                const mine = item.sender_id === user?.id;
                return <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}><View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther]}><Text style={[styles.body, mine ? styles.bodyMe : styles.bodyOther]}>{item.body}</Text><Text style={[styles.time, mine ? styles.timeMe : styles.timeOther]}>{timeShort(item.created_at)}</Text></View></View>;
              }}
            />
          )}
          <View style={[styles.composerWrap, { paddingBottom: Math.max(10, insets.bottom) }]}>
            <View style={styles.inputShell}><TextInput value={text} onChangeText={setText} placeholder={t("chat.placeholder")} placeholderTextColor={theme.colors.muted} style={styles.input} multiline maxLength={1000} editable={!sending} /></View>
            <Pressable onPress={() => void sendMessage()} disabled={sending || !text.trim()} style={({ pressed }) => [styles.sendBtn, (sending || !text.trim()) && styles.sendBtnDisabled, pressed && styles.pressed]}><Text style={styles.sendTxt}>{sending ? "…" : t("chat.send")}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  compactHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F6" },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  backText: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  headerText: { marginLeft: 12 },
  headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  headerSubtitle: { marginTop: 1, color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  keyboardArea: { flex: 1 }, messageList: { flex: 1 },
  messageContent: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, muted: { marginTop: 8, color: theme.colors.muted, fontWeight: "700" },
  emptyWrap: { flex: 1, minHeight: 220, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }, emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900" }, emptyBody: { marginTop: 6, color: theme.colors.muted, fontSize: 14, fontWeight: "600", textAlign: "center" },
  msgRow: { flexDirection: "row", marginBottom: 7 }, msgRowMine: { justifyContent: "flex-end", paddingLeft: 54 }, msgRowOther: { justifyContent: "flex-start", paddingRight: 54 },
  bubble: { maxWidth: "86%", minWidth: 66, borderRadius: 17, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 }, bubbleMe: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 5 }, bubbleOther: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderBottomLeftRadius: 5 },
  body: { fontSize: 15.5, fontWeight: "600", lineHeight: 20 }, bodyMe: { color: "#FFFFFF" }, bodyOther: { color: theme.colors.text }, time: { marginTop: 2, fontSize: 9.5, fontWeight: "700", alignSelf: "flex-end" }, timeMe: { color: "rgba(255,255,255,0.70)" }, timeOther: { color: theme.colors.muted },
  composerWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.bg },
  inputShell: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card, justifyContent: "center" }, input: { minHeight: 42, maxHeight: 116, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 9, color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  sendBtn: { minWidth: 66, height: 44, paddingHorizontal: 14, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary }, sendBtnDisabled: { opacity: 0.42 }, sendTxt: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 }, pressed: { opacity: 0.82 },
});
