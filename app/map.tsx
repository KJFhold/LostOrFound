import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  LongPressEvent, // <-- riktig type
} from "react-native-maps";
import { router } from "expo-router";

// Oslo sentrum som default
const OSLO_REGION: Region = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = useMemo(() => OSLO_REGION, []);
  const [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsCompass
        onLongPress={onLongPress}
        showsUserLocation={false}       // skrus på senere med expo-location
        showsMyLocationButton={false}
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

      <View style={styles.bottom}>
        <View style={styles.coords}>
          {picked ? (
            <Text style={styles.coordText}>
              Lat: {picked.latitude.toFixed(5)} · Lng: {picked.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.coordHint}>Long‑press i kartet for å plassere markør</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, !picked && styles.btnDisabled]}
            onPress={fitToPicked}
            disabled={!picked}
          >
            <Text style={styles.btnText}>Zoom til markør</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, !picked && styles.btnDisabled]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  bottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  coords: {
    backgroundColor: "rgba(17,24,39,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  coordText: { color: "#fff", fontWeight: "600" },
  coordHint: { color: "#9CA3AF", fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#93C5FD" },
  btnText: { color: "#fff", fontWeight: "700" },
});
``