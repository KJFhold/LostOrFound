import { useEffect } from "react";
import { LogBox } from "react-native";
import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Viktig: hent base-URL ett sted som alltid lastes
import { API_BASE_URL } from "../src/lib/config";

export default function RootLayout() {
  // Logg base-URL én gang på app-start (vises i Metro-konsollen)
  useEffect(() => {
    if (__DEV__) {
      console.log("API_BASE_URL brukt i appen:", API_BASE_URL);
    }
  }, []);

  // Demp ufarlig dev-warning fra Stripe i Android/Expo
  if (__DEV__) {
    LogBox.ignoreLogs(["No task registered for key StripeKeepJsAwakeTask"]);
  }

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey="pk_test_51T9RIHCwN6R5FCzMGdSj8uYEcjfM8vV36NbgHxzXJd1KuItZUeZndobRPW4Bfn0sSK6grdR4lrBsNbF7Zkelc7NR00wlTRyi5L"
        // Disse to er trygge i dev (matcher app.json)
        urlScheme="lostorfound"
        merchantIdentifier="merchant.com.anonymous.repairlostorfound"
      >
        <Stack />
      </StripeProvider>
    </SafeAreaProvider>
  );
}