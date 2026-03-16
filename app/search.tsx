import { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, StyleSheet } from "react-native";
import { colors } from "../constants/colors";
import Button from "../components/Button";

export default function Search() {
  const [q, setQ] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.h1}>Søk</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Søk etter gjenstand, sted eller dato"
          style={styles.input}
          placeholderTextColor="#9AA4B2"
        />
        <View style={{ height: 16 }} />
        <Button label="Søk" onPress={() => { /* TODO: implementer senere */ }} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: "#fff",
  },
});