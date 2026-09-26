import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import { API_BASE_URL } from "../src/lib/config";
import { supabase } from "../src/lib/supabase";

type Kind = "SEEN" | "FOUND";
export default function ObservationCreateScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { language } = useI18n();
  const params = useLocalSearchParams<{ campaignId?: string; kind?: Kind }>();
  const campaignId = String(params.campaignId || "");
  const kind: Kind = params.kind === "FOUND" ? "FOUND" : "SEEN";
  const [point, setPoint] = useState({ latitude: 59.9139, longitude: 10.7522 });
  const [comment, setComment] = useState("");
  const [direction, setDirection] = useState("");
  const [hasItem, setHasItem] = useState(kind === "FOUND");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const clientRequestId = useMemo(() => `obs_${Date.now()}_${Math.random().toString(36).slice(2)}`, []);

  const useMyLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setPoint(next); setReady(true);
    mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 250);
  }, []);

  const submit = useCallback(async () => {
    if (!campaignId) return Alert.alert(language === "en" ? "Error" : "Feil", language === "en" ? "Missing alert reference." : "Mangler varselreferanse.");
    if (!ready) return Alert.alert(language === "en" ? "Choose location" : "Velg sted", language === "en" ? "Place the pin or use your location." : "Plasser pinnen eller bruk din posisjon.");
    try {
      setBusy(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(language === "en" ? "You must be logged in." : "Du må være innlogget.");
      const response = await fetch(`${API_BASE_URL}/observations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, observationType: kind, latitude: point.latitude, longitude: point.longitude, observedAt: new Date().toISOString(), comment, movementDirection: direction, hasItem, clientRequestId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP_${response.status}`);
      router.replace(`/observation/${json.observation.id}`);
    } catch (error: any) {
      Alert.alert(language === "en" ? "Could not send" : "Kunne ikke sende", error?.message || String(error));
    } finally { setBusy(false); }
  }, [campaignId, kind, point, ready, comment, direction, hasItem, clientRequestId, language, router]);

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.safe}>
      <PremiumHeader title={kind === "FOUND" ? (language === "en" ? "I found this" : "Jeg har funnet denne") : (language === "en" ? "I saw this" : "Jeg har sett denne")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{kind === "FOUND" ? (language === "en" ? "Register where the item or animal is now." : "Registrer hvor gjenstanden eller dyret befinner seg nå.") : (language === "en" ? "Register where and when the item or animal was observed." : "Registrer hvor og når gjenstanden eller dyret ble observert.")}</Text>
        <MapView ref={mapRef} style={styles.map} initialRegion={{ ...point, latitudeDelta: 0.04, longitudeDelta: 0.04 }} onPress={(event) => { setPoint(event.nativeEvent.coordinate); setReady(true); }}>
          <Marker coordinate={point} draggable onDragEnd={(event) => { setPoint(event.nativeEvent.coordinate); setReady(true); }} />
        </MapView>
        <Pressable style={styles.secondary} onPress={useMyLocation}><Text style={styles.secondaryText}>{language === "en" ? "Use my location" : "Bruk min posisjon"}</Text></Pressable>
        <Text style={styles.label}>{language === "en" ? "Comment" : "Kommentar"}</Text>
        <TextInput value={comment} onChangeText={setComment} multiline maxLength={1000} placeholder={language === "en" ? "What did you observe?" : "Hva observerte du?"} style={[styles.input, styles.multiline]} />
        {kind === "SEEN" && <><Text style={styles.label}>{language === "en" ? "Direction (optional)" : "Retning (valgfritt)"}</Text><TextInput value={direction} onChangeText={setDirection} maxLength={120} placeholder={language === "en" ? "For example: toward the park" : "For eksempel: mot parken"} style={styles.input} /></>}
        {kind === "FOUND" && <Pressable style={[styles.check, hasItem && styles.checkActive]} onPress={() => setHasItem((v) => !v)}><Text style={styles.checkText}>{language === "en" ? "The item or animal is with me" : "Gjenstanden eller dyret er hos meg"}</Text></Pressable>}
        <Pressable disabled={busy} style={[styles.primary, busy && { opacity: .6 }]} onPress={submit}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{language === "en" ? "Send information" : "Send opplysningene"}</Text>}</Pressable>
      </ScrollView>
    </View>
  </>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:theme.colors.bg},content:{padding:14,paddingBottom:40},lead:{fontWeight:"700",lineHeight:20,color:theme.colors.text,marginBottom:12},map:{height:280,borderRadius:18,overflow:"hidden"},secondary:{marginTop:10,minHeight:44,borderRadius:12,borderWidth:1,borderColor:theme.colors.border,alignItems:"center",justifyContent:"center",backgroundColor:theme.colors.card},secondaryText:{fontWeight:"900",color:theme.colors.text},label:{marginTop:16,marginBottom:6,fontWeight:"900",color:theme.colors.text},input:{borderWidth:1,borderColor:theme.colors.border,borderRadius:12,paddingHorizontal:12,minHeight:46,backgroundColor:theme.colors.card,color:theme.colors.text,fontWeight:"600"},multiline:{minHeight:100,paddingTop:12,textAlignVertical:"top"},check:{marginTop:16,padding:14,borderRadius:12,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.card},checkActive:{borderColor:theme.colors.primary,backgroundColor:"#EFF6FF"},checkText:{fontWeight:"900",color:theme.colors.text},primary:{marginTop:18,minHeight:50,borderRadius:14,backgroundColor:theme.colors.primary,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"900"}});
