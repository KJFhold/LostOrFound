import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "../../src/lib/config";
import { supabase } from "../../src/lib/supabase";
import { useI18n } from "../../src/i18n/I18nProvider";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { AuthHeaderAction } from "../../src/ui/AuthHeaderAction";
import { theme } from "../../src/ui/theme";
function reason(reasons: any[], key: string) {
  return (reasons || []).find((x: any) => x?.k === key)?.v;
}
function secondaryColor(report: any) {
  return (
    String(report?.secondary_color || "").trim() ||
    String(report?.description || "")
      .match(/(?:Secondary color|Tilleggsfarge):\s*([^\n]+)/i)?.[1]
      ?.trim() ||
    null
  );
}
function colors(report: any) {
  return [report?.color, secondaryColor(report)]
    .map((x) => String(x || "").toLowerCase())
    .filter(Boolean);
}
function sharedColor(match: any) {
  const found = colors(match?.found);
  return colors(match?.lost).find((x) => found.includes(x)) || null;
}
function level(score: number, language: string) {
  if (score >= 85)
    return language === "en" ? "Excellent match" : "Svært godt treff";
  if (score >= 70) return language === "en" ? "Good match" : "Godt treff";
  return language === "en" ? "Possible match" : "Mulig treff";
}
export default function MatchComparisonScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) throw new Error("AUTH_REQUIRED");
      const r = await fetch(
        `${API_BASE_URL}/matches/${encodeURIComponent(String(matchId))}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "MATCH_LOAD_FAILED");
      setMatch(j.match);
      const paths = [
        j.match?.lost?.report_images?.[0]?.path,
        j.match?.found?.report_images?.[0]?.path,
      ].filter(Boolean);
      if (paths.length) {
        const sr = await fetch(
          `${API_BASE_URL}/storage/signed-download-batch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paths }),
          },
        );
        const sj = await sr.json();
        if (sr.ok) setImages(sj.urls || {});
      }
    } catch (e: any) {
      Alert.alert(t("match.error"), e?.message || t("match.unknown.error"));
    } finally {
      setLoading(false);
    }
  }, [matchId, language]);
  useEffect(() => {
    void load();
  }, [load]);
  const shared = useMemo(() => sharedColor(match), [match]);
  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  if (!match)
    return (
      <View style={s.center}>
        <Text>{t("matchDetail.missing.match")}</Text>
      </View>
    );
  const rows = [
    `${t("match.item")}: ${match.lost?.subcategory_key || match.found?.subcategory_key || "—"}`,
    `${t("match.color")}: ${shared || match.lost?.color || match.found?.color || "—"}`,
    `${t("match.location")}: ${reason(match.reasons, "within_radius") === true ? t("match.within.selected.area") : Math.round(Number(reason(match.reasons, "distance_m") || 0)) + " m"}`,
  ];
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.safe}>
        <PremiumHeader
          title={t("match.comparison")}
          subtitle={level(Number(match.score), language)}
          onBack={() => router.back()}
          right={<AuthHeaderAction />}
        />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <View style={s.images}>
              {[match.lost, match.found].map((report: any) => (
                <View key={report.id} style={s.imageCol}>
                  <Text style={s.owner}>
                    {report.type === "LOST"
                      ? t("match.lost")
                      : t("match.found")}
                  </Text>
                  {report.report_images?.[0]?.path &&
                  images[report.report_images[0].path] ? (
                    <Image
                      source={{ uri: images[report.report_images[0].path] }}
                      style={s.image}
                    />
                  ) : (
                    <View style={s.placeholder} />
                  )}
                </View>
              ))}
            </View>
            <Text style={s.title}>{level(Number(match.score), language)}</Text>
            {rows.map((row, i) => (
              <Text key={i} style={s.row}>
                ✓ {row}
              </Text>
            ))}
            <Text style={s.explanation}>
              {t(
                shared
                  ? "match.shared.color.explanation"
                  : "match.score.explanation",
              )}
            </Text>
            <Pressable
              style={s.primary}
              onPress={() => router.push(`/matches/${match.id}`)}
            >
              <Text style={s.primaryText}>{t("match.view.full.details")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 14 },
  card: {
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  images: { flexDirection: "row", gap: 10 },
  imageCol: { flex: 1 },
  owner: { marginBottom: 6, color: theme.colors.muted, fontWeight: "900" },
  image: { width: "100%", height: 140, borderRadius: 12 },
  placeholder: { height: 140, borderRadius: 12, backgroundColor: "#E2E8F0" },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
  },
  row: { marginTop: 9, color: theme.colors.text, fontWeight: "800" },
  explanation: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  primary: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryText: { color: "#FFF", fontWeight: "900" },
});
