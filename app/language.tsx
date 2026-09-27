// app/language.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../src/ui/theme";
import { useI18n, Lang } from "../src/i18n/I18nProvider";

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();

  const pick = async (lang: Lang) => {
    await setLanguage(lang);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t("lang.title")}</Text>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Pressable style={[styles.row, language === "no" && styles.rowActive]} onPress={() => pick("no")}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{t("lang.norwegian")}</Text>
                <Text style={styles.rowMeta}>{t("lang.norwegianMeta")}</Text>
              </View>
              <Text style={[styles.check, language === "no" && styles.checkOn]}>{language === "no" ? "✓" : ""}</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={[styles.row, language === "en" && styles.rowActive]} onPress={() => pick("en")}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{t("lang.english")}</Text>
                <Text style={styles.rowMeta}>{t("lang.englishMeta")}</Text>
              </View>
              <Text style={[styles.check, language === "en" && styles.checkOn]}>{language === "en" ? "✓" : ""}</Text>
            </Pressable>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>{t("lang.tipTitle")}</Text>
            <Text style={styles.noteText}>{t("lang.tipBody")}</Text>
          </View>

          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnTxt}>{t("lang.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.xl, backgroundColor: theme.colors.bg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontWeight: "900", color: theme.colors.text },
  closeBtn: { width: 42, height: 42, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", ...theme.shadow.card },
  closeTxt: { fontSize: 16, fontWeight: "900", color: theme.colors.text, marginTop: -1 },
  card: { marginTop: theme.space.lg, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, overflow: "hidden", ...theme.shadow.card },
  row: { paddingVertical: 14, paddingHorizontal: theme.space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowActive: { backgroundColor: theme.colors.chipBg },
  rowLeft: { flexDirection: "column", gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "900", color: theme.colors.text },
  rowMeta: { fontSize: 12, fontWeight: "700", color: theme.colors.muted },
  check: { width: 22, textAlign: "right", fontSize: 18, fontWeight: "900", color: theme.colors.muted },
  checkOn: { color: theme.colors.primary },
  divider: { height: 1, backgroundColor: theme.colors.border },
  noteCard: { marginTop: theme.space.lg, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: theme.space.lg, ...theme.shadow.card },
  noteTitle: { fontWeight: "900", color: theme.colors.text, marginBottom: 6 },
  noteText: { color: theme.colors.muted, fontWeight: "600", lineHeight: 20 },
  secondaryBtn: { marginTop: theme.space.xl, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  secondaryBtnTxt: { color: theme.colors.text, fontWeight: "900", fontSize: 16 },
});
