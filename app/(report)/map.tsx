// app/(report)/map.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Button, Platform, Alert } from "react-native";
import MapView, { Marker, Circle, MapPressEvent, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReportDraft } from "../../src/contexts/ReportDraftContext";
import { useI18n } from "../../src/i18n/I18nProvider";
import { reverseGeocodeToLabel } from "../../src/lib/reverseGeocode";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

// Tips:
// - Legg API-nøkkelen i en EXPO_PUBLIC_* env (Expo): EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
// - Aktiver "Places API" + billing i Google Cloud.
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

type Option = { label: string; value: number };

const RADIUS_OPTIONS: Option[] = [
  { label: "100 m", value: 100 },
  { label: "250 m", value: 250 },
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
  { label: "2 km", value: 2000 },
];

export default function MapPickerScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const insets = useSafeAreaInsets();
  const topOffset = (insets?.top ?? 0) + 10;

  const { draft, setLocation, setField } = useReportDraft();

  const mapRef = useRef<MapView>(null);

  // iOS: bruk Apple Maps som standard. Google Maps på iOS krever ekstra native-oppsett.
  // Android: bruk Google-provider.
  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  // Unngå "kontrollert" region (region={...}) som kan gi drift/feedback-loop.
  // Vi bruker initialRegion + animateToRegion når vi vil flytte kartet.
  const regionRef = useRef<Region>({
    latitude: 59.9139,
    longitude: 10.7522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const initialLat = draft.location?.latitude ?? 59.9139;
  const initialLng = draft.location?.longitude ?? 10.7522;
  const initialRadius = draft.location?.radiusMeters ?? 500;

  const initialRegion = useMemo<Region>(
    () => ({
      latitude: initialLat,
      longitude: initialLng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [initialLat, initialLng]
  );

  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    draft.location ? { latitude: initialLat, longitude: initialLng } : null
  );

  const [radius, setRadius] = useState<number>(initialRadius);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [region, setRegion] = useState<Region>(initialRegion); // kun for delta/logic

  useEffect(() => {
    regionRef.current = initialRegion;
    setRegion(initialRegion);
  }, [initialRegion]);

  const onRegionChangeComplete = (r: Region) => {
    regionRef.current = r;
    setRegion(r);
  };

  const radiusLabel = useMemo(() => {
    return radius >= 1000 ? `${(radius / 1000).toFixed(0)} km` : `${radius} m`;
  }, [radius]);

  const onPressMap = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
    setMenuOpen(false);
  };

  const animateTo = (r: Region, setPinAlso: boolean) => {
    regionRef.current = r;
    setRegion(r);
    if (setPinAlso) setPin({ latitude: r.latitude, longitude: r.longitude });
    requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(r, 250);
    });
  };

  const centerOnUser = async () => {
    try {
      setLocating(true);
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationPermissionGranted(false);
        Alert.alert(
          language === "en" ? "Location not enabled" : "Posisjon ikke aktivert",
          canAskAgain
            ? (language === "en" ? "The app needs location access to find your position. You can also choose a place manually on the map." : "Appen trenger tilgang til posisjon for å finne hvor du er. Du kan også velge sted manuelt på kartet.")
            : (language === "en" ? "Location access is denied. Open Settings to grant access, or choose a place manually on the map." : "Posisjonstilgang er avslått. Åpne Innstillinger for å gi appen tilgang, eller velg sted manuelt på kartet.")
        );
        return;
      }

      setLocationPermissionGranted(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const base = regionRef.current ?? region;
      animateTo({ ...base, latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, true);
      setMenuOpen(false);
    } catch (e: any) {
      Alert.alert(language === "en" ? "Location" : "Posisjon", e?.message ?? (language === "en" ? "Could not get your location." : "Kunne ikke hente posisjon."));
    } finally {
      setLocating(false);
    }
  };
  const zoomBy = async (delta: number) => {
    const m = mapRef.current;
    if (!m) return;
    const cam = await m.getCamera();
    const current = cam.zoom ?? 14;
    const next = Math.max(2, Math.min(20, current + delta));
    await m.animateCamera({ ...cam, zoom: next }, { duration: 180 });
  };

  const confirm = () => {
    if (!pin) return;

    setLocation({
      latitude: pin.latitude,
      longitude: pin.longitude,
      radiusMeters: radius,
    });

    // Best effort: lagre label umiddelbart for å unngå at gammel label henger igjen
    (async () => {
      try {
        const label = await reverseGeocodeToLabel(pin.latitude, pin.longitude, { language: language === "en" ? "en" : "no" });
        if (label) setField?.("locationLabel" as any, label);
      } catch {
        // ignore
      }
    })();

    router.back();
  };

  // Default: prøv å sentrere kartet på bruker ved første åpning hvis draft ikke har posisjon
  useEffect(() => {
    if (draft.location) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        setLocationPermissionGranted(true);
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        const base = regionRef.current ?? region;
        animateTo({ ...base, latitude, longitude }, false);
      } catch {
        // fallback: Oslo
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Top bar (alltid mulig å komme seg ut) */}
      <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <Text style={styles.topTitle}>{language === "en" ? "Confirm location" : "Bekreft posisjon"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <MapView
        ref={mapRef}
        provider={provider}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={onPressMap}
        zoomEnabled
        scrollEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        minZoomLevel={6}
        maxZoomLevel={20}
        showsCompass
        showsUserLocation={locationPermissionGranted}
        showsMyLocationButton={false}
      >
        {pin && (
          <>
            <Marker coordinate={pin} />
            <Circle
              center={pin}
              radius={radius}
              strokeWidth={2}
              strokeColor="rgba(37, 99, 235, 0.8)"
              fillColor="rgba(37, 99, 235, 0.18)"
            />
          </>
        )}
      </MapView>

      {/* Overlay: søk + kontroller */}
      <View pointerEvents="box-none" style={[styles.topOverlay, { top: topOffset + 44 }]}>
        <View pointerEvents="auto" style={styles.searchWrap}>
          <GooglePlacesAutocomplete
            placeholder={language === "en" ? "Search for a place or address…" : "Søk sted eller adresse…"}
            fetchDetails
            enablePoweredByContainer={false}
            debounce={250}
            query={{ key: GOOGLE_PLACES_API_KEY, language: language === "en" ? "en" : "no" }}
            onPress={(_, details) => {
              const loc: any = (details as any)?.geometry?.location;
              const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
              const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
              if (typeof lat === "number" && typeof lng === "number") {
                setMenuOpen(false);
                const base = regionRef.current ?? region;
                animateTo({ ...base, latitude: lat, longitude: lng }, true);
              }
            }}
            styles={{
              container: { flex: 0 },
              textInputContainer: styles.placesInputContainer,
              textInput: styles.placesInput,
              listView: styles.placesList,
              row: styles.placesRow,
              separator: styles.placesSeparator,
              description: styles.placesDesc,
            }}
          />
          {!GOOGLE_PLACES_API_KEY && (
            <Text style={styles.apiKeyHint}>{language === "en" ? "Tip: Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to enable place search." : "Tips: Sett EXPO_PUBLIC_GOOGLE_PLACES_API_KEY for å aktivere stedsøk."}</Text>
          )}
        </View>

        <View pointerEvents="auto" style={styles.controlsRow}>
          <View style={styles.zoomCol}>
            <Pressable style={styles.zoomBtn} onPress={() => zoomBy(+1)}>
              <Text style={styles.zoomTxt}>+</Text>
            </Pressable>
            <Pressable style={styles.zoomBtn} onPress={() => zoomBy(-1)}>
              <Text style={styles.zoomTxt}>−</Text>
            </Pressable>
          </View>

          <Pressable style={styles.locateBtn} onPress={centerOnUser} disabled={locating}>
            <Text style={styles.locateTxt}>{locating ? (language === "en" ? "Locating…" : "Finner…") : (language === "en" ? "Use my location" : "Bruk min posisjon")}</Text>
          </Pressable>

          <View style={styles.dropdownWrap}>
            <Pressable style={styles.dropdownBtn} onPress={() => setMenuOpen((s) => !s)}>
              <Text style={styles.dropdownTxt}>{language === "en" ? "Radius" : "Radius"}: {radiusLabel} ▾</Text>
            </Pressable>
            {menuOpen && (
              <View style={styles.dropdownMenu}>
                {RADIUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.dropdownItem, radius === opt.value && styles.dropdownItemActive]}
                    onPress={() => {
                      setRadius(opt.value);
                      setMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemTxt, radius === opt.value && styles.dropdownItemTxtActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Bottom bar: alltid en vei ut */}
      <View style={[styles.bottomBar, { paddingBottom: (insets?.bottom ?? 0) + 10 }]}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Button title={language === "en" ? "Cancel" : "Avbryt"} onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={language === "en" ? "Confirm" : "Bekreft"} onPress={confirm} disabled={!pin} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backBtn: {
    width: 44,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  backTxt: { fontSize: 28, fontWeight: "900", color: "#111", marginTop: -2 },
  topTitle: { fontSize: 16, fontWeight: "900", color: "#111" },

  topOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 150,
    ...(Platform.OS === "android" ? { elevation: 10 } : {}),
  },

  searchWrap: { borderRadius: 14, overflow: "visible" },
  placesInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  placesInput: { height: 42, fontSize: 16, fontWeight: "700", color: "#111" },
  placesList: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#fff",
    overflow: "hidden",
    zIndex: 9999,
    ...(Platform.OS === "android" ? { elevation: 20 } : {}),
  },
  placesRow: { paddingVertical: 12, paddingHorizontal: 12 },
  placesSeparator: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  placesDesc: { fontWeight: "700", color: "#111" },
  apiKeyHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  controlsRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  zoomCol: { flexDirection: "column" },
  zoomBtn: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
    ...(Platform.OS === "android" ? { elevation: 2 } : {}),
  },
  zoomTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  locateBtn: {
    marginLeft: 10,
    backgroundColor: "rgba(37, 99, 235, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    ...(Platform.OS === "android" ? { elevation: 2 } : {}),
  },
  locateTxt: { color: "#fff", fontSize: 13, fontWeight: "900" },

  dropdownWrap: { marginLeft: "auto", position: "relative", ...(Platform.OS === "android" ? { elevation: 2 } : {}) },
  dropdownBtn: { backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dropdownTxt: { color: "#fff", fontWeight: "800" },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: "#111",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 160,
    zIndex: 100,
    ...(Platform.OS === "android" ? { elevation: 12 } : {}),
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemActive: { backgroundColor: "#1f2937" },
  dropdownItemTxt: { color: "#fff" },
  dropdownItemTxtActive: { fontWeight: "800", color: "#93c5fd" },

  bottomBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    zIndex: 150,
    paddingTop: 10,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
});
