// app/notifications.tsx
// In-app varsler: feed + mark as read + trygg deep link + sletting av utilgjengelige varsler.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { API_BASE_URL } from "../src/lib/config";
import { theme } from "../src/ui/theme";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { AuthHeaderAction } from "../src/ui/AuthHeaderAction";
import { useI18n } from "../src/i18n/I18nProvider";

type Notif = {
  id: string;
  user_id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
  agg_count?: number | null;
  target_status?: "ok" | "missing";
  target_kind?: "match" | "report" | "chat" | "unknown" | string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "nå";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} t`;
  const days = Math.floor(h / 24);
  return `${days} d`;
}

function invalidReasonLabel(n: Notif, language: "no" | "en") {
  if (n.target_kind === "report") return language === "en" ? "Case unavailable" : "Sak ikke tilgjengelig";
  if (n.target_kind === "match") return language === "en" ? "Match unavailable" : "Treff ikke tilgjengelig";
  if (n.target_kind === "chat") return language === "en" ? "Chat unavailable" : "Chat ikke tilgjengelig";
  return language === "en" ? "Unavailable" : "Ikke tilgjengelig";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(false);

  const getToken = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    return sess.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setItems([]);
        return;
      }

      const r = await fetch(`${API_BASE_URL}/notifications?limit=80`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? (language === "en" ? "Could not load notifications" : "Kunne ikke hente varsler"));

      setItems((data?.notifications ?? []) as Notif[]);
    } catch (e: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Unknown error" : "Ukjent feil"));
    } finally {
      setLoading(false);
    }
  }, [getToken, language]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }, [getToken]);

  const resolveNotif = useCallback(async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error(language === "en" ? "Missing login." : "Mangler innlogging.");

    const r = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}/resolve`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error ?? (language === "en" ? "Could not validate notification" : "Kunne ikke validere varsel"));

    return data as { ok: boolean; target_kind?: string; target_id?: string; reason?: string };
  }, [getToken, language]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      const r = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? (language === "en" ? "Could not delete notification" : "Kunne ikke slette varsel"));

      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not delete notification" : "Kunne ikke slette varsel"));
    } finally {
      setBusy(false);
    }
  }, [getToken, language]);

  const deleteMissingNotifications = useCallback(async () => {
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) return;

      const r = await fetch(`${API_BASE_URL}/notifications/missing`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? (language === "en" ? "Could not delete unavailable notifications" : "Kunne ikke slette utilgjengelige varsler"));

      await load();
      Alert.alert(
        language === "en" ? "Done" : "Ferdig",
        language === "en" ? `Deleted ${data?.deleted ?? 0} unavailable notification(s).` : `Slettet ${data?.deleted ?? 0} utilgjengelige varsel.`
      );
    } catch (e: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not delete unavailable notifications" : "Kunne ikke slette utilgjengelige varsler"));
    } finally {
      setBusy(false);
    }
  }, [getToken, language, load]);

  const openNotif = useCallback(
    async (n: Notif) => {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: x.read_at ?? new Date().toISOString() } : x)));
      markRead(n.id);

      try {
        const resolved = await resolveNotif(n.id);
        if (!resolved.ok || !resolved.target_id) {
          setItems((prev) =>
            prev.map((x) =>
              x.id === n.id
                ? { ...x, target_status: "missing", target_kind: resolved.target_kind || x.target_kind || x.entity_type }
                : x
            )
          );
          Alert.alert(
            language === "en" ? "Unavailable" : "Ikke tilgjengelig",
            language === "en"
              ? "This notification points to content that no longer exists. You can delete it from the list."
              : "Dette varselet peker til innhold som ikke finnes lenger. Du kan slette det fra listen."
          );
          return;
        }

        if (resolved.target_kind === "chat") {
          router.push(`/chat/${resolved.target_id}`);
          return;
        }
        if (resolved.target_kind === "match") {
          router.push(`/matches/${resolved.target_id}`);
          return;
        }
        if (resolved.target_kind === "report") {
          router.push({ pathname: "/match", params: { reportId: resolved.target_id } });
          return;
        }

        Alert.alert(language === "en" ? "Unavailable" : "Ikke tilgjengelig", language === "en" ? "This notification could not be opened." : "Dette varselet kunne ikke åpnes.");
      } catch (e: any) {
        Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not open the notification." : "Kunne ikke åpne varselet."));
      }
    },
    [router, markRead, resolveNotif, language]
  );

  const unreadCount = useMemo(() => items.filter((x) => !x.read_at).length, [items]);
  const missingCount = useMemo(() => items.filter((x) => x.target_status === "missing").length, [items]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.safe}>
        <PremiumHeader
          title={language === "en" ? "Notifications" : "Varsler"}
          subtitle={unreadCount ? (language === "en" ? `${unreadCount} unread` : `${unreadCount} uleste`) : (language === "en" ? "Overview" : "Oversikt")}
          onBack={() => router.back()}
          right={<AuthHeaderAction />}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>{language === "en" ? "Loading…" : "Laster…"}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>{language === "en" ? "No notifications yet." : "Ingen varsler ennå."}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(x) => x.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const unread = !item.read_at;
              const invalid = item.target_status === "missing";
              return (
                <View style={[styles.card, unread && styles.cardUnread, invalid && styles.cardInvalid]}>
                  <Pressable onPress={() => openNotif(item)} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
                    <View style={styles.rowTop}>
                      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.timeWrap}>
                        {unread && <Text style={styles.unreadDot}>●</Text>}
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                      </View>
                    </View>

                    {!!item.body && <Text style={styles.body} numberOfLines={2}>{item.body}</Text>}

                    {invalid && (
                      <View style={styles.invalidBadgeWrap}>
                        <Text style={styles.invalidBadgeTxt}>{invalidReasonLabel(item, language)}</Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={styles.itemActions}>
                    <Pressable
                      style={styles.itemDeleteBtn}
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          language === "en" ? "Delete notification?" : "Slette varsel?",
                          language === "en" ? "This only removes the notification from your list." : "Dette fjerner bare varselet fra listen din.",
                          [
                            { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
                            { text: language === "en" ? "Delete" : "Slett", style: "destructive", onPress: () => deleteNotification(item.id) },
                          ]
                        )
                      }
                    >
                      <Text style={styles.itemDeleteTxt}>{language === "en" ? "Delete" : "Slett"}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <Pressable style={styles.footerBtn} onPress={load} disabled={busy}>
            <Text style={styles.footerTxt}>{language === "en" ? "Refresh" : "Oppdater"}</Text>
          </Pressable>

          <Pressable style={[styles.footerBtn, missingCount > 0 ? styles.footerBtnDanger : styles.footerBtnDisabled]} onPress={deleteMissingNotifications} disabled={busy || missingCount === 0}>
            <Text style={[styles.footerTxt, missingCount > 0 ? styles.footerTxtDanger : styles.footerTxtDisabled]}>
              {language === "en" ? "Delete unavailable" : "Slett utilgjengelige"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.footerBtn, styles.footerBtnPrimary]}
            disabled={busy}
            onPress={async () => {
              try {
                const token = await getToken();
                if (!token) return;
                await fetch(`${API_BASE_URL}/notifications/read-all`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
              } catch {}
            }}
          >
            <Text style={[styles.footerTxt, styles.footerTxtPrimary]}>{language === "en" ? "Mark read" : "Marker lest"}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { marginTop: 8, color: theme.colors.muted, fontWeight: "700" },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.card,
  },
  cardUnread: { borderColor: theme.colors.primary, borderWidth: 1.5 },
  cardInvalid: { opacity: 0.82, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontWeight: "900", color: theme.colors.text },
  timeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  time: { color: theme.colors.muted, fontWeight: "800", fontSize: 12 },
  body: { marginTop: 6, color: theme.colors.text, fontWeight: "700" },
  unreadDot: { color: theme.colors.primary, fontWeight: "900" },
  invalidBadgeWrap: { marginTop: 8, alignSelf: "flex-start", backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  invalidBadgeTxt: { color: "#475569", fontWeight: "900", fontSize: 12 },
  itemActions: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  itemDeleteBtn: { borderWidth: 1, borderColor: "#DC2626", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  itemDeleteTxt: { color: "#DC2626", fontWeight: "900" },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
  },
  footerBtnPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  footerBtnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  footerBtnDisabled: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  footerTxt: { fontWeight: "900", color: theme.colors.text, fontSize: 12 },
  footerTxtPrimary: { color: "#fff" },
  footerTxtDanger: { color: "#DC2626" },
  footerTxtDisabled: { color: "#94A3B8" },
});
