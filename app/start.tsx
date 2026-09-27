// app/start.tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { theme } from "../src/ui/theme";
import { useAuth } from "../src/contexts/AuthContext";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { AuthHeaderAction } from "../src/ui/AuthHeaderAction";
import { useI18n } from "../src/i18n/I18nProvider";
import { isAnonymousUser } from "../src/lib/authGate";

export default function StartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useI18n();
  const isGuest = isAnonymousUser(user as any);
  const [choice, setChoice] = useState<"LOST" | "FOUND">("LOST");

  const goCreate = () => {
    if (choice === "LOST" && (!user || isGuest)) {
      Alert.alert(
        language === "en" ? "Account required" : "Konto kreves",
        language === "en"
          ? "You need an account to report something you lost. Guests can only report found items."
          : "Du må ha konto for å registrere noe du har mistet. Gjest kan kun registrere funn.",
        [
          { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
          { text: language === "en" ? "Log in / create account" : "Logg inn / opprett konto", onPress: goLogin },
        ]
      );
      return;
    }
    router.push({
      pathname: "/(report)/create-report",
      params: { type: choice },
    });
  };

  const goLogin = () => {
    router.push({
      pathname: "/(auth)/login",
      params: { returnTo: "/start" },
    });
  };

  const goMyReports = () => {
    router.push("/my-reports");
  };
  const goNotifications = () => {
    router.push("/notifications");
  };

  const goBack = () => {
    try {
      router.back();
    } catch {}
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.safe}>
        {user ? (
          <PremiumHeader
            title={language === "en" ? "Report an item" : "Registrer mistet eller funnet"}
            subtitle={language === "en" ? "Choose what best fits the situation" : "Velg hva som passer best for situasjonen"}
            onBack={goBack}
            right={<AuthHeaderAction />}
          />
        ) : null}

        <View style={[styles.container, user ? styles.containerWithHeader : null]}>
          {!user ? (
            <Text style={styles.title}>
              {language === "en" ? "Report an item" : "Registrer mistet eller funnet"}
            </Text>
          ) : null}

          {!user ? (
            <Text style={styles.subtitle}>
              {language === "en" ? "Choose what best fits the situation" : "Velg hva som passer best for situasjonen"}
            </Text>
          ) : null}

          <View style={styles.segmented}>
            <Pressable
              style={[styles.segmentBtn, choice === "LOST" && styles.segmentBtnOn]}
              onPress={() => setChoice("LOST")}
            >
              <Text style={[styles.segmentTxt, choice === "LOST" && styles.segmentTxtOn]}>
                {language === "en" ? "I lost something" : "Jeg har mistet noe"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.segmentBtn, choice === "FOUND" && styles.segmentBtnOn]}
              onPress={() => setChoice("FOUND")}
            >
              <Text style={[styles.segmentTxt, choice === "FOUND" && styles.segmentTxtOn]}>
                {language === "en" ? "I found something" : "Jeg har funnet noe"}
              </Text>
            </Pressable>
          </View>


          {choice === "LOST" && (!user || isGuest) ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>{language === "en" ? "Account required" : "Konto kreves"}</Text>
              <Text style={styles.noticeText}>
                {language === "en"
                  ? "Guests can report found items, but lost reports require a real account."
                  : "Gjest kan registrere funn, men mistet-rapporter krever en ekte konto."}
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.primaryBtn} onPress={goCreate}>
            <Text style={styles.primaryTxt}>{language === "en" ? "Continue" : "Fortsett"}</Text>
          </Pressable>

          {user ? (
            <Pressable style={styles.secondaryBtn} onPress={goMyReports}>
              <Text style={styles.secondaryTxt}>{language === "en" ? "My cases" : "Mine saker"}</Text>
            </Pressable>
          ) : null}          {user ? (
            <Pressable style={styles.secondaryBtn} onPress={goNotifications}>
              <Text style={styles.secondaryTxt}>{t("start.notifications")}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.secondaryBtn} onPress={goLogin}>
              <Text style={styles.secondaryTxt}>{t("common.login")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    padding: theme.space.lg,
  },
  containerWithHeader: {
    paddingTop: theme.space.md,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.muted,
    fontWeight: "600",
  },
  segmented: {
    marginTop: theme.space.lg,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: theme.colors.card,
  },
  segmentBtnOn: {
    backgroundColor: theme.colors.primary,
  },
  segmentTxt: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  segmentTxtOn: {
    color: "#fff",
  },
  noticeBox: {
    marginTop: theme.space.md,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED",
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  noticeTitle: {
    color: "#9A3412",
    fontWeight: "900",
    marginBottom: 4,
  },
  noticeText: {
    color: "#9A3412",
    fontWeight: "700",
    lineHeight: 19,
  },
  primaryBtn: {
    marginTop: theme.space.xl,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    alignItems: "center",
  },
  primaryTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: theme.space.md,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  secondaryTxt: {
    fontWeight: "700",
    color: theme.colors.text,
  },
});
