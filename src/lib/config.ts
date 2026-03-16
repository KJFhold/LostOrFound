// src/lib/config.ts
import { Platform } from "react-native";

export const API_BASE_URL =
  Platform.select({
    android: "http://10.0.2.2:4242", // Android emulator -> PC
    ios: "http://localhost:4242",     // iOS simulator
    default: "http://localhost:4242", // web/dev
  })!;