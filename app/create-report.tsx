import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../src/lib/config";

type ReportType = "LOST" | "FOUND";

export default function CreateReportScreen() {
  // Les inn eventuelle lat/lng fra /map (eks: /create-report?lat=...&lng=...)
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  // Skjema-state
  const [type, setType] = useState<ReportType>("LOST");
  const [category, setCategory] = useState("PHONE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");

  // Oslo default for enkel testing – overstyres når vi kommer tilbake fra kart
  const [lat, setLat] = useState("59.9139");
  const [lng, setLng] = useState("10.7522");

  // Kun for LOST
  const [rewardNOK, setRewardNOK] = useState("199");

  const [saving, setSaving] = useState(false);

  // Når vi navigerer tilbake fra /map med lat/lng i URL, oppdater feltene
  useEffect(() => {
    if (typeof params.lat === "string" && params.lat.trim().length > 0) {
      setLat(params.lat);
    }
    if (typeof params.lng === "string" && params.lng.trim().length > 0) {
      setLng(params.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lat, params.lng]);

  const validate = () => {
    if (!title.trim()) {
      Alert.alert("Mangler tittel", "Skriv en kort tittel (f.eks. 'iPhone 13 blå…').");
      return false;
    }
    if (!category.trim()) {
      Alert.alert("Mangler kategori", "Skriv f.eks. PHONE, WALLET, KEYS, BAG, OTHER.");
      return false;
    }
    if (!lat.trim() || !lng.trim() || isNaN(Number(lat)) || isNaN(Number(lng))) {
      Alert.alert("Ugyldig posisjon", "Sjekk at lat/lng er gyldige tall.");
      return false;
    }
    if (type === "LOST") {
      const n = Number(rewardNOK);
      if (isNaN(n) || n < 0) {
        Alert.alert("Ugyldig finnerlønn", "Oppgi et tall i NOK (kan være 0).");
        return false;
      }
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const body: any = {
        type,
        category: category.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim() || undefined,
        color: color.trim() || undefined,
        brand: brand.trim() || undefined,
        occurred_at: new Date().toISOString(),
        location: { lat: Number(lat), lng: Number(lng) },
      };

      if (type === "LOST") {
        const reward = Math.max(0, Math.round(Number(rewardNOK) * 100)); // i øre
        body.reward_ore = reward;
      }

      const r = await fetch(`${API_BASE_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);

      const reportId = data?.report?.id;
      const count = data?.candidates?.length ?? 0;

      Alert.alert("Lagret", `Rapport opprettet (${type}). Foreslåtte matcher: ${count}`, [
        {
          text: "Se matcher",
          onPress: () =>
            router.push({
              pathname: "/match",
              params: { reportId },
            }),
        },
        { text: "OK" },
      ]);
    } catch (e: any) {
      console.error("Create report error:", e);
      Alert.alert("Feil", e.message ?? "Kunne ikke opprette rapport.");
    } finally {
      setSaving(false);
    }
  };

  const setLost = () => setType("LOST");
  const setFound = () => setType("FOUND");

  const openMap = () => {
    // Åpne kartet slik at bruker kan velge posisjon.
    router.push("/map");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Ny rapport</Text>

        {/* Velg type */}
        <View style={styles.row}>
          <Button title={type === "LOST" ? "Mistet ✓" : "Mistet"} onPress={setLost} />
          <View style={{ width: 8 }} />
          <Button title={type === "FOUND" ? "Funnet ✓" : "Funnet"} onPress={setFound} />
        </View>

        {/* Kategori */}
        <Text style={styles.label}>Kategori (PHONE/WALLET/KEYS/BAG/OTHER)</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          autoCapitalize="characters"
          placeholder="PHONE"
        />

        {/* Tittel */}
        <Text style={styles.label}>Tittel</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={type === "LOST" ? "iPhone 13 blå, deksel" : "Fant iPhone ved Majorstuen"}
        />

        {/* Beskrivelse */}
        <Text style={styles.label}>Beskrivelse (valgfritt)</Text>
        <TextInput
          style={[styles.input, { height: 90 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Mer detaljer…"
          multiline
        />

        {/* Farge / Merke (valgfritt) */}
        <Text style={styles.label}>Farge (valgfritt)</Text>
        <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="blue" />

        <Text style={styles.label}>Merke (valgfritt)</Text>
        <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Apple" />

        {/* Posisjon */}
        <Text style={styles.section}>Posisjon (for match / avstand)</Text>

        <View style={[styles.row, { alignItems: "flex-end" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.labelSmall}>Lat</Text>
            <TextInput
              style={styles.input}
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
              placeholder="59.9139"
            />
          </View>

          <View style={{ width: 12 }} />

          <View style={{ flex: 1 }}>
            <Text style={styles.labelSmall}>Lng</Text>
            <TextInput
              style={styles.input}
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
              placeholder="10.7522"
            />
          </View>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.pickBtn} onPress={openMap}>
            <Text style={styles.pickBtnText}>Velg på kart</Text>
          </Pressable>
        </View>

        {/* Finnerlønn kun for LOST */}
        {type === "LOST" && (
          <>
            <Text style={styles.section}>Finnerlønn</Text>
            <Text style={styles.help}>
              Oppgi i NOK (f.eks. 199). 5% service fee legges til ved betaling.
            </Text>
            <TextInput
              style={styles.input}
              value={rewardNOK}
              onChangeText={setRewardNOK}
              keyboardType="numeric"
              placeholder="199"
            />
          </>
        )}

        <View style={{ height: 12 }} />

        <Button title={saving ? "Lagrer..." : "Lagre"} onPress={onSubmit} disabled={saving} />

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  h1: { fontSize: 22, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  section: { marginTop: 8, fontSize: 16, fontWeight: "600" },
  help: { color: "#666", marginBottom: 4 },
  label: { fontWeight: "500" },
  labelSmall: { fontWeight: "500", fontSize: 12, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  pickBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pickBtnText: { color: "#fff", fontWeight: "700" },
});