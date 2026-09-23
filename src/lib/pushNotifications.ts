import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { supabase } from "./supabase";
import { API_BASE_URL } from "./config";

const INSTALLATION_KEY = "@lostfound:pushInstallationId:v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const makeId = () => `install-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export async function getPushInstallationId() {
  const current = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (current) return current;
  const next = makeId();
  await AsyncStorage.setItem(INSTALLATION_KEY, next);
  return next;
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("LOGIN_REQUIRED");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function registerPushInstallation(language: "no" | "en") {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") throw new Error("PUSH_PERMISSION_NOT_GRANTED");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS_PROJECT_ID_MISSING");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const installationId = await getPushInstallationId();
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/push/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      installationId,
      expoPushToken: token,
      platform: Platform.OS,
      language,
      permissionStatus: status,
      appVersion: Constants.expoConfig?.version ?? null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error ?? "PUSH_REGISTER_FAILED");
  return { token, installationId, installation: data.installation };
}

export async function unregisterPushInstallation() {
  const installationId = await getPushInstallationId();
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/push/unregister`, {
    method: "POST", headers, body: JSON.stringify({ installationId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error ?? "PUSH_UNREGISTER_FAILED");
  return data;
}

export async function sendPushTest() {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/push/test`, { method: "POST", headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error ?? "PUSH_TEST_FAILED");
  return data;
}

function navigateFromData(router: ReturnType<typeof useRouter>, data: any) {
  const kind = String(data?.targetKind ?? "");
  const id = String(data?.targetId ?? "");
  if (kind === "chat" && id) return router.push(`/chat/${id}`);
  if (kind === "match" && id) return router.push(`/matches/${id}`);
  if (kind === "report" && id) return router.push({ pathname: "/my-reports", params: { section: data?.section ?? "active", reportId: id } });
  router.push("/notifications");
}

export function usePushNotificationNavigation() {
  const router = useRouter();
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      navigateFromData(router, response.notification.request.content.data);
    });
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) navigateFromData(router, response.notification.request.content.data);
    }).catch(() => {});
    return () => subscription.remove();
  }, [router]);
}
