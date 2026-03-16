import { SafeAreaView, ScrollView, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";
import Card from "../components/Card";

export default function MyReports() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.h1}>Mine rapporter</Text>
        <Card>
          <Text style={{ color: colors.textMuted }}>
            Ingen rapporter enda. Når du sender inn “Mistet” eller “Funnet” vil de dukke opp her.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 16 },
});