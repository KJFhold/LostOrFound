// src/lib/config.ts

// Brukes sammen med: adb reverse tcp:4242 tcp:4242
export const API_BASE_URL = "http://127.0.0.1:4242";

// Valgfritt: logg i dev for å verifisere at riktig base-URL brukes
if (__DEV__) {
  // Denne vises i Metro/console ved app-start
  // Forventer: "API_BASE_URL: http://127.0.0.1:4242"
  // Husk: kjør `adb reverse tcp:4242 tcp:4242`
  console.log("API_BASE_URL:", API_BASE_URL);
}

// Valgfritt: liten helper for å lage URL-er
export const api = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;