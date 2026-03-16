import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function HomePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LostOrFound</Text>

      <Link href="/create-report" asChild>
        <Pressable style={styles.ctaButton}>
          <Text style={styles.ctaText}>Opprett ny rapport</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: "#0078f2",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  ctaText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});