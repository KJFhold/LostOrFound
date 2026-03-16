import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_51T9RIHCwN6R5FCzMGdSj8uYEcjfM8vV36NbgHxzXJd1KuItZUeZndobRPW4Bfn0sSK6grdR4lrBsNbF7Zkelc7NR00wlTRyi5L">
        <Stack />
      </StripeProvider>
    </SafeAreaProvider>
  );
}