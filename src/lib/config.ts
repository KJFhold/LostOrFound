// src/lib/config.ts
import { Platform } from "react-native";

/**
 * Backend base URL
 *
 * Viktig om fysisk telefon:
 *  - iOS/Android device kan IKKE nå PC-en din via 127.0.0.1/localhost.
 *  - Bruk PC-ens LAN-IP (f.eks. 192.168.x.x) eller en offentlig URL (https).
 *
 * Anbefalt dev-oppsett:
 *  - Sett EXPO_PUBLIC_API_BASE_URL i .env (f.eks. http://192.168.39.192:4242)
 *
 * Hvis du kjører Android-emulator:
 *  - 10.0.2.2 peker fra emulator -> host-PC
 *  - bruk EXPO_PUBLIC_ANDROID_EMULATOR=1 for å tvinge 10.0.2.2
 */

// 1) Høyest prioritet: eksplisitt satt env
const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// 2) Fallback: bruk din LAN-IP (endre ved behov)
const DEV_LAN_IP = process.env.EXPO_PUBLIC_DEV_LAN_IP ?? "192.168.39.192";
const DEV_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "4242";

// 3) Android emulator override
const ANDROID_EMULATOR = process.env.EXPO_PUBLIC_ANDROID_EMULATOR === "1";

const FALLBACK_BASE = ANDROID_EMULATOR && Platform.OS === "android"
  ? `http://10.0.2.2:${DEV_PORT}`
  : `http://${DEV_LAN_IP}:${DEV_PORT}`;

export const API_BASE_URL = (ENV_BASE && ENV_BASE.trim().length > 0) ? ENV_BASE : FALLBACK_BASE;
