// app/matches/[matchId].tsx
// Match-detaljer v2: viser "Sist melding" + hvem (Du/Motpart) + unread-indikator på chat.
// Viser alltid "Sist" (valg A), men "Åpne chat" kun når status er CONFIRMED (2A).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import ImageViewing from "react-native-image-viewing";

import { API_BASE_URL } from "../../src/lib/config";
import { supabase } from "../../src/lib/supabase";
import { getLastSeenMap } from "../../src/lib/unread";
import { useAuth } from "../../src/contexts/AuthContext";
import { CATEGORIES, SUBCATEGORIES } from "../../src/lib/categories";
import { shortPlace } from "../../src/lib/places";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { AuthHeaderAction } from "../../src/ui/AuthHeaderAction";
import { useI18n } from "../../src/i18n/I18nProvider";

type Reason = { k: string; v: any };

type ReportFull = {
  id: string;
  user_id: string;
  type: "LOST" | "FOUND";
  category?: string;
  subcategory_key?: string;
  title?: string;
  description?: string | null;
  color?: string | null;
  brand?: string | null;
  occurred_at?: string | null;
  created_at?: string;
  lat?: number | null;
  lng?: number | null;
  reward_ore?: number | null;
  location_label?: string | null;
  radius_m?: number | null;
  search_radius_m?: number | null;
  area_radius_m?: number | null;
  location_radius_m?: number | null;
  report_images?: { id: any; path: string; sort_order: number }[];
};

type MatchFull = {
  id: string;
  score: number;
  status: "NEW" | "SEEN" | "DISMISSED" | "CONFIRMED";
  reasons: Reason[];
  lost: ReportFull;
  found: ReportFull;
};

type LastMsg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function reasonVal(reasons: Reason[] | undefined, key: string) {
  const hit = (reasons || []).find((r) => r?.k === key);
  return hit?.v;
}

function scoreLabel(score: number) {
  // 0–100 (intern) → 4 nivåer (UI). Vi viser kun topp 3 nivåer i lister.
  if (score >= 85) return "Svært sannsynlig kandidat";
  if (score >= 70) return "Sannsynlig kandidat";
  if (score >= 55) return "Mulig kandidat";
  return "Lav sannsynlighet";
}

function statusLabel(s: MatchFull["status"]) {
  switch (s) {
    case "NEW":
      return "Ny";
    case "SEEN":
      return "Sett";
    case "DISMISSED":
      return "{language === "en" ? "Dismiss" : "Avvis"}t";
    case "CONFIRMED":
      return "Bekreftet";
    default:
      return s;
  }
}

function formatDistance(meters: any) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} km`;
  return `${Math.round(n)} m`;
}

function formatDays(days: any) {
  const n = Number(days);
  if (!Number.isFinite(n)) return null;
  if (n < 1) return "i dag";
  return `${n.toFixed(1)} d`;
}

function formatTextSim(sim: any) {
  const n = Number(sim);
  if (!Number.isFinite(n)) return null;
  return `${Math.round(n * 100)}%`;
}

function timeAgoLong(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms)) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "nå";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} t siden`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} dager siden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} uker siden`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mnd siden`;
  const years = Math.floor(days / 365);
  return `${years} år siden`;
}

function shortMessage(body?: string) {
  if (!body) return "";
  const t = body.replace(/\s+/g, " ").trim();
  if (t.length <= 80) return t;
  return t.slice(0, 77) + "…";
}

function colorLabel(v?: string | null) {
  if (!v) return null;
  const map: Record<string, string> = {
    black: "Svart",
    white: "Hvit",
    gray: "Grå",
    red: "Rød",
    orange: "Oransje",
    yellow: "Gul",
    green: "Grønn",
    blue: "Blå",
    purple: "Lilla",
    brown: "Brun",
    pink: "Rosa",
    beige: "Beige",
  };
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

function categoryLabel(cat?: string) {
  if (!cat) return null;
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function subcategoryLabel(cat?: string, sub?: string) {
  if (!cat || !sub) return null;
  const list = (SUBCATEGORIES as any)[cat] || [];
  return list.find((s: any) => s.value === sub)?.label ?? sub;
}

function prettyHeading(rep: ReportFull) {
  const typ = rep.type === "LOST" ? "Mistet" : "Funnet";
  const sub = subcategoryLabel(rep.category, rep.subcategory_key);
  const col = colorLabel(rep.color);
  const brand = titleCase(rep.brand);
  const parts = [col ? col.toLowerCase() : null, sub ? sub.toLowerCase() : null].filter(Boolean);
  const core = parts.length ? parts.join(" ") : (rep.title || typ);
  const tail = brand ? ` (${brand})` : "";
  return `${typ}: ${core}${tail}`;
}

function reportRadiusMeters(rep?: ReportFull | null) {
  const candidates = [
    rep?.radius_m,
    rep?.search_radius_m,
    rep?.area_radius_m,
    rep?.location_radius_m,
    (rep as any)?.search_radius,
    (rep as any)?.radius,
    (rep as any)?.area_radius,
    (rep as any)?.location_radius,
  ];
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function areaSummaryForMatch(match: MatchFull) {
  const distRaw = reasonVal(match.reasons, "distance_m");
  const dist = Number(distRaw);
  const explicitInside = reasonVal(match.reasons, "within_radius")
    ?? reasonVal(match.reasons, "inside_radius")
    ?? reasonVal(match.reasons, "inside_area")
    ?? reasonVal(match.reasons, "within_area");
  const outsideRaw = reasonVal(match.reasons, "outside_radius_m")
    ?? reasonVal(match.reasons, "distance_outside_m")
    ?? reasonVal(match.reasons, "outside_area_m");
  const outsideMeters = Number(outsideRaw);
  const radius = reportRadiusMeters(match.lost);
  if (explicitInside === true || explicitInside === "true" || explicitInside === 1 || explicitInside === "1") {
    return "Innenfor markert område";
  }
  if (Number.isFinite(outsideMeters)) {
    if (outsideMeters <= 0) {
      return "Innenfor markert område";
    }
    return `${formatDistance(outsideMeters)} utenfor valgt område`;
  }
  if (Number.isFinite(dist) && radius != null) {
    if (dist <= radius) return "Innenfor markert område";
    return `${formatDistance(dist - radius)} utenfor valgt område`;
  }
  if (Number.isFinite(dist)) return `Avstand mellom rapporterte punkter: ${formatDistance(distRaw)}`;
  return "Områdeinformasjon mangler";
}

async function getSignedUrl(path: string, token: string) {
  const u = `${API_BASE_URL}/storage/signed-download?path=${encodeURIComponent(path)}`;
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "Kunne ikke hente bilde-URL");
  return data.url as string;
}


async function getSignedUrlsBatch(paths: string[], token: string) {
  const u = `${API_BASE_URL}/storage/signed-download-batch`;
  const r = await fetch(u, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ paths }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error ?? "Kunne ikke hente signed URLs");
  return (data?.urls ?? {}) as Record<string, string>;
}

export default function MatchDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useI18n();

  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = useMemo(() => {
    const mid = params?.matchId;
    return Array.isArray(mid) ? mid[0] : mid;
  }, [params?.matchId]);

  const [match, setMatch] = useState<MatchFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [thumbs, setThumbs] = useState<Record<string, string[]>>({}); // reportId -> urls

  // Last message + unread
  const [lastMsg, setLastMsg] = useState<LastMsg | null>(null);
  const [unread, setUnread] = useState(false);
  const lastSeenRef = useRef<Record<string, string>>({});

  // Fullscreen viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadLastSeen = useCallback(async () => {
    lastSeenRef.current = await getLastSeenMap();
  }, []);

  const computeUnread = useCallback(
    (msg: LastMsg | null) => {
      if (!user?.id || !matchId || !msg) return false;
      const lastSeen = lastSeenRef.current[matchId];
      const isNewerThanSeen = !lastSeen || new Date(msg.created_at) > new Date(lastSeen);
      const fromOther = msg.sender_id !== user.id;
      return isNewerThanSeen && fromOther;
    },
    [user?.id, matchId]
  );

  const fetchLastMessage = useCallback(async () => {
    if (!matchId) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1);

    const m = (msgs && msgs[0]) ? (msgs[0] as any as LastMsg) : null;
    setLastMsg(m);
    setUnread(computeUnread(m));
  }, [matchId, computeUnread]);

  const fetchMatch = useCallback(async () => {
    try {
      if (!matchId) return;
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Mangler innlogging (token). ");

      await loadLastSeen();

      const r = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Kunne ikke hente match");

      const m: MatchFull = data.match;
      setMatch(m);
      
     console.log("lost.location_label", m?.lost?.location_label);
     console.log("found.location_label", m?.found?.location_label);


      // Prefetch thumbs (maks 10 per report) - batch signering for raskere UI
    const perReport = async (rep: ReportFull) => {
      const paths = (rep.report_images ?? []).slice(0, 10).map((x) => x.path).filter(Boolean);
      if (!paths.length) return;

      // Batch-signér alle paths i ett kall
      let urlMap: Record<string, string> = {};
      try {
        urlMap = await getSignedUrlsBatch(paths, token);
      } catch (e: any) {
        console.warn('[match-detail] signed-download-batch failed', e?.message ?? e);
        // fallback: prøv single sign (best effort)
        try {
          const urls = await Promise.all(
            paths.map(async (p) => {
              try {
                return await getSignedUrl(p, token);
              } catch {
                return null;
              }
            })
          );
          const cleaned = urls.filter(Boolean) as string[];
          if (cleaned.length) {
            setThumbs((prev) => ({ ...prev, [rep.id]: cleaned }));
            try {
              cleaned.forEach((u) => Image.prefetch(u));
            } catch {}
          }
          return;
        } catch {
          return;
        }
      }

      // Behold rekkefølge, dropp de som ikke ble signert
      const urls = paths.map((p) => urlMap[p]).filter(Boolean) as string[];
      if (!urls.length) return;

      setThumbs((prev) => ({ ...prev, [rep.id]: urls }));

      // Prefetch (best effort)
      try {
        urls.forEach((u) => Image.prefetch(u));
      } catch {}
    };

    await Promise.allSettled([perReport(m.lost), perReport(m.found)]);

      await fetchLastMessage();
    } catch (e: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Unknown error" : "Ukjent feil"));
    } finally {
      setLoading(false);
    }
  }, [matchId, loadLastSeen, fetchLastMessage]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Når skjermen får fokus (tilbake fra chat), oppdater lastSeen og unread
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadLastSeen();
        await fetchLastMessage();
      })();
      return () => {};
    }, [loadLastSeen, fetchLastMessage])
  );

  // Realtime: oppdater siste melding + unread mens detaljsiden er åpen
  useEffect(() => {
    if (!matchId || !user?.id) return;

    const channel = supabase
      .channel(`realtime:match-detail:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${matchId}` },
        (payload: any) => {
          const msg = payload?.new as LastMsg | undefined;
          if (!msg) return;
          setLastMsg(msg);
          setUnread(computeUnread(msg));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id, computeUnread]);

  const setStatus = async (status: "CONFIRMED" | "DISMISSED" | "SEEN") => {
    try {
      if (!matchId) return;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Mangler innlogging (token). ");

      const r = await fetch(`${API_BASE_URL}/matches/${matchId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Kunne ikke oppdatere status");

      // Refresh match
      await fetchMatch();
    } catch (e: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Unknown error" : "Ukjent feil"));
    }
  };

  const openChat = () => {
    if (!match) return;
    router.push(`/chat/${match.id}`);
  };

  const openInMaps = async (rep: ReportFull) => {
    const lat = Number(rep?.lat);
    const lng = Number(rep?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert(language === "en" ? "Map" : "Kart", language === "en" ? "Map position is missing for this case." : "Kartposisjon mangler for denne rapporten.");
      return;
    }

    const label = encodeURIComponent(rep.location_label || "Funnsted");
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(language === "en" ? "Map" : "Kart", language === "en" ? "Could not open maps on this device." : "Kunne ikke åpne kart på denne enheten.");
      return;
    }
    await Linking.openURL(url);
  };

  const openViewerForReport = (reportId: string, index: number) => {
    const urls = thumbs[reportId] || [];
    if (!urls.length) return;
    setViewerImages(urls.map((u) => ({ uri: u })));
    setViewerIndex(Math.max(0, Math.min(index, urls.length - 1)));
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.center}>
        <Text>{language === "en" ? "Missing match" : "Mangler match"}</Text>
      </View>
    );
  }

  
  const level = (match.score >= 85 ? 4 : match.score >= 70 ? 3 : match.score >= 55 ? 2 : 1);
  const hiddenLow = level < 2;
const areaSummary = areaSummaryForMatch(match);
  const counterpartSeen = timeAgoLong(match.found?.occurred_at || match.found?.created_at || match.lost?.occurred_at || match.lost?.created_at);
  const latestReportAt = [match.lost?.created_at, match.found?.created_at]
    .map((iso) => ({ iso, t: Date.parse(String(iso ?? "")) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t)[0]?.iso ?? null;
  const reportUpdatedAgo = timeAgoLong(latestReportAt);

  const lastFromMe = lastMsg?.sender_id === user?.id;
  const lastLine = lastMsg
    ? (lastFromMe
        ? `Siste melding fra deg: ${shortMessage(lastMsg.body)}`
        : `Siste melding fra motpart: ${shortMessage(lastMsg.body)}`)
    : "Ingen meldinger ennå";

  // Din rapport/motpart basert på user_id
  const youOwnLost = match.lost?.user_id === user?.id;
  const youOwnFound = match.found?.user_id === user?.id;

  const labelLostOwner = youOwnLost ? "Din rapport" : "Motpart";
  const labelFoundOwner = youOwnFound ? "Din rapport" : "Motpart";

  const ReportBlock = ({ rep, ownerLabel }: { rep: ReportFull; ownerLabel: string }) => {
    const urls = thumbs[rep.id] || [];
    const cat = categoryLabel(rep.category);
    const sub = subcategoryLabel(rep.category, rep.subcategory_key);
    const col = colorLabel(rep.color);
    const brand = titleCase(rep.brand);
    const place = shortPlace(rep.location_label);
    const canOpenMap =
      match.status === "CONFIRMED" &&
      rep.type === "FOUND" &&
      rep.user_id !== user?.id &&
      Number.isFinite(Number(rep.lat)) &&
      Number.isFinite(Number(rep.lng));

    return (
      <View style={styles.repCard}>
        <Text style={styles.repOwner}>{ownerLabel}</Text>
        <Text style={styles.repTitle}>{prettyHeading(rep)}</Text>

        {!!rep.description && rep.type === "LOST" && (
          <View style={styles.finderMessageBox}>
            <Text style={styles.finderMessageLabel}>Melding til finner</Text>
            <Text style={styles.finderMessageText}>{rep.description}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          {!!cat && <Text style={styles.badge}>{cat}</Text>}
          {!!sub && <Text style={styles.badge}>{sub}</Text>}
          {!!col && <Text style={styles.badge}>Farge: {col}</Text>}
          {!!brand && <Text style={styles.badge}>Merke: {brand}</Text>}
          {!!place && <Text style={styles.badge}>Sted: {place}</Text>}
        </View>

        {canOpenMap && (
          <View style={styles.locationHelpBox}>
            <Text style={styles.locationHelpText}>
              {language === "en" ? "You can open the exact find location in maps." : "Du kan åpne nøyaktig funnsted i kart."}
            </Text>
            <Pressable style={styles.mapLinkBtn} onPress={() => openInMaps(rep)}>
              <Text style={styles.mapLinkTxt}>{language === "en" ? "Open in maps" : "Åpne i kart"}</Text>
            </Pressable>
          </View>
        )}

        {!!rep.description && rep.type !== "LOST" && <Text style={styles.repDesc}>{rep.description}</Text>}

        {urls.length ? (
          <View style={styles.thumbRow}>
            {urls.map((u, idx) => (
              <Pressable key={u} onPress={() => openViewerForReport(rep.id, idx)}>
                <Image source={{ uri: u }} style={styles.thumb} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Ingen bilder</Text>
        )}

        {typeof rep.reward_ore === "number" && rep.reward_ore > 0 && (
          <Text style={styles.reward}>Finnerlønn: {(rep.reward_ore / 100).toFixed(2)} kr</Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Match" }} />

      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
      <PremiumHeader
        title="Match"
        subtitle={t("matchDetail.subtitle")}
        onBack={() => router.back()}
        right={<AuthHeaderAction />}
      />

        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.hTitle}>
              {scoreLabel(match.score)} • {statusLabel(match.status)}
            </Text>
            {unread && <Text style={styles.unreadDot}>●</Text>}
          </View>

          <Text style={styles.headerBlurb}>Rapportene samsvarer godt og ser ut til å beskrive samme objekt.</Text>

          <View style={styles.metaRow}>
            {!!areaSummary && <Text style={styles.badge}>Område: {areaSummary}</Text>}
            {!!counterpartSeen && <Text style={styles.badge}>Sist sett: {counterpartSeen}</Text>}
            {!!reportUpdatedAgo && <Text style={styles.badge}>Rapport oppdatert: {reportUpdatedAgo}</Text>}
          </View>

          <Text style={styles.lastLine}>{lastLine}</Text>
      {hiddenLow && (
        <Text style={styles.muted}>Denne matchen har lav sannsynlighet og vises normalt ikke i listen.</Text>
      )}
        </View>

        
      {/* VS-bilde: vis toppbilde fra begge rapporter når tilgjengelig */}
      <View style={styles.vsCard}>
        <Text style={styles.vsTitle}>Bilder (din rapport vs motpart)</Text>
        <View style={styles.vsRow}>
          <Pressable
            style={[styles.vsCol, styles.vsColLeft]}
            onPress={() => {
              const your = (youOwnLost ? match.lost : (youOwnFound ? match.found : match.lost));
              const other = your.id === match.lost.id ? match.found : match.lost;
              const yourUrls = thumbs[your.id] ?? [];
              const otherUrls = thumbs[other.id] ?? [];
              const all = [...yourUrls, ...otherUrls];
              if (!all.length) return;
              setViewerImages(all.map((u) => ({ uri: u })));
              setViewerIndex(0);
              setViewerVisible(true);
            }}
          >
            <Text style={styles.vsLabel}>Din</Text>
            {(thumbs[(youOwnLost ? match.lost.id : (youOwnFound ? match.found.id : match.lost.id))] ?? [])[0] ? (
              <Image
                source={{ uri: (thumbs[(youOwnLost ? match.lost.id : (youOwnFound ? match.found.id : match.lost.id))] ?? [])[0] }}
                style={styles.vsThumb}
              />
            ) : (
              <View style={styles.vsThumbPlaceholder} />
            )}
          </Pressable>

          <View style={styles.vsMid}>
            <Text style={styles.vsMidTxt}>VS</Text>
          </View>

          <Pressable
            style={[styles.vsCol, styles.vsColRight]}
            onPress={() => {
              const your = (youOwnLost ? match.lost : (youOwnFound ? match.found : match.lost));
              const other = your.id === match.lost.id ? match.found : match.lost;
              const yourUrls = thumbs[your.id] ?? [];
              const otherUrls = thumbs[other.id] ?? [];
              const all = [...yourUrls, ...otherUrls];
              if (!all.length) return;
              setViewerImages(all.map((u) => ({ uri: u })));
              setViewerIndex(Math.max(0, yourUrls.length));
              setViewerVisible(true);
            }}
          >
            <Text style={styles.vsLabel}>Motpart</Text>
            {(thumbs[(youOwnLost ? match.found.id : (youOwnFound ? match.lost.id : match.found.id))] ?? [])[0] ? (
              <Image
                source={{ uri: (thumbs[(youOwnLost ? match.found.id : (youOwnFound ? match.lost.id : match.found.id))] ?? [])[0] }}
                style={styles.vsThumb}
              />
            ) : (
              <View style={styles.vsThumbPlaceholder} />
            )}
          </Pressable>
        </View>
        <Text style={styles.vsHint}>Trykk på et bilde for å åpne alle bilder (samlet visning).</Text>
      </View>

<ReportBlock rep={match.lost} ownerLabel={`${labelLostOwner} (Mistet)`} />
        <ReportBlock rep={match.found} ownerLabel={`${labelFoundOwner} (Funnet)`} />

        <View style={styles.actions}>
        {match.status === "CONFIRMED" ? (
          <>
            <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => setStatus("DISMISSED")}>
              <Text style={styles.btnOutlineTxt}>{language === "en" ? "Dismiss" : "Avvis"}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={openChat}>
              <Text style={styles.btnPrimaryTxt}>{unread ? "Åpne chat (ny melding)" : "Åpne chat"}</Text>
            </Pressable>
          </>
        ) : youOwnLost ? (
          <>
            <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => setStatus("DISMISSED")}>
              <Text style={styles.btnOutlineTxt}>{language === "en" ? "Dismiss" : "Avvis"}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setStatus("CONFIRMED")}>
              <Text style={styles.btnPrimaryTxt}>Bekreft match</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>{language === "en" ? "Waiting for approval from the lost owner" : "Venter på godkjenning fra mistet"}</Text>
            <Text style={styles.pendingText}>{language === "en" ? "Chat opens only when the lost owner has confirmed the find." : "Chat åpnes først når eier av mistet har bekreftet matchen."}</Text>
          </View>
        )}
      </View>

      {match.status !== "CONFIRMED" && !youOwnLost && (
        <Text style={styles.infoNote}>
          {language === "en" ? "You can view details now. Chat opens automatically when the lost owner confirms the find." : "Du kan se detaljer nå. Chat åpnes automatisk når mistet bekrefter matchen."}
        </Text>
      )}

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", paddingBottom: 6, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  backTxt: { fontWeight: "900", color: "#111", fontSize: 18 },
  h1: { fontSize: 22, fontWeight: "900", color: "#111" },
  h2: { marginTop: 2, color: "#666", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hTitle: { fontWeight: "900", fontSize: 16, flex: 1, paddingRight: 8 },
  unreadDot: { color: "#2563EB", fontWeight: "900" },
  headerBlurb: { marginTop: 8, color: "#334155", fontWeight: "700", lineHeight: 20 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    fontWeight: "700",
    color: "#111",
    fontSize: 12,
  },

  lastLine: { marginTop: 10, color: "#111", fontWeight: "700" },

  repCard: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  repOwner: { color: "#666", fontWeight: "900" },
  repTitle: { marginTop: 6, fontWeight: "900", fontSize: 16 },
  repDesc: { marginTop: 8, color: "#333" },
  finderMessageBox: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  finderMessageLabel: { color: "#1D4ED8", fontWeight: "900", marginBottom: 4, fontSize: 12, textTransform: "uppercase" },
  finderMessageText: { color: "#1E293B", fontWeight: "700", lineHeight: 20 },

  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: "#eee" },

  muted: { marginTop: 8, color: "#666", fontWeight: "600" },
  reward: { marginTop: 10, fontWeight: "800" },
  locationHelpBox: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  locationHelpText: { color: "#475569", fontWeight: "700", lineHeight: 19 },
  mapLinkBtn: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE" },
  mapLinkTxt: { color: "#1D4ED8", fontWeight: "900" },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  pendingCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1" },
  pendingTitle: { color: "#0F172A", fontWeight: "900", marginBottom: 4 },
  pendingText: { color: "#475569", fontWeight: "700", lineHeight: 18 },
  infoNote: { marginTop: 10, color: "#666", fontWeight: "700" },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnPrimaryTxt: { color: "#fff", fontWeight: "900" },
  btnOutline: { borderWidth: 1, borderColor: "#b00", backgroundColor: "#fff" },
  btnOutlineTxt: { color: "#b00", fontWeight: "900" },

  
  // VS-bilde (din vs motpart)
  vsCard: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  vsTitle: { fontWeight: "900", fontSize: 14, color: "#111" },
  vsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  vsCol: { flex: 1 },
  vsColLeft: { paddingRight: 6 },
  vsColRight: { paddingLeft: 6 },
  vsLabel: { fontWeight: "900", color: "#666", marginBottom: 6 },
  vsThumb: { width: "100%", height: 120, borderRadius: 12, backgroundColor: "#eee" },
  vsThumbPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  vsMid: { width: 42, alignItems: "center", justifyContent: "center" },
  vsMidTxt: { fontWeight: "900", color: "#111" },
  vsHint: { marginTop: 8, color: "#666", fontWeight: "600" },
});
