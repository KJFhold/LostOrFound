// src/ui/components/AppInput.tsx
import React from "react";
import { View, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { theme } from "../theme";
import { AppText } from "./AppText";

export function AppInput({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginTop: theme.space.md }}>
      {label ? <AppText variant="caption">{label}</AppText> : null}
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        placeholderTextColor={theme.colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: theme.space.sm,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: 12,
    fontSize: theme.type.body,
    color: theme.colors.text,
  },
});
