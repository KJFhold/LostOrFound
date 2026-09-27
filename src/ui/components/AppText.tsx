// src/ui/components/AppText.tsx
import React from "react";
import { Text, StyleSheet, type TextProps } from "react-native";
import { theme } from "../theme";

type Variant = "h1" | "h2" | "body" | "caption" | "muted";

export function AppText({ style, children, ...props }: TextProps & { variant?: Variant }) {
  const variant = (props as any).variant as Variant | undefined;
  return (
    <Text {...props} style={[styles.base, variant && styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: theme.colors.text },
  h1: { fontSize: theme.type.h1, fontWeight: "800" },
  h2: { fontSize: theme.type.h2, fontWeight: "800" },
  body: { fontSize: theme.type.body, fontWeight: "500" },
  caption: { fontSize: theme.type.caption, fontWeight: "600" },
  muted: { fontSize: theme.type.caption, fontWeight: "600", color: theme.colors.muted },
});
