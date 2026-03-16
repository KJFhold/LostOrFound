import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_...">
        <Stack />
      </StripeProvider>
    </SafeAreaProvider>
  );
}