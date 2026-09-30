import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import { supabase } from "../src/lib/supabase";
import { API_BASE_URL } from "../src/lib/config";

type Point = { latitude: number; longitude: number };
type AreaMode = "CIRCLE" | "POLYGON";
type Area = {
  id: string;
  name: string;
  area_type?: AreaMode;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  boundary_points?: Point[];
  category_keys: string[];
  all_categories: boolean;
  push_enabled: boolean;
  active: boolean;
};

const RADII = [250, 500, 1000, 3000, 5000, 10000];
const CATEGORIES = ["PETS", "JEWELRY", "ELECTRONICS", "KEYS", "BAGS", "CLOTHING", "SPORTS", "TRANSPORT"];
const LABELS: Record<string, { no: string; en: string }> = {
  PETS: { no: "Husdyr", en: "Pets" }, JEWELRY: { no: "Smykker", en: "Jewelry" },
  ELECTRONICS: { no: "Elektronikk", en: "Electronics" }, KEYS: { no: "Nøkler", en: "Keys" },
  BAGS: { no: "Vesker", en: "Bags" }, CLOTHING: { no: "Klær", en: "Clothing" },
  SPORTS: { no: "Sport", en: "Sports" }, TRANSPORT: { no: "Transport", en: "Transport" },
};
const DEFAULT_CENTER: Point = { latitude: 59.9139, longitude: 10.7522 };
const isPoint = (point: any): point is Point =>
  Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));

export default function AlertAreasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const mapRef = useRef<MapView>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [center, setCenter] = useState<Point>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(1000);
  const [mode, setMode] = useState<AreaMode>("CIRCLE");
  const [points, setPoints] = useState<Point[]>([]);
  const [allCategories, setAllCategories] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const region = useMemo<Region>(() => ({ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }), []);

  const headers = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("LOGIN_REQUIRED");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const friendly = (error: any, fallback: string) => {
    const code = String(error?.message || error || "");
    if (code === "LOGIN_REQUIRED") return t("alertAreas.loginRequired");
    if (code.includes("INVALID_BOUNDARY")) return t("alertAreas.invalidArea");
    return fallback;
  };

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alert-areas`, { headers: await headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAreas(data.areas || []);
    } catch (error: any) {
      Alert.alert(t("alertAreas.error"), friendly(error, t("alertAreas.loadFailed")));
    }
  }, [headers, t]);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditingId(null); setName(""); setMode("CIRCLE"); setCenter(DEFAULT_CENTER);
    setRadius(1000); setPoints([]); setAllCategories(true); setCategories([]); setQuery(""); setResults([]);
  };

  const focusArea = (item: Area) => {
    const areaMode: AreaMode = item.area_type === "POLYGON" ? "POLYGON" : "CIRCLE";
    const polygon = (item.boundary_points || []).filter(isPoint);
    const nextCenter = isPoint({ latitude: item.latitude, longitude: item.longitude })
      ? { latitude: Number(item.latitude), longitude: Number(item.longitude) }
      : polygon[0] || DEFAULT_CENTER;
    setEditingId(item.id); setName(item.name); setMode(areaMode); setCenter(nextCenter);
    setRadius(item.radius_m || 1000); setPoints(polygon); setAllCategories(item.all_categories);
    setCategories(item.category_keys || []); setQuery(""); setResults([]);
    if (areaMode === "POLYGON" && polygon.length >= 3) {
      mapRef.current?.fitToCoordinates(polygon, { edgePadding: { top: 150, right: 45, bottom: 330, left: 45 }, animated: true });
    } else {
      mapRef.current?.animateToRegion({ ...nextCenter, latitudeDelta: 0.035, longitudeDelta: 0.035 }, 250);
    }
  };

  const locate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCenter(next); setPoints([]);
    mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 250);
  };

  const search = async () => {
    const value = query.trim();
    if (value.length < 3) return;
    try {
      setSearching(true);
      const response = await fetch(`${API_BASE_URL}/geo/search?q=${encodeURIComponent(value)}&language=${encodeURIComponent(language)}`, { headers: await headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (error: any) {
      Alert.alert(t("alertAreas.error"), friendly(error, t("alertAreas.searchFailed")));
    } finally { setSearching(false); }
  };

  const chooseResult = (item: any) => {
    const next = { latitude: Number(item.latitude), longitude: Number(item.longitude) };
    if (!isPoint(next)) return;
    setCenter(next); setPoints([]); setQuery(String(item.label || "")); setResults([]);
    mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 250);
  };

  const mapPress = (coordinate: Point) => mode === "CIRCLE" ? setCenter(coordinate) : setPoints((current) => [...current, coordinate]);
  const toggleCategory = (key: string) => { setAllCategories(false); setCategories((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); };

  const save = async () => {
    if (!editingId && areas.length >= 3) return Alert.alert(t("alertAreas.maximumReached"), t("alertAreas.maximumReachedBody"));
    if (!name.trim()) return Alert.alert(t("alertAreas.nameRequired"));
    if (mode === "POLYGON" && points.length < 3) return Alert.alert(t("alertAreas.morePointsTitle"), t("alertAreas.morePointsBody"));
    try {
      setBusy(true);
      const body: any = { name: name.trim(), areaType: mode, allCategories, categoryKeys: categories, pushEnabled: true };
      if (mode === "CIRCLE") Object.assign(body, { latitude: center.latitude, longitude: center.longitude, radiusM: radius });
      else body.boundaryPoints = points;
      const response = await fetch(`${API_BASE_URL}/alert-areas${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PATCH" : "POST", headers: await headers(), body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      resetForm(); await load();
    } catch (error: any) {
      Alert.alert(t("alertAreas.error"), friendly(error, t("alertAreas.saveFailed")));
    } finally { setBusy(false); }
  };

  const patchStatus = async (id: string, patch: any) => {
    const response = await fetch(`${API_BASE_URL}/alert-areas/${id}`, { method: "PATCH", headers: await headers(), body: JSON.stringify(patch) });
    if (!response.ok) throw new Error("WATCH_AREA_UPDATE_FAILED");
    await load();
  };
  const remove = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/alert-areas/${id}`, { method: "DELETE", headers: await headers() });
    if (!response.ok) throw new Error("WATCH_AREA_DELETE_FAILED");
    if (editingId === id) resetForm();
    await load();
  };
  const areaMeta = (item: Area) => item.area_type === "POLYGON"
    ? t("alertAreas.polygonType", { count: item.boundary_points?.length || 0 })
    : t("alertAreas.circleType", { radius: (item.radius_m || 0) >= 1000 ? `${(item.radius_m || 0) / 1000} km` : `${item.radius_m || 0} m` });

  return (
    <><Stack.Screen options={{ headerShown: false }} /><View style={styles.safe}>
      <MapView ref={mapRef} provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} style={styles.map} initialRegion={region} onPress={(event) => mapPress(event.nativeEvent.coordinate)}>
        {mode === "CIRCLE" ? <><Marker coordinate={center} draggable onDragEnd={(event) => setCenter(event.nativeEvent.coordinate)} /><Circle center={center} radius={radius} strokeColor="#2563EB" fillColor="rgba(37,99,235,.15)" /></> : <>{points.map((point, index) => <Marker key={`${point.latitude}-${point.longitude}-${index}`} coordinate={point} pinColor="#F59E0B" />)}{points.length >= 3 && <Polygon coordinates={points} strokeColor="#2563EB" fillColor="rgba(37,99,235,.18)" strokeWidth={3} />}</>}
      </MapView>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={26} color={theme.colors.text} /></Pressable>
        <Text style={styles.headerTitle}>{t("alertAreas.title")}</Text><View style={styles.headerSpacer} />
      </View>
      <View style={[styles.searchBox, { top: insets.top + 58 }]}>
        <View style={styles.searchRow}><TextInput style={styles.searchInput} value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} returnKeyType="search" placeholder={t("alertAreas.searchPlaceholder")} /><Pressable style={styles.searchButton} onPress={() => void search()}>{searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>{t("alertAreas.search")}</Text>}</Pressable></View>
        {results.length > 0 && <View style={styles.results}>{results.map((item) => <Pressable key={item.id || item.label} style={styles.result} onPress={() => chooseResult(item)}><Text numberOfLines={2}>{item.label}</Text></Pressable>)}</View>}
      </View>
      <View style={[styles.panel, { bottom: Math.max(12, insets.bottom + 8) }]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
        {editingId && <View style={styles.editBanner}><Text style={styles.editBannerText}>{t("alertAreas.editing")}</Text><Pressable onPress={resetForm}><Text style={styles.link}>{t("alertAreas.cancelEdit")}</Text></Pressable></View>}
        <View style={styles.modeRow}>{(["CIRCLE", "POLYGON"] as AreaMode[]).map((value) => <Pressable key={value} onPress={() => { setMode(value); setPoints([]); }} style={[styles.mode, mode === value && styles.modeOn]}><Text style={[styles.modeText, mode === value && styles.modeTextOn]}>{value === "CIRCLE" ? t("alertAreas.place") : t("alertAreas.area")}</Text></Pressable>)}</View>
        <Text style={styles.help}>{mode === "CIRCLE" ? t("alertAreas.tapPlace") : t("alertAreas.tapPolygon")}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t("alertAreas.namePlaceholder")} style={styles.input} />
        {mode === "CIRCLE" ? <View style={styles.row}>{RADII.map((value) => <Pressable key={value} onPress={() => setRadius(value)} style={[styles.chip, radius === value && styles.chipOn]}><Text style={[styles.chipText, radius === value && styles.chipTextOn]}>{value >= 1000 ? `${value / 1000} km` : `${value} m`}</Text></Pressable>)}</View> : <View style={styles.geometryActions}><Text style={styles.count}>{t("alertAreas.pointCount", { count: points.length })}</Text><Pressable onPress={() => setPoints((current) => current.slice(0, -1))}><Text style={styles.link}>{t("alertAreas.undo")}</Text></Pressable><Pressable onPress={() => setPoints([])}><Text style={styles.delete}>{t("alertAreas.clear")}</Text></Pressable></View>}
        <Pressable onPress={() => { setAllCategories(true); setCategories([]); }} style={[styles.all, allCategories && styles.chipOn]}><Text style={[styles.chipText, allCategories && styles.chipTextOn]}>{t("alertAreas.allCategories")}</Text></Pressable>
        <View style={styles.row}>{CATEGORIES.map((key) => <Pressable key={key} onPress={() => toggleCategory(key)} style={[styles.chip, categories.includes(key) && styles.chipOn]}><Text style={[styles.chipText, categories.includes(key) && styles.chipTextOn]}>{LABELS[key][language]}</Text></Pressable>)}</View>
        <View style={styles.actions}><Pressable style={styles.secondary} onPress={() => void locate()}><Text style={styles.secondaryText}>{t("alertAreas.myLocation")}</Text></Pressable><Pressable disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void save()}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{editingId ? t("alertAreas.saveChanges") : t("alertAreas.saveArea")}</Text>}</Pressable></View>
        <Text style={styles.count}>{areas.length} / 3</Text>
        <FlatList data={areas} keyExtractor={(item) => item.id} horizontal nestedScrollEnabled renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => focusArea(item)} style={[styles.card, editingId === item.id && styles.cardSelected]}><View><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardMeta}>{areaMeta(item)} · {item.all_categories ? t("alertAreas.allCategories") : t("alertAreas.categoryCount", { count: item.category_keys.length })}</Text></View><View style={styles.miniActions}><Pressable onPress={(event) => { event.stopPropagation(); void patchStatus(item.id, { active: !item.active }); }}><Text style={styles.link}>{item.active ? t("alertAreas.pause") : t("alertAreas.activate")}</Text></Pressable><Pressable onPress={(event) => { event.stopPropagation(); void remove(item.id); }}><Text style={styles.delete}>{t("alertAreas.delete")}</Text></Pressable></View></Pressable>} />
      </ScrollView></View>
    </View></>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg }, map: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 60, minHeight: 56, backgroundColor: "rgba(255,255,255,.98)", paddingHorizontal: 10, paddingBottom: 7, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: theme.colors.text }, headerSpacer: { width: 42 },
  searchBox: { position: "absolute", left: 12, right: 12, zIndex: 50, backgroundColor: "rgba(255,255,255,.98)", borderRadius: 14, padding: 8, borderWidth: 1, borderColor: theme.colors.border }, searchRow: { flexDirection: "row", gap: 8 }, searchInput: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12 }, searchButton: { minWidth: 62, minHeight: 42, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, searchButtonText: { color: "#fff", fontWeight: "900" }, results: { marginTop: 6 }, result: { padding: 9, borderTopWidth: 1, borderTopColor: theme.colors.border },
  panel: { position: "absolute", left: 12, right: 12, backgroundColor: "rgba(255,255,255,.97)", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: theme.colors.border, maxHeight: "58%" }, panelContent: { paddingBottom: 4 }, editBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: 8, borderRadius: 10, backgroundColor: "#EFF6FF" }, editBannerText: { fontWeight: "900", color: theme.colors.text },
  modeRow: { flexDirection: "row", gap: 8 }, mode: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" }, modeOn: { backgroundColor: theme.colors.primary }, modeText: { fontWeight: "900", color: theme.colors.muted }, modeTextOn: { color: "#fff" }, help: { marginTop: 7, color: theme.colors.muted, fontWeight: "700", fontSize: 12 }, input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 11, color: theme.colors.text, marginTop: 8 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }, chip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "#F1F5F9" }, chipOn: { backgroundColor: theme.colors.primary }, chipText: { fontSize: 11, fontWeight: "800", color: "#475569" }, chipTextOn: { color: "#fff" }, all: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F1F5F9" }, geometryActions: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 9 }, actions: { flexDirection: "row", gap: 8, marginTop: 10 }, secondary: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" }, secondaryText: { fontWeight: "900", color: theme.colors.text }, primary: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }, primaryText: { fontWeight: "900", color: "#fff" }, disabled: { opacity: 0.45 }, count: { marginTop: 8, color: theme.colors.muted, fontWeight: "900" }, card: { width: 210, marginTop: 8, marginRight: 8, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: "#F8FAFC" }, cardSelected: { borderColor: theme.colors.primary, borderWidth: 2, backgroundColor: "#EFF6FF" }, cardTitle: { fontWeight: "900", color: theme.colors.text }, cardMeta: { marginTop: 4, fontSize: 11, fontWeight: "700", color: theme.colors.muted }, miniActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 }, link: { color: theme.colors.primary, fontWeight: "900" }, delete: { color: theme.colors.danger, fontWeight: "900" },
});
