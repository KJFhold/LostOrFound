// src/lib/revenueCatInit.ts
import { Platform } from "react-native";
import {
  getRevenueCatEnvKeys,
  hasRealRevenueCatKey,
  type RevenueCatEnvKeys,
} from "./revenueCatEnv";

export type RevenueCatPlatform = "ios" | "android";

export type RevenueCatInitConfig = {
  enabled: boolean;
  platform: RevenueCatPlatform;
  apiKey: string;
  appUserId?: string;
};

export type RevenueCatSdkLike = {
  configure?: (options: { apiKey: string; appUserID?: string }) => Promise<unknown> | unknown;
};

export function getRevenueCatPlatform(): RevenueCatPlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function getRevenueCatApiKeys(): RevenueCatEnvKeys {
  return getRevenueCatEnvKeys();
}

export function getRevenueCatApiKey(
  platform: RevenueCatPlatform = getRevenueCatPlatform()
): string {
  const keys = getRevenueCatApiKeys();
  return platform === "ios" ? keys.ios : keys.android;
}

export function buildRevenueCatInitConfig(input?: {
  appUserId?: string;
  platform?: RevenueCatPlatform;
}): RevenueCatInitConfig {
  const platform = input?.platform ?? getRevenueCatPlatform();
  const apiKey = getRevenueCatApiKey(platform);

  return {
    enabled: hasRealRevenueCatKey(apiKey),
    platform,
    apiKey,
    appUserId: input?.appUserId,
  };
}

export function isRevenueCatReady(config?: RevenueCatInitConfig | null): boolean {
  return Boolean(config?.enabled && config.apiKey);
}

export async function configureRevenueCat(
  purchases?: RevenueCatSdkLike | null,
  input?: { appUserId?: string; platform?: RevenueCatPlatform }
): Promise<RevenueCatInitConfig> {
  const config = buildRevenueCatInitConfig(input);

  if (!isRevenueCatReady(config)) {
    return config;
  }

  if (purchases?.configure) {
    await purchases.configure({
      apiKey: config.apiKey,
      appUserID: config.appUserId,
    });
  }

  return config;
}
