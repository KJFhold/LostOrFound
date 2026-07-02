// app/how.tsx
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

type CardProps = {
  step: string;
  title: string;
  body: string;
};

function StepCard({ step, title, body }: CardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeTxt}>{step}</Text>
      </View>
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function HowScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("how.backA11y")}
          >
            <Text style={styles.backPillTxt}>‹ {t("common.back")}</Text>
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

          <Text style={styles.eyebrow}>{t("how.eyebrow")}</Text>
          <Text style={styles.title}>{t("how.title")}</Text>
          <Text style={styles.subtitle}>{t("how.subtitle")}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("how.stepsTitle")}</Text>
          <Text style={styles.sectionText}>{t("how.stepsIntro")}</Text>
        </View>

        <StepCard step="1" title={t("how.card1.title")} body={t("how.card1.body")} />
        <StepCard step="2" title={t("how.card2.title")} body={t("how.card2.body")} />
        <StepCard step="3" title={t("how.card3.title")} body={t("how.card3.body")} />
        <StepCard step="4" title={t("how.card4.title")} body={t("how.card4.body")} />

        <View style={styles.trustCard}>
          <View style={styles.trustIcon}>
            <Text style={styles.trustIconTxt}>✓</Text>
          </View>
          <View style={styles.trustTextWrap}>
            <Text style={styles.trustTitle}>{t("how.trustTitle")}</Text>
            <Text style={styles.trustBody}>{t("how.trustBody")}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push("/start")}
          accessibilityRole="button"
          accessibilityLabel={t("how.ctaA11y")}
        >
          <Text style={styles.primaryBtnTxt}>{t("how.cta")}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("how.backA11y")}
        >
          <Text style={styles.secondaryBtnTxt}>{t("how.back")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  topRow: {
    alignItems: "flex-start",
  },
  backPill: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.card,
  },
  backPillTxt: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 14,
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
    width: 78,
    height: 78,
    borderRadius: 20,
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
  title: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    marginTop: theme.space.md,
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 22,
    fontSize: 16,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: theme.space.lg,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  sectionText: {
    marginTop: 6,
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  card: {
    marginTop: theme.space.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    ...theme.shadow.card,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepBadgeTxt: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 15,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  cardBody: {
    marginTop: 7,
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  trustCard: {
    marginTop: theme.space.lg,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  trustIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  trustIconTxt: {
    color: "#16A34A",
    fontWeight: "900",
  },
  trustTextWrap: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "900",
    marginBottom: 5,
  },
  trustBody: {
    color: theme.colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: theme.space.xl,
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
  secondaryBtn: {
    marginTop: theme.space.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnTxt: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
});
