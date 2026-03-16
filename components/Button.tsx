import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors } from "../constants/colors";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function Button({ label, onPress, variant = "primary", style, accessibilityLabel }: Props) {
  const isOutline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.primary,
        pressed && { opacity: 0.9 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.text, isOutline && styles.textOutline]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  textOutline: {
    color: colors.text,
  },
});