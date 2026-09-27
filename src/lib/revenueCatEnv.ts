// src/lib/revenueCatEnv.ts
import Constants from "expo-constants";

export type RevenueCatEnvKeys = {
  ios: string;
  android: string;
};

const FALLBACK_KEYS: RevenueCatEnvKeys = {
  ios: "REVENUECAT_PUBLIC_IOS_API_KEY",
  android: "REVENUECAT_PUBLIC_ANDROID_API_KEY",
};

// Expo inlines EXPO_PUBLIC_* values best when accessed with direct dot notation.
const IOS_FROM_PROCESS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_FROM_PROCESS = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

function normalizeEnvValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readFromExpoConfig(name: "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY" | "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"): string {
  const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const easConfig = ((Constants as any)?.easConfig ?? {}) as Record<string, unknown>;

  return (
    normalizeEnvValue(expoExtra[name]) ||
    normalizeEnvValue(easConfig[name]) ||
    ""
  );
}

export function getRevenueCatEnvKeys(): RevenueCatEnvKeys {
  const ios =
    normalizeEnvValue(IOS_FROM_PROCESS) ||
    readFromExpoConfig("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY") ||
    FALLBACK_KEYS.ios;

  const android =
    normalizeEnvValue(ANDROID_FROM_PROCESS) ||
    readFromExpoConfig("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY") ||
    FALLBACK_KEYS.android;

  return { ios, android };
}

export function hasRealRevenueCatKey(value?: string | null): boolean {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return false;
  if (normalized.startsWith("REVENUECAT_PUBLIC_")) return false;
  return true;
}
