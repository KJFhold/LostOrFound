// app/(tabs)/index.tsx
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/contexts/AuthContext";
import { useI18n } from "../../src/i18n/I18nProvider";
import { isAnonymousUser } from "../../src/lib/authGate";
import { AuthHeaderAction } from "../../src/ui/AuthHeaderAction";
import { theme } from "../../src/ui/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const isGuest = isAnonymousUser(user as any);

  const openLost = () => {
    if (!user || isGuest) {
      router.push({
        pathname: "/(auth)/login",
        params: { returnTo: "/start", reason: "lost" },
      });
      return;
    }

    router.push({
      pathname: "/(report)/create-report",
      params: { type: "LOST" },
    });
  };

  const openFound = () => {
    router.push({
      pathname: "/(report)/create-report",
      params: { type: "FOUND" },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.brand}>Lost or Found</Text>
              <Text style={styles.greeting}>{t("dashboard.greeting")}</Text>
            </View>
          </View>
          <AuthHeaderAction />
        </View>

        {isGuest && (
          <View style={styles.guestCard}>
            <Ionicons name="information-circle-outline" size={22} color="#9A3412" />
            <Text style={styles.guestText}>{t("dashboard.guestNotice")}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("dashboard.whatToDo")}</Text>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.lostCard, pressed && styles.pressed]}
            onPress={openLost}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.lostCta")}
          >
            <View style={[styles.iconCircle, styles.lostIcon]}>
              <Ionicons name="search-outline" size={28} color="#B45309" />
            </View>
            <Text style={styles.actionTitle}>{t("dashboard.lostTitle")}</Text>
            <Text style={styles.actionBody}>{t("dashboard.lostBody")}</Text>
            <Text style={styles.actionLink}>{t("dashboard.lostCta")}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.foundCard, pressed && styles.pressed]}
            onPress={openFound}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.foundCta")}
          >
            <View style={[styles.iconCircle, styles.foundIcon]}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#15803D" />
            </View>
            <Text style={styles.actionTitle}>{t("dashboard.foundTitle")}</Text>
            <Text style={styles.actionBody}>{t("dashboard.foundBody")}</Text>
            <Text style={styles.actionLink}>{t("dashboard.foundCta")}</Text>
          </Pressable>
        </View>

        <View style={styles.quickCard}>
          <View style={styles.quickHeader}>
            <Text style={styles.sectionTitleNoMargin}>{t("dashboard.quickTitle")}</Text>
          </View>

          <Pressable style={styles.quickItem} onPress={() => router.push("/my-reports")}>
            <Ionicons name="folder-open-outline" size={24} color={theme.colors.primary} />
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>{t("dashboard.casesTitle")}</Text>
              <Text style={styles.quickBody}>{t("dashboard.casesBody")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.quickItem} onPress={() => router.push("/notifications")}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>{t("dashboard.notificationsTitle")}</Text>
              <Text style={styles.quickBody}>{t("dashboard.notificationsBody")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.quickItem} onPress={() => router.push("/how")}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>{t("dashboard.howTitle")}</Text>
              <Text style={styles.quickBody}>{t("dashboard.howBody")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.safety}>{t("dashboard.safety")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.space.lg,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 13,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 20,
  },
  greeting: {
    marginTop: 2,
    color: theme.colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  guestCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  guestText: {
    flex: 1,
    marginLeft: 9,
    color: "#9A3412",
    fontWeight: "700",
    lineHeight: 19,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  sectionTitleNoMargin: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: -5,
  },
  actionCard: {
    flex: 1,
    minHeight: 210,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  lostCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  foundCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  lostIcon: {
    backgroundColor: "#FEF3C7",
  },
  foundIcon: {
    backgroundColor: "#DCFCE7",
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  actionBody: {
    flex: 1,
    marginTop: 7,
    color: theme.colors.muted,
    lineHeight: 19,
    fontWeight: "600",
  },
  actionLink: {
    marginTop: 12,
    color: theme.colors.primary,
    fontWeight: "900",
  },
  quickCard: {
    marginTop: 24,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadow.card,
  },
  quickHeader: {
    marginBottom: 6,
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },
  quickText: {
    flex: 1,
    marginHorizontal: 12,
  },
  quickTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  quickBody: {
    marginTop: 3,
    color: theme.colors.muted,
    fontWeight: "600",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 36,
  },
  safety: {
    marginTop: 20,
    paddingHorizontal: 12,
    color: theme.colors.muted,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
