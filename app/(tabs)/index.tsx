import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function HomeTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.text}>Velkommen! Herfra kan du teste betaling.</Text>

      <Link href="/payment" style={styles.link}>
        Gå til betaling
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: "600" },
  text: { fontSize: 16 },
  link: { fontSize: 18, color: "#1e90ff", marginTop: 12 },
});