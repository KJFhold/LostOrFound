// app/my-reports.tsx
// Mine saker (language package A)
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  View,
  Alert,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { API_BASE_URL } from "../src/lib/config";
import { theme } from "../src/ui/theme";
import { getLastSeenMap } from "../src/lib/unread";
import { useAuth } from "../src/contexts/AuthContext";
import { SUBCATEGORIES } from "../src/lib/categories";
import { shortPlace } from "../src/lib/places";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { AuthHeaderAction } from "../src/ui/AuthHeaderAction";
import { useI18n } from "../src/i18n/I18nProvider";

type Report = {
  id: string;
  type: "LOST" | "FOUND";
  title?: string;
  created_at: string;
  occurred_at?: string | null;
  category?: string;
  subcategory_key?: string;
  color?: string | null;
  brand?: string | null;
  lat?: number | null;
  lng?: number | null;
  location_label?: string | null;
  status?: "ACTIVE" | "CLOSED" | "EXPIRED" | "ARCHIVED" | string | null;
  visible_until?: string | null;
  closed_at?: string | null;
  archived_at?: string | null;
  last_extended_at?: string | null;
  extension_count?: number | null;
};

type LastActivity = {
  at: string;
  sender_id: string;
  body: string;
  match_id?: string;
};

type MessageInsert = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function colorLabel(v?: string | null, language: "no" | "en" = "no") {
  if (!v) return null;
  const noMap: Record<string, string> = {
    black: "Svart",
    white: "Hvit",
    gray: "Grå",
    grey: "Grå",
    red: "Rød",
    orange: "Oransje",
    yellow: "Gul",
    green: "Grønn",
    blue: "Blå",
    purple: "Lilla",
    brown: "Brun",
    pink: "Rosa",
    beige: "Beige",
    gold: "Gull",
    silver: "Sølv",
  };
  const enMap: Record<string, string> = {
    black: "Black",
    white: "White",
    gray: "Gray",
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    purple: "Purple",
    brown: "Brown",
    pink: "Pink",
    beige: "Beige",
    gold: "Gold",
    silver: "Silver",
    grey: "Gray",
  };
  const map = language === "en" ? enMap : noMap;
  return map[String(v).toLowerCase()] ?? v;
}

function titleCase(s?: string | null) {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const SUBCATEGORY_LABELS_EN: Record<string, string> = {
  KEYS: "Keys",
  WALLET: "Wallet",
  MOBILE_PHONE: "Mobile phone",
  SUNGLASSES: "Sunglasses",
  GLASSES: "Glasses",
  BANK_CARD: "Bank card",
  ID_CARD: "ID card",
  PASSPORT: "Passport",
  DRIVER_LICENSE: "Driver license",
  HEARING_AID: "Hearing aid",
  OTHER_PERSONAL: "Other personal item",
  HEADPHONES: "Headphones / AirPods",
  SMARTWATCH: "Smartwatch",
  TABLET: "Tablet",
  LAPTOP: "Laptop",
  POWERBANK: "Power bank",
  CAMERA: "Camera",
  OTHER_ELECTRONICS: "Other electronics",
  BACKPACK: "Backpack",
  HANDBAG: "Handbag",
  SUITCASE: "Suitcase",
  GYM_BAG: "Gym bag",
  LAPTOP_BAG: "Laptop bag",
  SHOULDER_BAG: "Shoulder bag",
  DOCUMENT_BRIEFCASE: "Document case",
  SCHOOL_BAG: "School bag",
  TRAVEL_LUGGAGE: "Travel luggage",
  TOTE_BAG: "Tote bag",
  OTHER_BAGS: "Other bag/luggage",
  JACKET: "Jacket",
  HAT: "Hat",
  GLOVES: "Gloves",
  SCARF: "Scarf",
  BELT: "Belt",
  SHOES: "Shoes",
  UMBRELLA: "Umbrella",
  OTHER_CLOTHING: "Other clothing/accessory",
  RING: "Ring",
  EARRINGS: "Earrings",
  NECKLACE: "Necklace",
  BRACELET: "Bracelet",
  WATCH: "Watch",
  OTHER_JEWELRY: "Other jewelry",
  TOOLS: "Tools",
  OTHER_TOOLS: "Other tools",
  CAR_KEYS: "Car keys",
  BICYCLE: "Bicycle",
  SCOOTER: "Scooter",
  OTHER_VEHICLE: "Other vehicle/transport",
  FOOTBALL: "Football",
  TENNIS_RACKET: "Tennis racket",
  FISHING_ROD: "Fishing rod",
  HEADLAMP: "Headlamp",
  CAMPING_GEAR: "Camping gear",
  SKIS: "Skis",
  SNOWBOARD: "Snowboard",
  HELMET: "Helmet",
  GOGGLES: "Goggles",
  WATER_BOTTLE: "Water bottle",
  OTHER_SPORT: "Other sport/outdoor item",
  BOOK: "Book",
  OTHER_HOBBY: "Other culture/hobby item",
  DOG: "Dog",
  CAT: "Cat",
  BIRD: "Bird",
  RABBIT: "Rabbit",
  OTHER_PET: "Other pet",
  CUSTOM: "Custom",
};

function subcategoryLabel(cat?: string, sub?: string, language: "no" | "en" = "no") {
  if (!cat || !sub) return null;
  if (language === "en") return SUBCATEGORY_LABELS_EN[sub] ?? sub;
  const list = (SUBCATEGORIES as any)[cat] ?? [];
  return list.find((x: any) => x.value === sub)?.label ?? sub;
}

function prettyReportTitle(r: Report, language: "no" | "en") {
  const typ = r.type === "LOST" ? (language === "en" ? "Lost" : "Mistet") : (language === "en" ? "Found" : "Funnet");
  const sub = subcategoryLabel(r.category, r.subcategory_key, language);
  const col = colorLabel(r.color, language);
  const brand = titleCase(r.brand);
  const parts = [col ? col.toLowerCase() : null, sub ? sub.toLowerCase() : null].filter(Boolean);
  const core = parts.length ? parts.join(" ") : (r.title ?? typ);
  const tail = brand ? ` (${brand})` : "";
  const placeShort = shortPlace(r.location_label);
  const place = placeShort ? ` ${language === "en" ? "in" : "i"} ${placeShort}` : "";
  return `${typ}: ${core}${tail}${place}`;
}

function reportStatusInfo(r: Report, language: "no" | "en") {
  if ((r as any).closed_at || (r as any).status === "CLOSED") return { label: language === "en" ? "Closed" : "Avsluttet" };
  if ((r as any).status === "EXPIRED" || ((r as any).visible_until && Date.parse((r as any).visible_until) <= Date.now())) return { label: language === "en" ? "Expired" : "Utløpt" };
  if ((r as any).visible_until) {
    const daysLeft = Math.ceil((Date.parse((r as any).visible_until) - Date.now()) / (24 * 60 * 60 * 1000));
    if (Number.isFinite(daysLeft) && daysLeft >= 0) return { label: language === "en" ? `Active · ${daysLeft} d left` : `Aktiv · ${daysLeft} d igjen` };
  }
  return { label: language === "en" ? "Active" : "Aktiv" };
}
function canExtendFound(r: Report) {
  if (r.type !== "FOUND" || r.closed_at || r.status === "CLOSED" || r.status === "ARCHIVED") return false;
  if (Number(r.extension_count || 0) >= 2) return false;
  const until = Date.parse(r.visible_until || "");
  if (!Number.isFinite(until)) return true;
  return until - Date.now() <= 7 * 24 * 60 * 60 * 1000;
}

function shortMessage(body?: string) {
  if (!body) return "";
  const t = body.replace(/\s+/g, " ").trim();
  if (t.length <= 70) return t;
  return t.slice(0, 67) + "…";
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sortReportsByActivity(reports: Report[], activityByReport: Record<string, LastActivity | null>) {
  const getKey = (r: Report) => activityByReport[r.id]?.at ?? r.created_at;
  return [...reports].sort((a, b) => {
    const ak = new Date(getKey(a)).getTime();
    const bk = new Date(getKey(b)).getTime();
    return bk - ak;
  });
}

export default function MyReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [unreadByReport, setUnreadByReport] = useState<Record<string, boolean>>({});
  const [activityByReport, setActivityByReport] = useState<Record<string, LastActivity | null>>({});
  const [matchCountByReport, setMatchCountByReport] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const matchToReportRef = useRef<Record<string, string>>({});
  const lastSeenMapRef = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token || !user) {
        setReports([]);
        setUnreadByReport({});
        setActivityByReport({});
        setMatchCountByReport({});
        matchToReportRef.current = {};
        lastSeenMapRef.current = {};
        return;
      }

      lastSeenMapRef.current = await getLastSeenMap();
      const res = await fetch(`${API_BASE_URL}/reports/mine/with-activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? (language === "en" ? "Could not load cases/activity" : "Kunne ikke hente saker/aktivitet"));
      }

      const reps: Report[] = data.reports ?? [];
      const matchToReport: Record<string, string> = data.matchToReport ?? {};
      const lastMessages: Array<{ conversation_id: string; sender_id: string; body: string; created_at: string }> = data.lastMessages ?? [];

      const reportToMatches: Record<string, string[]> = {};
      for (const [mid, rid] of Object.entries(matchToReport)) {
        if (!rid) continue;
        if (!reportToMatches[rid]) reportToMatches[rid] = [];
        reportToMatches[rid].push(mid);
      }
      const matchCounts: Record<string, number> = {};
      for (const r of reps) {
        matchCounts[r.id] = (reportToMatches[r.id] ?? []).length;
      }

      const lastByMatch: Record<string, LastActivity> = {};
      for (const row of lastMessages) {
        const mid = String(row.conversation_id);
        lastByMatch[mid] = {
          at: String(row.created_at),
          sender_id: String(row.sender_id),
          body: String(row.body ?? ""),
          match_id: mid,
        };
      }

      const unread: Record<string, boolean> = {};
      const activity: Record<string, LastActivity | null> = {};
      for (const r of reps) {
        const matchIds = reportToMatches[r.id] ?? [];
        let hasUnread = false;
        let latest: LastActivity | null = null;
        for (const mid of matchIds) {
          const lastSeen = lastSeenMapRef.current[mid];
          const lastAct = lastByMatch[mid];
          if (!lastAct) continue;
          if (!latest || new Date(lastAct.at) > new Date(latest.at)) {
            latest = lastAct;
          }
          const isNewerThanSeen = !lastSeen || new Date(lastAct.at) > new Date(lastSeen);
          const fromOther = lastAct.sender_id !== user.id;
          if (isNewerThanSeen && fromOther) hasUnread = true;
        }
        unread[r.id] = hasUnread;
        activity[r.id] = latest;
      }

      matchToReportRef.current = matchToReport;
      setUnreadByReport(unread);
      setActivityByReport(activity);
      setMatchCountByReport(matchCounts);
      setReports(sortReportsByActivity(reps, activity));
    } catch (e) {
      console.warn(language === "en" ? "Could not load cases/unread" : "Kunne ikke hente saker/uleste", e);
      setReports([]);
      setUnreadByReport({});
      setActivityByReport({});
      setMatchCountByReport({});
      matchToReportRef.current = {};
      lastSeenMapRef.current = {};
    } finally {
      setLoading(false);
    }
  }, [user, language]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime:my-cases-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const msg = payload?.new as MessageInsert | undefined;
          if (!msg?.conversation_id || !msg?.sender_id || !msg?.created_at) return;
          const reportId = matchToReportRef.current[msg.conversation_id];
          if (!reportId) return;

          const newActivity: LastActivity = {
            at: msg.created_at,
            sender_id: msg.sender_id,
            body: String(msg.body ?? ""),
            match_id: msg.conversation_id,
          };

          if (msg.sender_id !== user.id) {
            const lastSeen = lastSeenMapRef.current[msg.conversation_id];
            const isNewerThanSeen = !lastSeen || new Date(msg.created_at) > new Date(lastSeen);
            if (isNewerThanSeen) {
              setUnreadByReport((prev) => {
                if (prev[reportId] === true) return prev;
                return { ...prev, [reportId]: true };
              });
            }
          }

          setActivityByReport((prev) => {
            const next = { ...prev, [reportId]: newActivity };
            setReports((prevReports) => sortReportsByActivity(prevReports, next));
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const editReport = (r: Report) => {
    if (r.type !== "LOST") {
      Alert.alert(
        language === "en" ? "Not available yet" : "Ikke tilgjengelig ennå",
        language === "en" ? "Editing found reports will be added later." : "Redigering av funnet-rapporter kommer senere."
      );
      return;
    }
    router.push({ pathname: "/(report)/create-report", params: { editReportId: r.id } });
  };

  const deleteReport = async (id: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      Alert.alert(
        language === "en" ? "Error" : "Feil",
        language === "en" ? "You must be logged in to delete this case." : "Du må være innlogget for å slette saken."
      );
      return;
    }

    const res = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      Alert.alert(
        language === "en" ? "Error" : "Feil",
        data?.error ?? (language === "en" ? "Could not delete case." : "Kunne ikke slette saken.")
      );
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== id));
    setUnreadByReport((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setActivityByReport((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setMatchCountByReport((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    load();
  };


  const extendFoundReport = async (r: Report) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      Alert.alert(language === "en" ? "Error" : "Feil", language === "en" ? "You must be logged in." : "Du må være innlogget.");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(r.id)}/extend-found`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      Alert.alert(
        language === "en" ? "Could not extend" : "Kunne ikke forlenge",
        data?.message || data?.error || (language === "en" ? "Please try again later." : "Prøv igjen senere.")
      );
      return;
    }
    await load();
  };

  const confirmExtendFound = (r: Report) => {
    Alert.alert(
      language === "en" ? "Still have the item?" : "Har du fortsatt gjenstanden?",
      language === "en"
        ? "This keeps the found report active for up to 30 more days. A found report can be active for a maximum of 90 days."
        : "Dette holder funnet-rapporten aktiv i opptil 30 nye dager. En funnet-rapport kan være aktiv i maksimalt 90 dager.",
      [
        { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
        { text: language === "en" ? "Extend" : "Forleng", onPress: () => extendFoundReport(r) },
      ]
    );
  };

  const closeReport = async (r: Report) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      Alert.alert(
        language === "en" ? "Error" : "Feil",
        language === "en" ? "You must be logged in to close this case." : "Du må være innlogget for å avslutte saken."
      );
      return;
    }

    const res = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(r.id)}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      Alert.alert(
        language === "en" ? "Error" : "Feil",
        data?.message || data?.error || (language === "en" ? "Could not close case." : "Kunne ikke avslutte saken.")
      );
      return;
    }

    load();
  };

  const confirmClose = (r: Report) => {
    Alert.alert(
      language === "en" ? "Close case?" : "Avslutt sak?",
      language === "en"
        ? "The case remains in your overview, but it will not be used for new matches."
        : "Saken beholdes i oversikten, men brukes ikke lenger for nye treff.",
      [
        { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
        { text: language === "en" ? "Close case" : "Avslutt sak", onPress: () => closeReport(r) },
      ]
    );
  };

  const confirmDelete = (r: Report) => {
    Alert.alert(
      language === "en" ? "Delete case?" : "Slett sak?",
      language === "en"
        ? "This permanently deletes the case, including photos and matches."
        : "Dette sletter saken permanent, inkludert bilder og treff.",
      [
        { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
        { text: language === "en" ? "Delete" : "Slett", style: "destructive", onPress: () => deleteReport(r.id) },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.safe}>
        <PremiumHeader
          title={language === "en" ? "My cases" : "Mine saker"}
          subtitle={language === "en" ? "Overview and latest activity" : "Oversikt og siste aktivitet"}
          onBack={() => {

 router.replace("/(tabs)");

}}
          right={<AuthHeaderAction />}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>{language === "en" ? "Loading cases…" : "Laster saker…"}</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>
              {language === "en"
                ? "No cases yet. When you report a lost or found item, they will appear here."
                : "Ingen saker ennå. Når du melder inn noe som mistet eller funnet, vil sakene dukke opp her."}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {reports.map((r) => {
              const act = activityByReport[r.id] ?? null;
              const actFromMe = act?.sender_id === user?.id;
              const actLine = act
                ? `${language === "en" ? "Latest chat" : "Siste chat"}: ${actFromMe ? (language === "en" ? "You" : "Du") : (language === "en" ? "Other party" : "Motpart")} ${formatTime(act.at)}: ${shortMessage(act.body)}`
                : null;
              const statusInfo = reportStatusInfo(r, language);
              const isClosed = r.status === "CLOSED" || !!r.closed_at;
              const latestChatId = act?.match_id;
              return (
                <View key={r.id} style={styles.card}>
                  <Pressable onPress={() => router.push({ pathname: "/match", params: { reportId: r.id } })}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.typePill}>
                        {r.type === "LOST" ? (language === "en" ? "Lost" : "Mistet") : (language === "en" ? "Found" : "Funnet")}
                      </Text>
                      <Text style={styles.matchPill}>
                        {(matchCountByReport[r.id] ?? 0)} {language === "en" ? "match(es)" : "treff"}
                      </Text>
                    </View>
                    {statusInfo?.label && <Text style={styles.statusPill}>{statusInfo.label}</Text>}
                    {r.type === "FOUND" && (
                      <Text style={styles.extensionInfo}>
                        {language === "en"
                          ? `${Number(r.extension_count || 0)} of 2 extensions used`
                          : `${Number(r.extension_count || 0)} av 2 forlengelser brukt`}
                      </Text>
                    )}
                    <Text style={styles.title}>{prettyReportTitle(r, language)}</Text>
                    <Text style={styles.meta}>{new Date(r.created_at).toLocaleDateString()}</Text>
                    {actLine && (
                      <Text style={styles.lastLine} numberOfLines={1}>
                        {actLine}
                      </Text>
                    )}
                    {unreadByReport[r.id] && <Text style={styles.unread}>● {language === "en" ? "New message" : "Ny melding"}</Text>}
                    <Text style={styles.link}>{language === "en" ? "Open matches for this case →" : "Åpne treff for denne saken →"}</Text>
                  </Pressable>
                  {latestChatId && (
                    <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${latestChatId}`)}>
                      <Text style={styles.chatTxt}>{language === "en" ? "Open chat" : "Åpne chat"}</Text>
                    </Pressable>
                  )}
                  <View style={styles.actionsRow}>
                    {r.type === "LOST" && !isClosed && (
                      <Pressable style={styles.editBtn} onPress={() => editReport(r)}>
                        <Text style={styles.editTxt}>{language === "en" ? "Edit" : "Rediger"}</Text>
                      </Pressable>
                    )}
                    {canExtendFound(r) && (
                      <Pressable style={styles.extendBtn} onPress={() => confirmExtendFound(r)}>
                        <Text style={styles.extendTxt}>{language === "en" ? "Still have item" : "Har fortsatt gjenstanden"}</Text>
                      </Pressable>
                    )}
                    {!isClosed && (
                      <Pressable style={styles.closeBtn} onPress={() => confirmClose(r)}>
                        <Text style={styles.closeTxt}>{language === "en" ? "Close" : "Avslutt"}</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(r)}>
                      <Text style={styles.deleteTxt}>{language === "en" ? "Delete" : "Slett"}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            <Pressable style={styles.reloadBtn} onPress={load}>
              <Text style={styles.reloadTxt}>{language === "en" ? "Refresh" : "Oppdater"}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: theme.colors.muted, fontWeight: "600", textAlign: "center" },
  list: { padding: theme.space.lg, paddingBottom: 24 },
  card: {
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.space.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  typePill: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.chipBg,
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  matchPill: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 12,
  },
  title: { fontWeight: "900", fontSize: 16, color: theme.colors.text },
  statusPill: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 8,
  },
  extensionInfo: { marginBottom: 7, color: theme.colors.muted, fontWeight: "700", fontSize: 12 },
  meta: { marginTop: 4, color: theme.colors.muted, fontWeight: "600" },
  lastLine: { marginTop: 6, color: "#111", fontWeight: "700" },
  link: { marginTop: 8, color: theme.colors.primary, fontWeight: "800" },
  chatBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  chatTxt: { color: "#fff", fontWeight: "900" },
  unread: { marginTop: 6, color: theme.colors.primary, fontWeight: "900" },
  actionsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "#EEF2FF",
  },
  editTxt: { color: theme.colors.primary, fontWeight: "900" },
  extendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  extendTxt: { color: "#15803D", fontWeight: "900", fontSize: 12 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#64748B",
    backgroundColor: "#F8FAFC",
  },
  closeTxt: { color: "#334155", fontWeight: "900" },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#b00",
    backgroundColor: "#fff",
  },
  deleteTxt: { color: "#b00", fontWeight: "900" },
  reloadBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    backgroundColor: theme.colors.card,
  },
  reloadTxt: { fontWeight: "800", color: theme.colors.text },
});
