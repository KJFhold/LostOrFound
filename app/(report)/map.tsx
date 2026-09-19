import React, { useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, MapPressEvent, Polygon, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useReportDraft, type SearchArea } from "../../src/contexts/ReportDraftContext";
import { useI18n } from "../../src/i18n/I18nProvider";

const MAX_SEARCH_AREAS = 3;
const RADIUS_OPTIONS = [100, 250, 500, 1000, 2000, 5000];
type Mode = "CIRCLE" | "ROUTE" | "POLYGON";
const uid = () => `area_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function MapPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const { draft, setLocation, setField } = useReportDraft();
  const mapRef = useRef<MapView>(null);
  const [mode, setMode] = useState<Mode>("CIRCLE");
  const [radius, setRadius] = useState(draft.location?.radiusMeters ?? 500);
  const [areas, setAreas] = useState<SearchArea[]>((draft.searchAreas || []).slice(0, MAX_SEARCH_AREAS));
  const [workingPoints, setWorkingPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? null;
  const atLimit = areas.length >= MAX_SEARCH_AREAS;

  const initialRegion = useMemo<Region>(() => ({
    latitude: draft.location?.latitude ?? areas[0]?.points[0]?.latitude ?? 59.9139,
    longitude: draft.location?.longitude ?? areas[0]?.points[0]?.longitude ?? 10.7522,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  }), [areas, draft.location]);

  const limitAlert = () => Alert.alert(
    language === "en" ? "Maximum three search areas" : "Maksimalt tre søkeområder",
    language === "en"
      ? "Delete an existing place, route or area before adding another."
      : "Slett et eksisterende sted, en rute eller et område før du legger til et nytt."
  );

  const selectArea = (id: string) => {
    setSelectedAreaId(id);
    setWorkingPoints([]);
  };

  const onMapPress = (event: MapPressEvent) => {
    setSelectedAreaId(null);
    const point = event.nativeEvent.coordinate;
    if (mode === "CIRCLE") {
      if (atLimit) return limitAlert();
      setAreas((current) => [...current, { id: uid(), kind: "CIRCLE", radiusMeters: radius, points: [point] }]);
    } else {
      if (atLimit && workingPoints.length === 0) return limitAlert();
      setWorkingPoints((current) => [...current, point]);
    }
  };

  const addWorkingArea = () => {
    if (atLimit) return limitAlert();
    const minimum = mode === "ROUTE" ? 2 : 3;
    if (workingPoints.length < minimum) {
      Alert.alert(
        language === "en" ? "More points needed" : "Flere punkter kreves",
        language === "en" ? `Add at least ${minimum} points.` : `Legg til minst ${minimum} punkter.`
      );
      return;
    }
    setAreas((current) => [...current, { id: uid(), kind: mode, radiusMeters: mode === "ROUTE" ? radius : undefined, points: workingPoints }]);
    setWorkingPoints([]);
  };

  const undo = () => {
    setSelectedAreaId(null);
    if (workingPoints.length) setWorkingPoints((points) => points.slice(0, -1));
    else setAreas((current) => current.slice(0, -1));
  };

  const deleteSelected = () => {
    if (!selectedAreaId) return;
    setAreas((current) => current.filter((area) => area.id !== selectedAreaId));
    setSelectedAreaId(null);
  };

  const changeSelectedRadius = (nextRadius: number) => {
    setRadius(nextRadius);
    if (!selectedAreaId) return;
    setAreas((current) => current.map((area) =>
      area.id === selectedAreaId && area.kind !== "POLYGON"
        ? { ...area, radiusMeters: nextRadius }
        : area
    ));
  };

  const centerOnUser = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 250);
    } finally { setLocating(false); }
  };

  const confirm = () => {
    if (workingPoints.length) {
      Alert.alert(
        language === "en" ? "Finish the area" : "Fullfør området",
        language === "en" ? "Add or discard the points currently being drawn." : "Legg til eller forkast punktene som tegnes nå."
      );
      return;
    }
    if (!areas.length) {
      Alert.alert(language === "en" ? "No search area" : "Ingen søkeområde", language === "en" ? "Add at least one area." : "Legg til minst ett område.");
      return;
    }
    const primary = areas[0].points[0];
    setField("searchAreas" as any, areas);
    setLocation({ latitude: primary.latitude, longitude: primary.longitude, radiusMeters: areas[0].radiusMeters ?? radius, confirmed: true });
    router.back();
  };

  const renderArea = (area: SearchArea) => {
    const selected = area.id === selectedAreaId;
    const stroke = selected ? "#F59E0B" : area.kind === "CIRCLE" ? "#2563EB" : area.kind === "ROUTE" ? "#DC2626" : "#7C3AED";
    if (area.kind === "CIRCLE") {
      return (
        <React.Fragment key={area.id}>
          <Circle center={area.points[0]} radius={area.radiusMeters || 500} strokeWidth={selected ? 4 : 2} strokeColor={stroke} fillColor={selected ? "rgba(245,158,11,0.24)" : "rgba(37,99,235,0.18)"} />
          <Marker coordinate={area.points[0]} pinColor={selected ? "#F59E0B" : "#DC2626"} onPress={() => selectArea(area.id)} />
        </React.Fragment>
      );
    }
    if (area.kind === "ROUTE") {
      return <Polyline key={area.id} coordinates={area.points} strokeWidth={selected ? 12 : 8} strokeColor={stroke} tappable onPress={() => selectArea(area.id)} />;
    }
    return <Polygon key={area.id} coordinates={area.points} strokeWidth={selected ? 4 : 2} strokeColor={stroke} fillColor={selected ? "rgba(245,158,11,0.24)" : "rgba(124,58,237,0.18)"} tappable onPress={() => selectArea(area.id)} />;
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Text style={styles.headerButtonText}>‹</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{language === "en" ? "Search areas" : "Søkeområder"}</Text>
          <Text style={styles.subtitle}>{language === "en" ? `${areas.length} of ${MAX_SEARCH_AREAS} areas` : `${areas.length} av ${MAX_SEARCH_AREAS} områder`}</Text>
        </View>
        <Pressable onPress={undo} style={styles.undo}><Text style={styles.undoText}>{language === "en" ? "Undo" : "Angre"}</Text></Pressable>
      </View>

      <MapView ref={mapRef} provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} style={styles.map} initialRegion={initialRegion} onPress={onMapPress}>
        {areas.map(renderArea)}
        {workingPoints.map((point, index) => <Marker key={`working-${index}`} coordinate={point} pinColor="#F59E0B" />)}
        {mode === "ROUTE" && workingPoints.length > 1 && <Polyline coordinates={workingPoints} strokeWidth={6} strokeColor="#F59E0B" />}
        {mode === "POLYGON" && workingPoints.length > 2 && <Polygon coordinates={workingPoints} strokeWidth={2} strokeColor="#F59E0B" fillColor="rgba(245,158,11,0.16)" />}
      </MapView>

      <View style={[styles.panel, { bottom: insets.bottom + 12 }]}>
        {selectedArea ? (
          <View style={styles.selectedBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedTitle}>{language === "en" ? "Selected" : "Valgt"}: {selectedArea.kind}</Text>
              <Text style={styles.selectedText}>{language === "en" ? "Tap Delete to remove this shape." : "Trykk Slett for å fjerne denne formen."}</Text>
            </View>
            <Pressable onPress={deleteSelected} style={styles.deleteButton}><Text style={styles.deleteText}>{language === "en" ? "Delete" : "Slett"}</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.modes}>
              {(["CIRCLE", "ROUTE", "POLYGON"] as Mode[]).map((item) => (
                <Pressable key={item} disabled={atLimit} onPress={() => { setMode(item); setWorkingPoints([]); }} style={[styles.mode, mode === item && styles.modeActive, atLimit && styles.disabled]}>
                  <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item === "CIRCLE" ? (language === "en" ? "Place" : "Sted") : item === "ROUTE" ? (language === "en" ? "Route" : "Rute") : (language === "en" ? "Area" : "Område")}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.help}>{atLimit ? (language === "en" ? "Maximum reached. Select a shape on the map to delete it." : "Maksgrensen er nådd. Velg en form på kartet for å slette den.") : mode === "CIRCLE" ? (language === "en" ? "Tap up to three possible places." : "Trykk på opptil tre mulige steder.") : (language === "en" ? "Tap points in order, then add the shape." : "Trykk punkter i rekkefølge, og legg deretter til formen.")}</Text>
          </>
        )}

        <View style={styles.radiusRow}>{RADIUS_OPTIONS.map((m) => <Pressable key={m} onPress={() => changeSelectedRadius(m)} style={[styles.radius, radius === m && styles.radiusActive]}><Text style={[styles.radiusText, radius === m && styles.radiusTextActive]}>{m >= 1000 ? `${m / 1000} km` : `${m} m`}</Text></Pressable>)}</View>
        {!selectedArea && mode !== "CIRCLE" && <Pressable onPress={addWorkingArea} disabled={atLimit} style={[styles.secondaryFull, atLimit && styles.disabled]}><Text style={styles.secondaryText}>{language === "en" ? "Add drawn shape" : "Legg til tegnet form"}</Text></Pressable>}
        <View style={styles.actions}><Pressable onPress={centerOnUser} style={styles.secondary}><Text style={styles.secondaryText}>{locating ? "…" : (language === "en" ? "My location" : "Min posisjon")}</Text></Pressable><Pressable onPress={confirm} style={styles.primary}><Text style={styles.primaryText}>{language === "en" ? "Confirm areas" : "Bekreft områder"}</Text></Pressable></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#fff"},map:{flex:1},header:{position:"absolute",zIndex:20,top:0,left:0,right:0,backgroundColor:"rgba(255,255,255,.96)",paddingHorizontal:12,paddingBottom:9,flexDirection:"row",alignItems:"center",gap:10},headerButton:{width:42,height:42,borderRadius:21,backgroundColor:"#F1F5F9",alignItems:"center",justifyContent:"center"},headerButtonText:{fontSize:28,fontWeight:"900"},title:{fontSize:18,fontWeight:"900",color:"#0F172A"},subtitle:{fontSize:12,fontWeight:"700",color:"#64748B",marginTop:2},undo:{padding:9},undoText:{fontWeight:"900",color:"#2563EB"},panel:{position:"absolute",left:12,right:12,zIndex:30,backgroundColor:"rgba(255,255,255,.97)",borderRadius:20,padding:12,borderWidth:1,borderColor:"#CBD5E1"},modes:{flexDirection:"row",gap:7},mode:{flex:1,minHeight:38,borderRadius:11,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center"},modeActive:{backgroundColor:"#0F172A",borderColor:"#0F172A"},modeText:{fontWeight:"900",color:"#64748B"},modeTextActive:{color:"#fff"},help:{color:"#64748B",fontWeight:"700",fontSize:12,marginTop:9},radiusRow:{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:9},radius:{paddingHorizontal:9,paddingVertical:6,borderRadius:999,backgroundColor:"#F1F5F9"},radiusActive:{backgroundColor:"#DBEAFE"},radiusText:{fontWeight:"800",fontSize:11,color:"#475569"},radiusTextActive:{color:"#1D4ED8"},actions:{flexDirection:"row",gap:8,marginTop:10},secondary:{flex:1,minHeight:42,borderRadius:12,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center"},secondaryFull:{minHeight:42,borderRadius:12,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center",marginTop:9},secondaryText:{fontWeight:"900",color:"#334155"},primary:{flex:1,minHeight:42,borderRadius:12,backgroundColor:"#2563EB",alignItems:"center",justifyContent:"center"},primaryText:{fontWeight:"900",color:"#fff"},disabled:{opacity:.4},selectedBar:{flexDirection:"row",alignItems:"center",gap:10,padding:10,borderRadius:13,backgroundColor:"#FFFBEB",borderWidth:1,borderColor:"#FCD34D"},selectedTitle:{fontWeight:"900",color:"#92400E"},selectedText:{fontWeight:"600",fontSize:12,color:"#92400E",marginTop:2},deleteButton:{minHeight:40,paddingHorizontal:14,borderRadius:11,backgroundColor:"#B91C1C",alignItems:"center",justifyContent:"center"},deleteText:{color:"#fff",fontWeight:"900"}
});
