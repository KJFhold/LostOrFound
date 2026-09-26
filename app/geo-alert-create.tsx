import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import { previewGeoAlert, type GeoAlertPreviewResult } from "../src/lib/geoAlertPreview";
import { activateTestReportOrder, createReportOrder } from "../src/lib/reportCommerce";

const RADII = [250, 500, 1000, 1500, 3000, 5000, 10000];
const DURATION_HOURS = 168;
const REMINDER_COUNT = 0;

function createClientRequestId(reportId: string) {
  return `geo-alert-${reportId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function GeoAlertCreateScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const requestIdRef = useRef<string | null>(null);
  const { language } = useI18n();
  const params = useLocalSearchParams<{ reportId?: string; title?: string; lat?: string; lng?: string }>();
  const reportId = String(params.reportId || "").trim();
  const latitude = Number(params.lat);
  const longitude = Number(params.lng);
  const [radiusM, setRadiusM] = useState(1500);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<GeoAlertPreviewResult | null>(null);
  const [activatedUntil, setActivatedUntil] = useState<string | null>(null);
  const validLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);
  const region = useMemo<Region>(() => ({ latitude, longitude, latitudeDelta: 0.09, longitudeDelta: 0.09 }), [latitude, longitude]);

  useEffect(() => {
    if (!validLocation) Alert.alert(
      language === "en" ? "Location missing" : "Sted mangler",
      language === "en" ? "The report needs a valid location before a geo alert can be previewed." : "Rapporten må ha et gyldig sted før geovarselet kan forhåndsvises."
    );
  }, [validLocation, language]);

  useEffect(() => {
    setResult(null);
    setActivatedUntil(null);
    requestIdRef.current = null;
    if (validLocation) {
      const delta = Math.max(0.015, Math.min(1.2, radiusM / 18000));
      mapRef.current?.animateToRegion({ ...center, latitudeDelta: delta, longitudeDelta: delta }, 200);
    }
  }, [radiusM, validLocation, center]);

  const calculate = async () => {
    if (!reportId || !validLocation) return;
    try {
      setBusy(true);
      const next = await previewGeoAlert({
        reportId,
        radiusM,
        durationHours: DURATION_HOURS,
        reminderCount: REMINDER_COUNT,
        populationDensityBand: "LOW",
      });
      setResult(next);
      requestIdRef.current = createClientRequestId(reportId);
    } catch (e: any) {
      Alert.alert(language === "en" ? "Could not calculate" : "Kunne ikke beregne", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const createAndActivate = async () => {
    if (!result || !reportId || activating) return;
    try {
      setActivating(true);
      const clientRequestId = requestIdRef.current || createClientRequestId(reportId);
      requestIdRef.current = clientRequestId;
      const created = await createReportOrder({
        reportId,
        productCode: "GEO_ALERT",
        clientRequestId,
        platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
        provider: "TEST",
        geoAlert: {
          radiusM: result.preview.radiusM,
          areaSqKm: result.preview.areaSqKm,
          populationDensityBand: result.preview.populationDensityBand,
          estimatedEligibleUsers: result.preview.eligibleUsers,
          estimatedEligibleInstallations: result.preview.eligibleInstallations,
          durationHours: DURATION_HOURS,
          reminderCount: REMINDER_COUNT,
        },
      });
      const activated = await activateTestReportOrder(created.order.id);
      setActivatedUntil(String(activated.entitlement?.current_period_end || ""));
      Alert.alert(
        language === "en" ? "Geo alert created" : "Geovarsel opprettet",
        language === "en" ? "The test order and seven-day campaign were activated. No real payment was made." : "Testordren og kampanjen på syv dager er aktivert. Ingen ekte betaling er gjennomført."
      );
    } catch (e: any) {
      Alert.alert(language === "en" ? "Could not create geo alert" : "Kunne ikke opprette geovarsel", e?.message || String(e));
    } finally {
      setActivating(false);
    }
  };

  if (!validLocation) {
    return <View style={styles.safe}><PremiumHeader title={language === "en" ? "Geo alert" : "Geovarsel"} onBack={() => router.back()} /><View style={styles.center}><Text style={styles.muted}>{language === "en" ? "The report has no usable coordinates." : "Rapporten har ingen brukbare koordinater."}</Text></View></View>;
  }

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.safe}>
      <PremiumHeader title={language === "en" ? "Create geo alert" : "Opprett geovarsel"} subtitle={String(params.title || "")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapFrame}>
          <MapView ref={mapRef} provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} style={styles.map} initialRegion={region} scrollEnabled zoomEnabled>
            <Marker coordinate={center} />
            <Circle center={center} radius={radiusM} strokeColor="#2563EB" strokeWidth={3} fillColor="rgba(37,99,235,.16)" />
          </MapView>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>{language === "en" ? "Coverage" : "Dekningsområde"}</Text>
          <View style={styles.chips}>{RADII.map(v => <Chip key={v} active={radiusM === v} label={v >= 1000 ? `${v / 1000} km` : `${v} m`} onPress={() => setRadiusM(v)} />)}</View>
          <Text style={styles.help}>{language === "en" ? "The blue circle is centered on the report location." : "Den blå sirkelen er sentrert på rapportens sted."}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>{language === "en" ? "Campaign" : "Kampanje"}</Text>
          <Text style={styles.ruleTitle}>{language === "en" ? "One notification · Active for 7 days" : "Ett varsel · Aktiv i 7 dager"}</Text>
          <Text style={styles.help}>{language === "en" ? "The notification is sent once. Recipients can find the alert again in the app while the campaign is active." : "Varslet sendes én gang. Mottakerne kan finne etterlysningen igjen i appen mens kampanjen er aktiv."}</Text>
        </View>

        <Pressable disabled={busy || activating} style={[styles.primary, (busy || activating) && styles.disabled]} onPress={calculate}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{language === "en" ? "Calculate reach and price" : "Beregn rekkevidde og pris"}</Text>}
        </Pressable>

        {result && <View style={styles.result}>
          <Text style={styles.resultEyebrow}>{language === "en" ? "CURRENT ESTIMATE" : "AKTUELT ESTIMAT"}</Text>
          <Text style={styles.resultTitle}>{result.preview.eligibleUsers} {language === "en" ? "qualified users" : "kvalifiserte brukere"}</Text>
          <Text style={styles.resultMeta}>{result.preview.eligibleInstallations} {language === "en" ? "active installations" : "aktive installasjoner"} · {result.preview.areaSqKm.toFixed(2)} km²</Text>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{language === "en" ? "Test price" : "Testpris"}</Text><Text style={styles.price}>{(result.quote.amountOre / 100).toLocaleString(language === "en" ? "en-GB" : "nb-NO")} kr</Text></View>
          <Text style={styles.warning}>{language === "en" ? "Test mode: no real payment is made. Activation creates a test order and campaign." : "Testmodus: Ingen ekte betaling gjennomføres. Aktivering oppretter en testordre og kampanje."}</Text>
          {!activatedUntil ? (
            <Pressable disabled={activating} style={[styles.activate, activating && styles.disabled]} onPress={createAndActivate}>
              {activating ? <ActivityIndicator color="#fff" /> : <Text style={styles.activateText}>{language === "en" ? "Create test geo alert" : "Opprett test-geovarsel"}</Text>}
            </Pressable>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>{language === "en" ? "Geo alert active" : "Geovarsel aktivt"}</Text>
              <Text style={styles.successText}>{language === "en" ? "Active until" : "Aktiv til"}: {new Date(activatedUntil).toLocaleString(language === "en" ? "en-GB" : "nb-NO")}</Text>
              <Pressable style={styles.secondary} onPress={() => router.back()}><Text style={styles.secondaryText}>{language === "en" ? "Back to report" : "Tilbake til rapporten"}</Text></Pressable>
            </View>
          )}
        </View>}
      </ScrollView>
    </View>
  </>;
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},content:{padding:14,paddingBottom:40},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24},muted:{color:theme.colors.muted,fontWeight:"700"},mapFrame:{height:260,borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.card},map:{flex:1},card:{marginTop:12,padding:15,borderRadius:18,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.card},h2:{fontSize:17,fontWeight:"900",color:theme.colors.text},chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},chip:{paddingHorizontal:11,paddingVertical:8,borderRadius:999,backgroundColor:"#F1F5F9",borderWidth:1,borderColor:"#E2E8F0"},chipActive:{backgroundColor:theme.colors.primary,borderColor:theme.colors.primary},chipText:{fontWeight:"900",fontSize:12,color:"#475569"},chipTextActive:{color:"#fff"},help:{marginTop:10,color:theme.colors.muted,fontWeight:"700",fontSize:12,lineHeight:18},ruleTitle:{marginTop:10,fontWeight:"900",color:theme.colors.text,fontSize:15},primary:{marginTop:14,minHeight:50,borderRadius:14,backgroundColor:theme.colors.primary,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"900"},disabled:{opacity:.55},result:{marginTop:14,padding:18,borderRadius:18,backgroundColor:"#EFF6FF",borderWidth:1,borderColor:"#93C5FD"},resultEyebrow:{fontWeight:"900",fontSize:11,color:"#1D4ED8"},resultTitle:{marginTop:6,fontWeight:"900",fontSize:21,color:theme.colors.text},resultMeta:{marginTop:5,fontWeight:"700",color:theme.colors.muted},priceRow:{marginTop:16,paddingTop:14,borderTopWidth:1,borderTopColor:"#BFDBFE",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},priceLabel:{fontWeight:"800",color:theme.colors.text},price:{fontWeight:"900",fontSize:23,color:"#1D4ED8"},warning:{marginTop:10,fontWeight:"700",fontSize:12,color:"#92400E",lineHeight:18},activate:{marginTop:14,minHeight:48,borderRadius:14,backgroundColor:"#0F766E",alignItems:"center",justifyContent:"center"},activateText:{color:"#fff",fontWeight:"900"},successBox:{marginTop:14,padding:14,borderRadius:14,backgroundColor:"#ECFDF5",borderWidth:1,borderColor:"#86EFAC"},successTitle:{fontWeight:"900",fontSize:16,color:"#166534"},successText:{marginTop:5,fontWeight:"700",color:"#166534"},secondary:{marginTop:12,minHeight:44,borderRadius:12,borderWidth:1,borderColor:"#86EFAC",alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},secondaryText:{fontWeight:"900",color:"#166534"}
});
