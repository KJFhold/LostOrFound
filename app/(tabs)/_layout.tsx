// app/(tabs)/_layout.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../src/i18n/I18nProvider";
import { theme } from "../../src/ui/theme";

export default function TabsLayout() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: t("tabs.cases"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "folder-open" : "folder-open-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/start");
          },
        }}
        options={{
          title: t("tabs.report"),
          tabBarIcon: () => (
            <View style={styles.reportButton}>
              <Ionicons name="add" color="#FFFFFF" size={30} />
            </View>
          ),
          tabBarLabelStyle: [styles.label, styles.reportLabel],
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t("tabs.matches"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 76,
    paddingTop: 7,
    paddingBottom: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  label: { fontSize: 11, fontWeight: "800" },
  reportLabel: { marginTop: 5 },
  reportButton: {
    width: 54,
    height: 54,
    marginTop: -23,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderWidth: 4,
    borderColor: theme.colors.card,
    ...theme.shadow.card,
  },
});
