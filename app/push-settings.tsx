import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import { registerPushInstallation, sendPushTest, unregisterPushInstallation } from "../src/lib/pushNotifications";

export default function PushSettingsScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const run = async (fn: () => Promise<any>, success: string) => {
    try { setBusy(true); await fn(); Alert.alert(t("pushSettings.done"), success); }
    catch (e: any) { Alert.alert(t("pushSettings.could.not.complete"), e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.safe}>
      <PremiumHeader title={t("pushSettings.push.notifications")} onBack={() => router.back()} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("pushSettings.receive.important.updates")}</Text>
          <Text style={styles.body}>{t("pushSettings.enable.push.notifications.for.matches.messages.and.futu")}</Text>
          <Pressable disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => run(async () => { await registerPushInstallation(language); setEnabled(true); }, t("pushSettings.push.notifications.are.enabled"))}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t("pushSettings.enable.push.notifications")}</Text>}
          </Pressable>
          <Pressable disabled={busy || !enabled} style={[styles.secondary, (!enabled || busy) && styles.disabled]} onPress={() => run(sendPushTest, t("pushSettings.a.test.notification.was.sent"))}>
            <Text style={styles.secondaryText}>{t("pushSettings.send.test.notification")}</Text>
          </Pressable>
          <Pressable disabled={busy} style={styles.textButton} onPress={() => run(async () => { await unregisterPushInstallation(); setEnabled(false); }, t("pushSettings.push.notifications.were.disabled.for.this.installation"))}>
            <Text style={styles.textButtonText}>{t("pushSettings.disable.on.this.device")}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{t("pushSettings.area.alerts.are.not.active.yet.this.step.only.establish")}</Text>
      </View>
    </View>
  </>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},container:{padding:18},card:{backgroundColor:theme.colors.card,borderWidth:1,borderColor:theme.colors.border,borderRadius:18,padding:18,...theme.shadow.card},title:{fontSize:18,fontWeight:"900",color:theme.colors.text},body:{marginTop:8,color:theme.colors.muted,fontWeight:"700",lineHeight:20},primary:{marginTop:18,minHeight:48,borderRadius:13,backgroundColor:theme.colors.primary,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"900"},secondary:{marginTop:10,minHeight:48,borderRadius:13,borderWidth:1,borderColor:theme.colors.border,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.card},secondaryText:{color:theme.colors.text,fontWeight:"900"},textButton:{marginTop:12,paddingVertical:10,alignItems:"center"},textButtonText:{color:theme.colors.danger,fontWeight:"900"},disabled:{opacity:.45},note:{marginTop:14,color:theme.colors.muted,fontWeight:"700",fontSize:12,lineHeight:17}
});
