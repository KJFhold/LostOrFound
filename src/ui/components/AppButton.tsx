// src/ui/components/AppButton.tsx
import React from "react";
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

type Variant = "primary" | "ghost" | "danger";

export function AppButton({
  title,
  variant = "primary",
  ...props
}: PressableProps & { title: string; variant?: Variant }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && { opacity: 0.85 },
        (props.style as any),
      ]}
    >
      <AppText
        variant="body"
        style={[
          styles.txt,
          variant === "ghost" && { color: theme.colors.text },
          variant === "danger" && { color: "#fff" },
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: theme.colors.primary },
  ghost: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
  txt: { color: "#fff", fontWeight: "800" },
});
