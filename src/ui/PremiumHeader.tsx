import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function PremiumHeader({ title, subtitle, onBack, right }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* NB: IKKE bruk insets.top her – SafeAreaView håndterer top-inset */}
      <View style={[styles.wrap, { paddingTop: 0 }]}>
        <View style={styles.row}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
              <Text style={styles.backTxt}>←</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          <View style={styles.textCol}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          <View style={styles.right}>{right}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.bg },
  wrap: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backSpacer: { width: 40, height: 40 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backTxt: { fontWeight: "900", color: theme.colors.text, fontSize: 18 },
  textCol: { flex: 1 },
  title: { fontSize: 22, fontWeight: "900", color: theme.colors.text },
  subtitle: { marginTop: 2, color: theme.colors.muted, fontWeight: "700" },
  right: { minWidth: 70, alignItems: "flex-end" },
});