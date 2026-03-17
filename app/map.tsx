import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  LongPressEvent,
} from "react-native-maps";
import { router } from "expo-router";

// Oslo sentrum som default
const OSLO_REGION: Region = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type LatLng = { latitude: number; longitude: number };

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = useMemo(() => OSLO_REGION, []);
  const [picked, setPicked] = useState<LatLng | null>(null);

  // Diagnostikk/logging
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Hvis kartet ikke melder seg klart innen X sekunder, vis en nyttig hint-tekst
  useEffect(() => {
    const t = setTimeout(() => {
      if (!mapReady) {
        setHint(
          "Kartet er ikke klart ennå. Sjekk at API-nøkkel/restriksjoner er riktige og at emulatoren har Google Play-tjenester."
        );
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [mapReady]);

  const onLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPicked({ latitude, longitude });
  };

  const confirm = () => {
    if (!picked) return;
    router.replace({
      pathname: "/create-report",
      params: {
        lat: picked.latitude.toString(),
        lng: picked.longitude.toString(),
      },
    });
  };

  const fitToPicked = () => {
    if (!mapRef.current || !picked) return;
    mapRef.current.animateToRegion(
      {
        latitude: picked.latitude,
        longitude: picked.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      400
    );
  };

  const resetToOslo = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        ...OSLO_REGION,
      },
      400
    );
  };

  // "Min posisjon" med dynamisk import (krever ingen ekstra native build)
  const goToMyLocation = async () => {
    try {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHint("Posisjon er ikke tillatt. Åpne Innstillinger → gi tilgang.");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const me = { latitude: coords.latitude, longitude: coords.longitude } as LatLng;
      setPicked(me);
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          { ...me, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400
        );
      }
    } catch (e: any) {
      setHint(`Klarte ikke hente posisjon: ${e?.message ?? "Ukjent feil"}`);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsCompass
        onLongPress={onLongPress}
        showsUserLocation={false} // blå prikk skrus på senere hvis du vil
        showsMyLocationButton={false}
        onMapReady={() => {
          setMapReady(true);
          if (__DEV__) console.log("Map ready (onMapReady)");
        }}
        onMapLoaded={() => {
          setMapLoaded(true);
          if (__DEV__) console.log("Map loaded (onMapLoaded)");
        }}
        onRegionChangeComplete={(region) => {
          if (__DEV__) console.log("Map region:", region);
        }}
      >
        {picked && (
          <Marker
            coordinate={picked}
            draggable
            title="Valgt posisjon"
            onDragEnd={(e) => setPicked(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>

      {/* Diagnostikk-stripe øverst */}
      <View pointerEvents="none" style={styles.topInfoWrap}>
        {!!hint && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        )}
        {!mapReady && (
          <View style={[styles.hint, { backgroundColor: "#8B5CF6" }]}>
            <Text style={styles.hintText}>Venter på kart...</Text>
          </View>
        )}
        {mapReady && !mapLoaded && (
          <View style={[styles.hint, { backgroundColor: "#2563EB" }]}>
            <Text style={styles.hintText}>Kart klart – laster fliser...</Text>
          </View>
        )}
      </View>

      {/* Bunnpanel */}
      <View style={styles.bottom}>
        <View style={styles.coords}>
          {picked ? (
            <Text style={styles.coordText}>
              Lat: {picked.latitude.toFixed(5)} · Lng: {picked.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.coordHint}>
              Long‑press i kartet for å plassere markør
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.btnDark} onPress={resetToOslo}>
            <Text style={styles.btnText}>Til Oslo</Text>
          </Pressable>

          <Pressable style={styles.btnDark} onPress={goToMyLocation}>
            <Text style={styles.btnText}>Min posisjon</Text>
          </Pressable>

          <Pressable
            style={[styles.btnBlue, !picked && styles.btnDisabled]}
            onPress={fitToPicked}
            disabled={!picked}
          >
            <Text style={styles.btnText}>Zoom til markør</Text>
          </Pressable>

          <Pressable
            style={[styles.btnBlue, !picked && styles.btnDisabled]}
            onPress={confirm}
            disabled={!picked}
          >
            <Text style={styles.btnText}>Bruk denne posisjonen</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const PAD = 12;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topInfoWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 16,
    gap: 8,
  },
  hint: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: PAD,
    paddingVertical: 8,
    borderRadius: 10,
    opacity: 0.95,
  },
  hintText: { color: "#111827", fontWeight: "600" },

  bottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  coords: {
    backgroundColor: "rgba(17,24,39,0.92)",
    paddingHorizontal: PAD,
    paddingVertical: 8,
    borderRadius: 12,
  },
  coordText: { color: "#fff", fontWeight: "600" },
  coordHint: { color: "#9CA3AF", fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },

  btnBlue: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDark: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#93C5FD" },
  btnText: { color: "#fff", fontWeight: "700" },
});