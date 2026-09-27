// src/ui/components/AppCard.tsx
import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { theme } from "../theme";

export function AppCard({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    marginTop: theme.space.md,
    ...theme.shadow.card,
  },
});
``
