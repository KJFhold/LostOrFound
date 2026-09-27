// src/ui/ScreenHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "./theme";

export function ScreenHeader(props: { title: string; subtitle?: string }) {
  const { title, subtitle } = props;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.muted,
    fontWeight: "700",
  },
});
