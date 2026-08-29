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
import { AuthHeaderAction } from "../../src/ui/AuthHeaderAction";
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
        <PremiumHeader title={t("chat.title")} subtitle={t("chat.subtitle")} onBack={() => router.back()} right={<AuthHeaderAction />} />
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>{t("chat.loading")}</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            style={styles.messageList}
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View style={[styles.msgRow, mine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.body, mine ? styles.bodyMe : styles.bodyOther]}>{item.body}</Text>
                    <Text style={[styles.time, mine ? styles.timeMe : styles.timeOther]}>{timeShort(item.created_at)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("chat.placeholder")}
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={sendMessage}
              disabled={sending || !text.trim()}
              style={({ pressed }) => [styles.sendBtn, (sending || !text.trim()) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.sendTxt}>{sending ? "…" : t("chat.send")}</Text>
            </Pressable>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  chatArea: { flex: 1 },
  messageList: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { marginTop: 8, color: theme.colors.muted, fontWeight: "700" },

  msgRow: { flexDirection: "row", marginBottom: 10 },
  bubble: { maxWidth: "82%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleMe: { backgroundColor: theme.colors.primary },
  bubbleOther: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },

  body: { fontWeight: "700", lineHeight: 18 },
  bodyMe: { color: "#fff" },
  bodyOther: { color: theme.colors.text },

  time: { marginTop: 6, fontSize: 11, fontWeight: "800" },
  timeMe: { color: "rgba(255,255,255,0.85)", alignSelf: "flex-end" },
  timeOther: { color: theme.colors.muted, alignSelf: "flex-end" },

  inputBar: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    fontWeight: "700",
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendTxt: { color: "#fff", fontWeight: "900" },
});
