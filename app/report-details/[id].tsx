import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "../../src/lib/config";
import { supabase } from "../../src/lib/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { theme } from "../../src/ui/theme";

type DetailData = {
  report: any;
  images: Array<{ id: string; path: string; sort_order: number; signed_url?: string | null }>;
  entitlements: Array<any>;
  geo_alert_campaigns: Array<any>;
  confirmed_matches: Array<any>;
  last_messages: Array<any>;
};

function dateTime(value?: string | null, language: "no" | "en" = "no") {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString(language === "en" ? "en-GB" : "nb-NO", { dateStyle: "medium", timeStyle: "short" });
}
function value(value: unknown) {
  if (value == null || value === "") return "–";
  return String(value);
}
function productLabel(code: string, language: "no" | "en") {
  if (code === "REPORT_REACTIVATION") return language === "en" ? "Report reactivation" : "Reaktivering";
  if (code === "LONG_TERM_WATCH_ANNUAL") return language === "en" ? "Annual long-term watch" : "Årlig langtidsvakt";
  if (code.startsWith("GEO_ALERT_TIER_")) return language === "en" ? "Geo alert" : "Geovarsel";
  return code;
}

export default function ReportDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useI18n();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error(language === "en" ? "You must be logged in." : "Du må være innlogget.");
      const response = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
      setData(json as DetailData);
    } catch (error: any) {
      Alert.alert(language === "en" ? "Error" : "Feil", error?.message || (language === "en" ? "Could not load case." : "Kunne ikke hente saken."));
    } finally {
      setLoading(false);
    }
  }, [id, language]);

  useEffect(() => { void load(); }, [load]);

  const lastByMatch = useMemo(() => {
    const map: Record<string, any> = {};
    for (const message of data?.last_messages || []) map[String(message.conversation_id)] = message;
    return map;
  }, [data?.last_messages]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.safe}>
        <PremiumHeader title={language === "en" ? "Case details" : "Saksdetaljer"} subtitle={data?.report?.title || ""} onBack={() => router.back()} />
        {loading ? (
          <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>{language === "en" ? "Loading…" : "Laster…"}</Text></View>
        ) : !data ? (
          <View style={styles.center}><Text style={styles.muted}>{language === "en" ? "Case unavailable." : "Saken er ikke tilgjengelig."}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.badges}>
                <Text style={[styles.kind, data.report.type === "FOUND" && styles.kindFound]}>{data.report.type}</Text>
                <Text style={styles.status}>{value(data.report.status)}</Text>
              </View>
              <Text style={styles.title}>{data.report.title || (language === "en" ? "Item" : "Gjenstand")}</Text>
              <Text style={styles.sub}>{value(data.report.location_label)}</Text>
            </View>

            {data.images.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>{language === "en" ? "Photos" : "Bilder"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.images}>
                  {data.images.map((image) => image.signed_url ? <Image key={image.id} source={{ uri: image.signed_url }} style={styles.image} resizeMode="cover" /> : null)}
                </ScrollView>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.h2}>{language === "en" ? "Report" : "Rapport"}</Text>
              <Info label={language === "en" ? "Description" : "Beskrivelse"} value={data.report.description} />
              <Info label={language === "en" ? "Category" : "Kategori"} value={data.report.category} />
              <Info label={language === "en" ? "Object" : "Gjenstand"} value={data.report.subcategory_key} />
              <Info label={language === "en" ? "Color" : "Farge"} value={data.report.color} />
              <Info label={language === "en" ? "Brand" : "Merke"} value={data.report.brand} />
              <Info label={language === "en" ? "Occurred" : "Tidspunkt"} value={dateTime(data.report.occurred_at, language)} />
              <Info label={language === "en" ? "Date precision" : "Datopresisjon"} value={data.report.occurred_precision} />
              <Info label={language === "en" ? "Created" : "Opprettet"} value={dateTime(data.report.created_at, language)} />
              <Info label={language === "en" ? "Visible until" : "Aktiv til"} value={dateTime(data.report.visible_until, language)} />
              <Info label={language === "en" ? "Reward" : "Finnerlønn"} value={`${Number(data.report.reward_ore || 0) / 100} NOK`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>{language === "en" ? "Area" : "Område"}</Text>
              <Info label={language === "en" ? "Place" : "Sted"} value={data.report.location_label} />
              <Info label="Latitude" value={data.report.lat} />
              <Info label="Longitude" value={data.report.lng} />
              <Info label={language === "en" ? "Radius" : "Radius"} value={data.report.radius_m || data.report.search_radius_m || data.report.area_radius_m || data.report.location_radius_m ? `${data.report.radius_m || data.report.search_radius_m || data.report.area_radius_m || data.report.location_radius_m} m` : null} />
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>{language === "en" ? "Paid additions" : "Betalte tillegg"}</Text>
              {data.entitlements.length === 0 ? <Text style={styles.muted}>{language === "en" ? "No paid additions." : "Ingen betalte tillegg."}</Text> : data.entitlements.map((item) => (
                <View key={item.id} style={styles.entitlement}>
                  <Text style={styles.entitlementTitle}>{productLabel(String(item.product_code || ""), language)}</Text>
                  <Text style={styles.entitlementMeta}>{item.status} · {dateTime(item.current_period_end, language)}</Text>
                  <Text style={styles.entitlementMeta}>{item.auto_renews ? (language === "en" ? "Renews automatically" : "Fornyes automatisk") : (language === "en" ? "Does not renew automatically" : "Fornyes ikke automatisk")}</Text>
                </View>
              ))}
            </View>

            {data.geo_alert_campaigns.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>{language === "en" ? "Geo alerts" : "Geovarsler"}</Text>
                {data.geo_alert_campaigns.map((campaign) => (
                  <View key={campaign.id} style={styles.entitlement}>
                    <Text style={styles.entitlementTitle}>{campaign.status} · {campaign.geometry_type}</Text>
                    <Text style={styles.entitlementMeta}>{campaign.radius_m ? `${campaign.radius_m} m` : "–"} · {campaign.area_sq_km ?? "–"} km²</Text>
                    <Text style={styles.entitlementMeta}>{dateTime(campaign.starts_at, language)} → {dateTime(campaign.ends_at, language)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.h2}>{language === "en" ? "Confirmed matches and chat" : "Bekreftede treff og chat"}</Text>
              {data.confirmed_matches.length === 0 ? <Text style={styles.muted}>{language === "en" ? "No confirmed matches." : "Ingen bekreftede treff."}</Text> : data.confirmed_matches.map((match) => {
                const last = lastByMatch[String(match.id)];
                return (
                  <Pressable key={match.id} style={styles.match} onPress={() => router.push(`/chat/${match.id}`)}>
                    <Text style={styles.matchTitle}>{language === "en" ? "Open chat" : "Åpne chat"} · {match.status}</Text>
                    <Text style={styles.matchMeta}>{last?.body || (language === "en" ? "No messages yet" : "Ingen meldinger ennå")}</Text>
                    <Text style={styles.matchMeta}>{dateTime(last?.created_at || match.created_at, language)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.editButton} onPress={() => router.push({ pathname: "/(report)/create-report", params: { editReportId: data.report.id } })}>
              <Text style={styles.editText}>{language === "en" ? "Edit report" : "Rediger rapport"}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function Info({ label, value: raw }: { label: string; value: unknown }) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value(raw)}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 14, paddingBottom: 40 },
  muted: { color: theme.colors.muted, fontWeight: "600", marginTop: 7 },
  hero: { padding: 18, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, marginBottom: 12 },
  badges: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kind: { overflow: "hidden", borderRadius: 999, backgroundColor: "#FFF1F2", color: "#BE123C", paddingHorizontal: 10, paddingVertical: 5, fontWeight: "900" },
  kindFound: { backgroundColor: "#ECFDF3", color: "#15803D" },
  status: { overflow: "hidden", borderRadius: 999, backgroundColor: "#EEF2FF", color: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 5, fontWeight: "900" },
  title: { color: theme.colors.text, fontWeight: "900", fontSize: 22, marginTop: 16 },
  sub: { color: theme.colors.muted, fontWeight: "600", marginTop: 6 },
  card: { padding: 16, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, marginBottom: 12 },
  h2: { color: theme.colors.text, fontWeight: "900", fontSize: 17 },
  images: { gap: 10, paddingTop: 12 },
  image: { width: 230, height: 180, borderRadius: 14, backgroundColor: "#E2E8F0" },
  info: { flexDirection: "row", justifyContent: "space-between", gap: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  infoLabel: { flex: 1, color: theme.colors.muted, fontWeight: "700" },
  infoValue: { flex: 1.5, color: theme.colors.text, fontWeight: "700", textAlign: "right" },
  entitlement: { marginTop: 12, padding: 12, borderRadius: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: theme.colors.border },
  entitlementTitle: { color: theme.colors.text, fontWeight: "900" },
  entitlementMeta: { color: theme.colors.muted, fontWeight: "600", marginTop: 4 },
  match: { marginTop: 12, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: "#C7D2FE", backgroundColor: "#EEF2FF" },
  matchTitle: { color: theme.colors.primary, fontWeight: "900" },
  matchMeta: { color: theme.colors.text, fontWeight: "600", marginTop: 4 },
  editButton: { minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  editText: { color: "#FFFFFF", fontWeight: "900" },
});
