// app/(tabs)/matches.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../src/i18n/I18nProvider";
import { theme } from "../../src/ui/theme";

export default function MatchesTab() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{t("matchesHub.title")}</Text>
        <Text style={styles.body}>{t("matchesHub.body")}</Text>
        <Pressable style={styles.primary} onPress={() => router.push("/my-reports")}>
          <Text style={styles.primaryText}>{t("matchesHub.cta")}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/notifications")}>
          <Text style={styles.secondaryText}>{t("matchesHub.notifications")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2FF", marginBottom: 18 },
  title: { color: theme.colors.text, fontWeight: "900", fontSize: 25, textAlign: "center" },
  body: { marginTop: 10, color: theme.colors.muted, fontWeight: "700", lineHeight: 21, textAlign: "center" },
  primary: { width: "100%", marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  secondary: { width: "100%", marginTop: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  secondaryText: { color: theme.colors.text, fontWeight: "900" },
});
