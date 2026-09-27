import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import ImageViewing from "react-native-image-viewing";
import { API_BASE_URL } from "../../src/lib/config";
import { supabase } from "../../src/lib/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { theme } from "../../src/ui/theme";

type Translate = ReturnType<typeof useI18n>["t"];
type DetailData = {
  report: any;
  images: Array<{ id: string; path: string; sort_order: number; signed_url?: string | null }>;
  entitlements: Array<any>;
  geo_alert_campaigns: Array<any>;
  confirmed_matches: Array<any>;
  last_messages: Array<any>;
  observations: Array<any>;
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
function productLabel(code: string, language: "no" | "en", t: Translate) {
  if (code === "REPORT_REACTIVATION") return t("caseDetail.report.reactivation");
  if (code === "LONG_TERM_WATCH_ANNUAL") return t("caseDetail.annual.long.term.watch");
  if (code.startsWith("GEO_ALERT_TIER_")) return t("caseDetail.area.alert");
  return code;
}

export default function ReportDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t } = useI18n();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error(t("caseDetail.you.must.be.logged.in"));
      const response = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
      setData(json as DetailData);
    } catch (error: any) {
      Alert.alert(t("caseDetail.error"), error?.message || (t("caseDetail.could.not.load.case")));
    } finally {
      setLoading(false);
    }
  }, [id, language]);

  useEffect(() => { void load(); }, [load]);

  const viewerImages = useMemo(
    () => (data?.images || []).filter((image) => !!image.signed_url).map((image) => ({ uri: String(image.signed_url) })),
    [data?.images]
  );

  const lastByMatch = useMemo(() => {
    const map: Record<string, any> = {};
    for (const message of data?.last_messages || []) map[String(message.conversation_id)] = message;
    return map;
  }, [data?.last_messages]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.safe}>
        <PremiumHeader title={t("caseDetail.case.details")} subtitle={data?.report?.title || ""} onBack={() => router.back()} />
        {loading ? (
          <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>{t("caseDetail.loading")}</Text></View>
        ) : !data ? (
          <View style={styles.center}><Text style={styles.muted}>{t("caseDetail.case.unavailable")}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.badges}>
                <Text style={[styles.kind, data.report.type === "FOUND" && styles.kindFound]}>{data.report.type}</Text>
                <Text style={styles.status}>{value(data.report.status)}</Text>
              </View>
              <Text style={styles.title}>{data.report.title || (t("caseDetail.item"))}</Text>
              <Text style={styles.sub}>{value(data.report.location_label)}</Text>
            </View>

            {data.images.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>{t("caseDetail.photos")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.images}>
                  {data.images.map((image) => {
                    if (!image.signed_url) return null;
                    const viewerIndex = viewerImages.findIndex((entry) => entry.uri === image.signed_url);
                    return (
                      <Pressable
                        key={image.id}
                        style={styles.imageFrame}
                        onPress={() => {
                          setImageViewerIndex(Math.max(0, viewerIndex));
                          setImageViewerVisible(true);
                        }}
                      >
                        <Image source={{ uri: image.signed_url }} style={styles.image} resizeMode="contain" />
                        <View style={styles.imageHint}><Text style={styles.imageHintText}>{t("caseDetail.tap.to.enlarge")}</Text></View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.h2}>{t("caseDetail.report")}</Text>
              <Info label={t("caseDetail.description")} value={data.report.description} />
              <Info label={t("caseDetail.category")} value={data.report.category} />
              <Info label={t("caseDetail.object")} value={data.report.subcategory_key} />
              <Info label={t("caseDetail.color")} value={data.report.color} />
              <Info label={t("caseDetail.brand")} value={data.report.brand} />
              <Info label={t("caseDetail.occurred")} value={dateTime(data.report.occurred_at, language)} />
              <Info label={t("caseDetail.date.precision")} value={data.report.occurred_precision} />
              <Info label={t("caseDetail.created")} value={dateTime(data.report.created_at, language)} />
              <Info label={t("caseDetail.visible.until")} value={dateTime(data.report.visible_until, language)} />
              <Info label={t("caseDetail.reward")} value={`${Number(data.report.reward_ore || 0) / 100} NOK`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>{t("caseDetail.area")}</Text>
              <Info label={t("caseDetail.place")} value={data.report.location_label} />
              <Info label="Latitude" value={data.report.lat} />
              <Info label="Longitude" value={data.report.lng} />
              <Info label={t("caseDetail.radius")} value={data.report.radius_m || data.report.search_radius_m || data.report.area_radius_m || data.report.location_radius_m ? `${data.report.radius_m || data.report.search_radius_m || data.report.area_radius_m || data.report.location_radius_m} m` : null} />
            </View>

            {String(data.report.type || "").toUpperCase() === "LOST" && data.report.lat != null && data.report.lng != null && (
              <View style={styles.geoAlertCta}>
                <Text style={styles.geoAlertCtaTitle}>{t("caseDetail.notify.people.nearby")}</Text>
                <Text style={styles.geoAlertCtaBody}>{t("caseDetail.preview.coverage.qualified.recipients.and.the.current.test.price.befor")}</Text>
                <Pressable
                  style={styles.geoAlertCtaButton}
                  onPress={() => router.push({ pathname: "/geo-alert-create", params: { reportId: data.report.id, title: data.report.title || "", lat: String(data.report.lat), lng: String(data.report.lng) } })}
                >
                  <Text style={styles.geoAlertCtaButtonText}>{t("caseDetail.preview.area.alert")}</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.h2}>{t("caseDetail.additional.services")}</Text>
              {data.entitlements.length === 0 ? <Text style={styles.muted}>{t("caseDetail.no.paid.additions")}</Text> : data.entitlements.map((item) => (
                <View key={item.id} style={styles.entitlement}>
                  <Text style={styles.entitlementTitle}>{productLabel(String(item.product_code || ""), language, t)}</Text>
                  <Text style={styles.entitlementMeta}>{item.status} · {dateTime(item.current_period_end, language)}</Text>
                  <Text style={styles.entitlementMeta}>{item.auto_renews ? (t("caseDetail.renews.automatically")) : (t("caseDetail.does.not.renew.automatically"))}</Text>
                </View>
              ))}
            </View>

            {data.geo_alert_campaigns.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.h2}>{t("caseDetail.area.alerts")}</Text>
                {data.geo_alert_campaigns.map((campaign) => (
                  <View key={campaign.id} style={styles.entitlement}>
                    <Text style={styles.entitlementTitle}>{String(campaign.status).toUpperCase() === "ACTIVE" ? (t("caseDetail.active")) : campaign.status} · {String(campaign.geometry_type).toUpperCase() === "CIRCLE" ? (t("caseDetail.circular.area")) : campaign.geometry_type}</Text>
                    <Text style={styles.entitlementMeta}>{campaign.radius_m ? `${campaign.radius_m} m` : "–"} · {campaign.area_sq_km ?? "–"} km²</Text>
                    <Text style={styles.entitlementMeta}>{dateTime(campaign.starts_at, language)} → {dateTime(campaign.ends_at, language)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}><Text style={styles.h2}>{t("caseDetail.observations.and.possible.finds")}</Text>{(data.observations||[]).length===0?<Text style={styles.muted}>{t("caseDetail.no.observations.yet")}</Text>:(data.observations||[]).map((o:any)=><Pressable key={o.id} style={styles.observationCard} onPress={()=>router.push(`/observation/${o.id}`)}><Text style={styles.observationTitle}>{o.observation_type==="FOUND"?(t("caseDetail.possible.find")):(t("caseDetail.seen"))} · {o.status==="NEW"?(t("caseDetail.new")):o.status==="CONFIRMED"?(t("caseDetail.confirmed")):o.status}</Text><Text style={styles.observationMeta}>{dateTime(o.observed_at,language)}</Text>{o.comment&&<Text style={styles.observationMeta} numberOfLines={2}>{o.comment}</Text>}<Text style={styles.observationLink}>{t("caseDetail.view.details")}</Text></Pressable>)}</View>
            <View style={styles.card}>
              <Text style={styles.h2}>{t("caseDetail.confirmed.matches.and.chat")}</Text>
              {data.confirmed_matches.length === 0 ? <Text style={styles.muted}>{t("caseDetail.no.confirmed.matches")}</Text> : data.confirmed_matches.map((match) => {
                const last = lastByMatch[String(match.id)];
                return (
                  <Pressable key={match.id} style={styles.match} onPress={() => router.push(`/chat/${match.id}`)}>
                    <Text style={styles.matchTitle}>{t("caseDetail.open.chat")} · {match.status}</Text>
                    <Text style={styles.matchMeta}>{last?.body || (t("caseDetail.no.messages.yet"))}</Text>
                    <Text style={styles.matchMeta}>{dateTime(last?.created_at || match.created_at, language)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.editButton} onPress={() => router.push({ pathname: "/(report)/create-report", params: { editReportId: data.report.id } })}>
              <Text style={styles.editText}>{t("caseDetail.edit.report")}</Text>
            </Pressable>
          </ScrollView>
        )}
        <ImageViewing
          images={viewerImages}
          imageIndex={Math.min(imageViewerIndex, Math.max(0, viewerImages.length - 1))}
          visible={imageViewerVisible && viewerImages.length > 0}
          onRequestClose={() => setImageViewerVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
        />
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
  imageFrame: { width: 260, height: 210, borderRadius: 14, overflow: "hidden", backgroundColor: "#0F172A", borderWidth: 1, borderColor: theme.colors.border },
  image: { width: "100%", height: "100%", backgroundColor: "#0F172A" },
  imageHint: { position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(15,23,42,0.78)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  imageHintText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },
  info: { flexDirection: "row", justifyContent: "space-between", gap: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  infoLabel: { flex: 1, color: theme.colors.muted, fontWeight: "700" },
  infoValue: { flex: 1.5, color: theme.colors.text, fontWeight: "700", textAlign: "right" },
  entitlement: { marginTop: 12, padding: 12, borderRadius: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: theme.colors.border },
  entitlementTitle: { color: theme.colors.text, fontWeight: "900" },
  entitlementMeta: { color: theme.colors.muted, fontWeight: "600", marginTop: 4 },
  observationCard:{marginTop:12,padding:13,borderRadius:13,borderWidth:1,borderColor:"#BAE6FD",backgroundColor:"#F0F9FF"},observationTitle:{fontWeight:"900",color:theme.colors.text},observationMeta:{marginTop:4,fontWeight:"600",color:theme.colors.muted},observationLink:{marginTop:8,fontWeight:"900",color:theme.colors.primary},match: { marginTop: 12, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: "#C7D2FE", backgroundColor: "#EEF2FF" },
  matchTitle: { color: theme.colors.primary, fontWeight: "900" },
  matchMeta: { color: theme.colors.text, fontWeight: "600", marginTop: 4 },
  geoAlertCta: { padding: 16, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#93C5FD", borderRadius: 18, marginBottom: 12 },
  geoAlertCtaTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 17 },
  geoAlertCtaBody: { color: theme.colors.muted, fontWeight: "700", marginTop: 6, lineHeight: 19 },
  geoAlertCtaButton: { minHeight: 46, marginTop: 13, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  geoAlertCtaButtonText: { color: "#FFFFFF", fontWeight: "900" },
  editButton: { minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  editText: { color: "#FFFFFF", fontWeight: "900" },
});
