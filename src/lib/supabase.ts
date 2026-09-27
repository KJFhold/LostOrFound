// src/lib/supabase.ts
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseKey = supabaseAnonKey || supabasePublishableKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

const GLOBAL_APPSTATE_LISTENER_KEY = "__lostOrFoundSupabaseAppStateListenerRegistered";

type GlobalWithSupabaseListener = typeof globalThis & {
  [GLOBAL_APPSTATE_LISTENER_KEY]?: boolean;
};

const globalState = globalThis as GlobalWithSupabaseListener;

if (Platform.OS !== "web" && !globalState[GLOBAL_APPSTATE_LISTENER_KEY]) {
  globalState[GLOBAL_APPSTATE_LISTENER_KEY] = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === "active") {
    void supabase.auth.startAutoRefresh();
  }
}
