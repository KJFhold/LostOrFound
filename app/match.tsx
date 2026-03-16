import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { API_BASE_URL } from "../src/lib/config";

type Match = {
  id: string;
  score: number;
  status: "NEW" | "SEEN" | "DISMISSED" | "CONFIRMED";
  reasons: string[];
  lost: { title?: string; reward_ore?: number };
  found: { title?: string };
};

export default function MatchScreen() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const fetchMatches = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/matches?reportId=${reportId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);
      setMatches(data.matches || []);
    } catch (e: any) {
      Alert.alert("Feil", e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [reportId]);

  useEffect(() => {
    fetchMatches();
  }, [reportId]);

  const setStatus = async (
    id: string,
    status: "CONFIRMED" | "DISMISSED" | "SEEN"
  ) => {
    try {
      const r = await fetch(`${API_BASE_URL}/matches/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);
      await fetchMatches();
    } catch (e: any) {
      Alert.alert("Feil", e.message);
    }
  };

  const payReward = async (id: string) => {
    try {
      setPayingId(id);
      // 1) Opprett PaymentIntent (finnerlønn + 5% service fee) på server
      const r = await fetch(`${API_BASE_URL}/payments/${id}/create-intent`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || r.statusText);

      const { clientSecret, amount_ore } = data;

      // 2) Init PaymentSheet
      const init = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Repair Lost Or Found",
      });
      if (init.error) throw new Error(init.error.message);

      // 3) Vis PaymentSheet
      const present = await presentPaymentSheet();
      if (present.error) {
        Alert.alert("PaymentSheet", present.error.message);
      } else {
        const kr = (amount_ore / 100).toFixed(2);
        Alert.alert("Suksess", `Betalt totalt ${kr} kr`);
        await fetchMatches();
      }
    } catch (e: any) {
      Alert.alert("Betaling feilet", e.message);
    } finally {
      setPayingId(null);
    }
  };

  if (!reportId) {
    return (
      <View style={styles.center}>
        <Text>Mangler reportId. Gå via opprettelses-skjermen.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Laster matcher…</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      data={matches}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => {
        const rewardOre = Number(item.lost?.reward_ore || 0);
        const feeOre = Math.ceil(rewardOre * 0.05);
        const totalOre = rewardOre + feeOre;

        return (
          <View style={styles.card}>
            <Text style={styles.title}>
              Score: {item.score} • Status: {item.status}
            </Text>
            <Text>Lost: {item.lost?.title || "-"}</Text>
            <Text>Found: {item.found?.title || "-"}</Text>
            {item.reasons?.length ? (
              <Text>Årsaker: {item.reasons.join(", ")}</Text>
            ) : null}

            {rewardOre > 0 && (
              <Text>
                Finnerlønn: {(rewardOre / 100).toFixed(2)} kr  •  Service fee
                5%: {(feeOre / 100).toFixed(2)} kr  → Total:{" "}
                {(totalOre / 100).toFixed(2)} kr
              </Text>
            )}

            <View style={styles.row}>
              <Button
                title="Bekreft"
                onPress={() => setStatus(item.id, "CONFIRMED")}
              />
              <Button
                title="Avvis"
                color="#b00"
                onPress={() => setStatus(item.id, "DISMISSED")}
              />
              {item.status === "CONFIRMED" && rewardOre > 0 && (
                <Button
                  title={payingId === item.id ? "Betaler..." : "Betal finnerlønn"}
                  onPress={() => payReward(item.id)}
                  disabled={payingId === item.id}
                />
              )}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={{ textAlign: "center" }}>Ingen kandidater ennå.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    gap: 6,
  },
  title: { fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
});