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
  Modal,
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


function lifecycleErrorCopy(code: string | undefined, t: (key: any) => string) {
  switch (String(code || "").toUpperCase()) {
    case "FOUND_EXTENSION_TOO_EARLY":
      return { title: t("reports.extendTooEarlyTitle"), body: t("reports.extendTooEarlyBody") };
    case "FOUND_EXTENSION_LIMIT":
      return { title: t("reports.extendLimitTitle"), body: t("reports.extendLimitBody") };
    case "FOUND_MAX_AGE_REACHED":
      return { title: t("reports.maxAgeTitle"), body: t("reports.maxAgeBody") };
    case "REPORT_CLOSED":
      return { title: t("reports.closedTitle"), body: t("reports.closedBody") };
    default:
      return null;
  }
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
  const { language, t } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [unreadByReport, setUnreadByReport] = useState<Record<string, boolean>>({});
  const [activityByReport, setActivityByReport] = useState<Record<string, LastActivity | null>>({});
  const [matchCountByReport, setMatchCountByReport] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ kind: "extend" | "close" | "delete"; report: Report } | null>(null);
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
      const friendly = lifecycleErrorCopy(data?.error, t);
      Alert.alert(
        friendly?.title || (language === "en" ? "Could not extend" : "Kunne ikke forlenge"),
        friendly?.body || data?.message || (language === "en" ? "Please try again later." : "Prøv igjen senere.")
      );
      return;
    }
    await load();
  };

  const confirmExtendFound = (r: Report) => setConfirmDialog({ kind: "extend", report: r });

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

  const confirmClose = (r: Report) => setConfirmDialog({ kind: "close", report: r });

  const confirmDelete = (r: Report) => setConfirmDialog({ kind: "delete", report: r });

  const dialogTitle = confirmDialog?.kind === "extend" ? (language === "en" ? "Reactivate found report?" : "Aktiver funnet-rapporten igjen?") : confirmDialog?.kind === "close" ? (language === "en" ? "Close case?" : "Avslutt sak?") : (language === "en" ? "Delete case?" : "Slett sak?");
  const dialogBody = confirmDialog?.kind === "extend" ? (language === "en" ? "Keep the report active for up to 30 more days. Found reports can remain active for a maximum of 90 days." : "Hold rapporten aktiv i opptil 30 nye dager. Funnet-rapporter kan være aktive i maksimalt 90 dager.") : confirmDialog?.kind === "close" ? (language === "en" ? "The case stays in My cases, but it will no longer be used for new matches." : "Saken beholdes i Mine saker, men brukes ikke lenger for nye treff.") : (language === "en" ? "This permanently deletes the case, including photos and matches. This cannot be undone." : "Dette sletter saken permanent, inkludert bilder og treff. Handlingen kan ikke angres.");
  const runDialogAction = async () => { const current = confirmDialog; if (!current) return; setConfirmDialog(null); if (current.kind === "extend") await extendFoundReport(current.report); else if (current.kind === "close") await closeReport(current.report); else await deleteReport(current.report.id); };

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
              const act = activityByReport[r.id] ?? null; const actFromMe = act?.sender_id === user?.id; const statusInfo = reportStatusInfo(r, language); const isClosed = r.status === "CLOSED" || !!r.closed_at; const isExpired = r.status === "EXPIRED" || (!!r.visible_until && Date.parse(r.visible_until) <= Date.now()); const latestChatId = act?.match_id; const count = matchCountByReport[r.id] ?? 0;
              return <View key={r.id} style={styles.card}>
                <View style={styles.cardTopRow}><Text style={[styles.kindBadge, r.type === "FOUND" && styles.kindBadgeFound]}>{r.type === "LOST" ? (language === "en" ? "LOST" : "MISTET") : (language === "en" ? "FOUND" : "FUNNET")}</Text><Text style={[styles.statusBadge, isExpired && styles.statusExpired, isClosed && styles.statusClosed]}>{statusInfo.label}</Text></View>
                <Text style={styles.title}>{prettyReportTitle(r, language).replace(/^Lost:\s*|^Found:\s*|^Mistet:\s*|^Funnet:\s*/i, "")}</Text>
                <Text style={styles.meta}>{language === "en" ? "Reported" : "Registrert"} {new Date(r.created_at).toLocaleDateString()}</Text>
                {r.type === "FOUND" && <Text style={styles.extensionInfo}>{language === "en" ? `Extended ${Number(r.extension_count || 0)} of 2 times` : `Forlenget ${Number(r.extension_count || 0)} av 2 ganger`}</Text>}
                {act && <Text style={styles.lastLine} numberOfLines={2}>{language === "en" ? "Latest chat" : "Siste chat"}: {actFromMe ? (language === "en" ? "You" : "Du") : (language === "en" ? "Other party" : "Motpart")} · {formatTime(act.at)} · {shortMessage(act.body)}</Text>}
                {unreadByReport[r.id] && <Text style={styles.unread}>● {language === "en" ? "New message" : "Ny melding"}</Text>}
                <View style={styles.primaryActions}>
                  {latestChatId && <Pressable style={styles.primaryBtn} onPress={() => router.push(`/chat/${latestChatId}`)}><Text style={styles.primaryBtnText}>{language === "en" ? "Open chat" : "Åpne chat"}</Text></Pressable>}
                  {count > 0 ? <Pressable style={[styles.primaryBtn, latestChatId && styles.secondaryPrimary]} onPress={() => router.push({ pathname: "/match", params: { reportId: r.id } })}><Text style={[styles.primaryBtnText, latestChatId && styles.secondaryPrimaryText]}>{language === "en" ? `View matches (${count})` : `Se treff (${count})`}</Text></Pressable> : <View style={styles.noMatches}><Text style={styles.noMatchesText}>{language === "en" ? "No matches yet" : "Ingen treff ennå"}</Text></View>}
                </View>
                <View style={styles.secondaryActions}>
                  {r.type === "LOST" && !isClosed && <Pressable onPress={() => editReport(r)}><Text style={styles.secondaryLink}>{isExpired ? (language === "en" ? "Edit details" : "Rediger detaljer") : (language === "en" ? "Edit" : "Rediger")}</Text></Pressable>}
                  {canExtendFound(r) && <Pressable onPress={() => confirmExtendFound(r)}><Text style={styles.extendLink}>{isExpired ? (language === "en" ? "Reactivate" : "Aktiver igjen") : (language === "en" ? "Extend" : "Forleng")}</Text></Pressable>}
                  {!isClosed && !(r.type === "LOST" && isExpired) && <Pressable onPress={() => confirmClose(r)}><Text style={styles.secondaryLink}>{language === "en" ? "Close" : "Avslutt"}</Text></Pressable>}
                  <Pressable onPress={() => confirmDelete(r)}><Text style={styles.deleteLink}>{language === "en" ? "Delete" : "Slett"}</Text></Pressable>
                </View>
              </View>;
            })}
            <Pressable style={styles.reloadBtn} onPress={load}><Text style={styles.reloadTxt}>{language === "en" ? "Refresh" : "Oppdater"}</Text></Pressable>
          </ScrollView>
        )}
      </View><Modal transparent visible={!!confirmDialog} animationType="fade" onRequestClose={() => setConfirmDialog(null)}><View style={dialogStyles.backdrop}><View style={dialogStyles.card}><View style={dialogStyles.iconCircle}><Text style={dialogStyles.iconText}>{confirmDialog?.kind === "delete" ? "!" : confirmDialog?.kind === "close" ? "✓" : "+"}</Text></View><Text style={dialogStyles.title}>{dialogTitle}</Text><Text style={dialogStyles.body}>{dialogBody}</Text><View style={dialogStyles.actions}><Pressable style={dialogStyles.cancelBtn} onPress={() => setConfirmDialog(null)}><Text style={dialogStyles.cancelText}>{language === "en" ? "Cancel" : "Avbryt"}</Text></Pressable><Pressable style={[dialogStyles.confirmBtn, confirmDialog?.kind === "delete" && dialogStyles.deleteConfirmBtn]} onPress={() => void runDialogAction()}><Text style={dialogStyles.confirmText}>{confirmDialog?.kind === "extend" ? (language === "en" ? "Reactivate" : "Aktiver") : confirmDialog?.kind === "close" ? (language === "en" ? "Close case" : "Avslutt sak") : (language === "en" ? "Delete" : "Slett")}</Text></Pressable></View></View></View></Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24},muted:{color:theme.colors.muted,fontWeight:"600",textAlign:"center"},list:{paddingHorizontal:14,paddingTop:8,paddingBottom:30},card:{padding:16,borderRadius:20,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.card,marginBottom:14},cardTopRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},kindBadge:{overflow:"hidden",borderRadius:999,backgroundColor:"#FFF1F2",color:"#BE123C",paddingHorizontal:10,paddingVertical:5,fontSize:11,fontWeight:"900"},kindBadgeFound:{backgroundColor:"#ECFDF3",color:"#15803D"},statusBadge:{overflow:"hidden",borderRadius:999,backgroundColor:"#EEF2FF",color:theme.colors.primary,paddingHorizontal:10,paddingVertical:5,fontSize:11,fontWeight:"900"},statusExpired:{backgroundColor:"#FFF7ED",color:"#B45309"},statusClosed:{backgroundColor:"#F1F5F9",color:"#475569"},title:{color:theme.colors.text,fontSize:18,lineHeight:23,fontWeight:"900"},meta:{marginTop:5,color:theme.colors.muted,fontSize:13,fontWeight:"600"},extensionInfo:{marginTop:7,color:theme.colors.muted,fontSize:12,fontWeight:"700"},lastLine:{marginTop:9,color:theme.colors.text,fontSize:13,lineHeight:18,fontWeight:"700"},unread:{marginTop:6,color:theme.colors.primary,fontWeight:"900",fontSize:12},primaryActions:{flexDirection:"row",gap:8,marginTop:13},primaryBtn:{flex:1,minHeight:42,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.primary,paddingHorizontal:10},primaryBtnText:{color:"#FFF",fontWeight:"900",fontSize:13},secondaryPrimary:{backgroundColor:"#EEF2FF",borderWidth:1,borderColor:"#C7D2FE"},secondaryPrimaryText:{color:theme.colors.primary},noMatches:{alignSelf:"flex-start",minHeight:38,borderRadius:12,alignItems:"center",justifyContent:"center",paddingHorizontal:14,backgroundColor:"#F1F5F9",borderWidth:1,borderColor:"#E2E8F0"},noMatchesText:{color:theme.colors.muted,fontWeight:"800",fontSize:12},secondaryActions:{flexDirection:"row",flexWrap:"wrap",gap:18,marginTop:13,paddingTop:11,borderTopWidth:1,borderTopColor:"#EEF2F6"},secondaryLink:{color:"#475569",fontWeight:"800",fontSize:13},extendLink:{color:"#15803D",fontWeight:"900",fontSize:13},deleteLink:{color:"#B42318",fontWeight:"900",fontSize:13},reloadBtn:{marginTop:4,minHeight:44,borderRadius:14,borderWidth:1,borderColor:theme.colors.border,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.card},reloadTxt:{fontWeight:"800",color:theme.colors.text}
});
const dialogStyles=StyleSheet.create({backdrop:{flex:1,backgroundColor:"rgba(15,23,42,0.5)",alignItems:"center",justifyContent:"center",padding:24},card:{width:"100%",maxWidth:410,borderRadius:22,backgroundColor:"#FFF",padding:22,borderWidth:1,borderColor:"#E2E8F0",shadowColor:"#000",shadowOpacity:.18,shadowRadius:24,shadowOffset:{width:0,height:12},elevation:12},iconCircle:{width:52,height:52,borderRadius:26,alignSelf:"center",alignItems:"center",justifyContent:"center",backgroundColor:"#EEF2FF"},iconText:{color:theme.colors.primary,fontSize:25,fontWeight:"900"},title:{marginTop:14,textAlign:"center",color:theme.colors.text,fontSize:19,fontWeight:"900"},body:{marginTop:9,textAlign:"center",color:theme.colors.muted,fontSize:14,lineHeight:21,fontWeight:"600"},actions:{flexDirection:"row",gap:10,marginTop:20},cancelBtn:{flex:1,minHeight:46,borderRadius:13,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:theme.colors.border},cancelText:{color:theme.colors.text,fontWeight:"900"},confirmBtn:{flex:1,minHeight:46,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.primary},deleteConfirmBtn:{backgroundColor:"#B42318"},confirmText:{color:"#FFF",fontWeight:"900"}});
