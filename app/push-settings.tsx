import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import {
  getPushPermissionState,
  openPushNotificationSettings,
  registerPushInstallation,
  sendPushTest,
  unregisterPushInstallation,
  type PushPermissionState,
} from "../src/lib/pushNotifications";

export default function PushSettingsScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>("undetermined");

  const refresh = useCallback(async () => {
    try {
      setPermission(await getPushPermissionState());
    } catch {
      setPermission("undetermined");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => listener.remove();
  }, [refresh]);

  const enable = async () => {
    try {
      setBusy(true);
      if (permission === "denied") {
        Alert.alert(t("pushSettings.permissionDeniedTitle"), t("pushSettings.permissionDeniedBody"), [
          { text: t("pushSettings.cancel"), style: "cancel" },
          { text: t("pushSettings.openSettings"), onPress: () => void openPushNotificationSettings() },
        ]);
        return;
      }
      await registerPushInstallation(language);
      setPermission("granted");
      Alert.alert(t("pushSettings.done"), t("pushSettings.push.notifications.are.enabled"));
    } catch (error: any) {
      await refresh();
      Alert.alert(t("pushSettings.could.not.complete"), error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    try {
      setBusy(true);
      await unregisterPushInstallation();
      Alert.alert(t("pushSettings.done"), t("pushSettings.push.notifications.were.disabled.for.this.installation"));
    } catch (error: any) {
      Alert.alert(t("pushSettings.could.not.complete"), error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    try {
      setBusy(true);
      await sendPushTest();
      Alert.alert(t("pushSettings.done"), t("pushSettings.a.test.notification.was.sent"));
    } catch (error: any) {
      Alert.alert(t("pushSettings.could.not.complete"), error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  const statusKey = permission === "granted" ? "pushSettings.statusEnabled" : permission === "denied" ? "pushSettings.statusBlocked" : "pushSettings.statusNotEnabled";
  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.safe}>
      <PremiumHeader title={t("pushSettings.push.notifications")} onBack={() => router.back()} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("pushSettings.receive.important.updates")}</Text>
          <Text style={styles.body}>{t("pushSettings.permissionIntro")}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t("pushSettings.statusLabel")}</Text>
            <Text style={[styles.statusValue, permission === "granted" && styles.statusEnabled]}>{t(statusKey as any)}</Text>
          </View>
          {permission !== "granted" && <Pressable disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void enable()}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{permission === "denied" ? t("pushSettings.openSettings") : t("pushSettings.enable.push.notifications")}</Text>}
          </Pressable>}
          {permission === "granted" && <Pressable disabled={busy} style={[styles.secondary, busy && styles.disabled]} onPress={() => void test()}>
            <Text style={styles.secondaryText}>{t("pushSettings.send.test.notification")}</Text>
          </Pressable>}
          <Pressable disabled={busy} style={styles.textButton} onPress={() => void disable()}>
            <Text style={styles.textButtonText}>{t("pushSettings.disable.on.this.device")}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{t("pushSettings.permissionNote")}</Text>
      </View>
    </View>
  </>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},container:{padding:18},card:{backgroundColor:theme.colors.card,borderWidth:1,borderColor:theme.colors.border,borderRadius:18,padding:18,...theme.shadow.card},title:{fontSize:18,fontWeight:"900",color:theme.colors.text},body:{marginTop:8,color:theme.colors.muted,fontWeight:"700",lineHeight:20},statusRow:{marginTop:18,padding:13,borderRadius:12,backgroundColor:"#F8FAFC",flexDirection:"row",justifyContent:"space-between",gap:12},statusLabel:{color:theme.colors.muted,fontWeight:"800"},statusValue:{color:theme.colors.danger,fontWeight:"900"},statusEnabled:{color:"#15803D"},primary:{marginTop:18,minHeight:48,borderRadius:13,backgroundColor:theme.colors.primary,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"900"},secondary:{marginTop:10,minHeight:48,borderRadius:13,borderWidth:1,borderColor:theme.colors.border,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.card},secondaryText:{color:theme.colors.text,fontWeight:"900"},textButton:{marginTop:12,paddingVertical:10,alignItems:"center"},textButtonText:{color:theme.colors.danger,fontWeight:"900"},disabled:{opacity:.45},note:{marginTop:14,color:theme.colors.muted,fontWeight:"700",fontSize:12,lineHeight:17}
});
