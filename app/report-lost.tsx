import { useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import { colors } from "../constants/colors";
import { useRouter } from "expo-router";

export default function ReportLost() {
  const [title, setTitle] = useState("");
  const [where, setWhere] = useState("");
  const [details, setDetails] = useState("");
  const router = useRouter();

  function submit() {
    if (!title.trim()) {
      Alert.alert("Manglende tittel", "Hva mistet du?");
      return;
    }

    // TODO: Send til backend senere
    Alert.alert("Sendt", "Takk! Rapporten er lagret lokalt (MVP).");
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.h1}>Rapporter mistet gjenstand</Text>

        <Text style={styles.label}>Hva mistet du?</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="F.eks. svart lommebok"
          style={styles.input}
          placeholderTextColor="#9AA4B2"
        />

        <Text style={styles.label}>Hvor mistet du det?</Text>
        <TextInput
          value={where}
          onChangeText={setWhere}
          placeholder="Adresse/område (valgfritt)"
          style={styles.input}
          placeholderTextColor="#9AA4B2"
        />

        <Text style={styles.label}>Detaljer</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Beskriv særtrekk, tidspunkt, osv."
          style={[styles.input, { height: 110, textAlignVertical: "top" }]}
          multiline
          placeholderTextColor="#9AA4B2"
        />

        <View style={{ height: 16 }} />
        <Button
          label="Send rapport"
          onPress={submit}
          accessibilityLabel="Send rapport for mistet gjenstand"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 8,
    color: colors.text,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: "#fff",
  },
});