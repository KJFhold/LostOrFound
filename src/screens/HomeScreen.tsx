import { View, Text, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "Home">;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LostOrFound</Text>

      <Pressable
        style={styles.ctaButton}
        onPress={() => navigation.navigate("CreateReport")}
      >
        <Text style={styles.ctaText}>Opprett ny rapport</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20
  },
  ctaButton: {
    backgroundColor: "#0078f2",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  ctaText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600"
  }
});