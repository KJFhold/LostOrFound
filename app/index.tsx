// app/index.tsx
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.langSelect, pressed && styles.pressed]}
            onPress={() => router.push("/language")}
            accessibilityRole="button"
            accessibilityLabel={t("home.languageSelectorA11y")}
          >
            <Text style={styles.langTxt}>{t("language.currentName")}</Text>
            <Text style={styles.langChevron}>▾</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>

          <Text style={styles.eyebrow}>{t("home.eyebrow")}</Text>
          <Text style={styles.h1}>{t("home.title")}</Text>
          <Text style={styles.sub}>{t("home.subtitle")}</Text>

          <View style={styles.actionStack}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => router.push("/start")}
              accessibilityRole="button"
              accessibilityLabel={t("home.ctaPrimaryA11y")}
            >
              <Text style={styles.primaryBtnTxt}>{t("home.ctaPrimary")}</Text>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                onPress={() => router.push("/how")}
                accessibilityRole="button"
                accessibilityLabel={t("home.ctaSecondaryA11y")}
              >
                <Text style={styles.secondaryBtnTxt}>{t("home.ctaSecondary")}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                onPress={() => router.push("/my-reports")}
                accessibilityRole="button"
                accessibilityLabel={t("home.myCasesA11y")}
              >
                <Text style={styles.secondaryBtnTxt}>{t("home.myCases")}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Text style={styles.noticeIconTxt}>✓</Text>
          </View>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>{t("home.privacyTitle")}</Text>
            <Text style={styles.noticeText}>{t("home.privacyBody")}</Text>
          </View>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>{t("home.stepsTitle")}</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeTxt}>1</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>{t("home.stepReportTitle")}</Text>
              <Text style={styles.stepText}>{t("home.stepReportBody")}</Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeTxt}>2</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>{t("home.stepMatchTitle")}</Text>
              <Text style={styles.stepText}>{t("home.stepMatchBody")}</Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeTxt}>3</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>{t("home.stepConnectTitle")}</Text>
              <Text style={styles.stepText}>{t("home.stepConnectBody")}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>{t("home.trustFooter")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  topRow: {
    alignItems: "flex-end",
  },
  langSelect: {
    minWidth: 132,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadow.card,
  },
  langTxt: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  langChevron: {
    fontSize: 16,
    color: theme.colors.muted,
    fontWeight: "900",
    marginLeft: 8,
    marginTop: -1,
  },
  heroCard: {
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.lg,
    alignItems: "center",
    ...theme.shadow.card,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#EEF2FF",
    marginBottom: theme.space.md,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  eyebrow: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  sub: {
    textAlign: "center",
    color: theme.colors.muted,
    marginTop: theme.space.md,
    fontWeight: "700",
    lineHeight: 22,
    fontSize: 16,
  },
  actionStack: {
    alignSelf: "stretch",
    marginTop: theme.space.xl,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    paddingHorizontal: theme.space.md,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  primaryBtnTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
  },
  secondaryRow: {
    marginTop: theme.space.md,
    flexDirection: "row",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  secondaryBtnTxt: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
  },
  noticeCard: {
    marginTop: theme.space.lg,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  noticeIconTxt: {
    color: "#16A34A",
    fontWeight: "900",
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 5,
    fontSize: 16,
  },
  noticeText: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  stepsCard: {
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
  },
  stepsTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: theme.space.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepBadgeTxt: {
    color: theme.colors.primary,
    fontWeight: "900",
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  stepText: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 3,
  },
  stepDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.space.md,
    marginLeft: 42,
  },
  footerText: {
    color: theme.colors.muted,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 17,
    marginTop: theme.space.lg,
    paddingHorizontal: theme.space.md,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
});
