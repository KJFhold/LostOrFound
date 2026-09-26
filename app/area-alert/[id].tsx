import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PremiumHeader } from "../../src/ui/PremiumHeader";
import { theme } from "../../src/ui/theme";
import { useI18n } from "../../src/i18n/I18nProvider";
import { API_BASE_URL } from "../../src/lib/config";
import { supabase } from "../../src/lib/supabase";

export default function AreaAlertDetails() {
  const router = useRouter();
  const { language } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error(language === "en" ? "You must be logged in." : "Du må være innlogget.");
      const response = await fetch(`${API_BASE_URL}/geo-alert-delivery/${encodeURIComponent(String(id || ""))}/view`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP_${response.status}`);
      setData(json);
    } catch (error: any) {
      Alert.alert(language === "en" ? "Could not open alert" : "Kunne ikke åpne varselet", error?.message || String(error));
    } finally { setLoading(false); }
  }, [id, language]);

  useEffect(() => { void load(); }, [load]);
  const campaign = data?.campaign;
  const report = campaign?.reports;
  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.safe}>
      <PremiumHeader title={language === "en" ? "Area alert" : "Områdevarsel"} onBack={() => router.back()} />
      {loading ? <View style={styles.center}><ActivityIndicator /></View> : !campaign ? <View style={styles.center}><Text style={styles.muted}>{language === "en" ? "Alert unavailable." : "Varselet er ikke tilgjengelig."}</Text></View> :
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{language === "en" ? "LOST ITEM NEAR YOU" : "MISTET GJENSTAND I NÆRHETEN"}</Text>
          <Text style={styles.title}>{report?.title || (language === "en" ? "Lost item" : "Mistet gjenstand")}</Text>
          <Text style={styles.meta}>{report?.location_label || ""}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>{language === "en" ? "Description" : "Beskrivelse"}</Text>
          <Text style={styles.body}>{report?.description || (language === "en" ? "No description available." : "Ingen beskrivelse tilgjengelig.")}</Text>
          <Text style={styles.row}>{language === "en" ? "Category" : "Kategori"}: {report?.category || "–"}</Text>
          <Text style={styles.row}>{language === "en" ? "Object" : "Gjenstand"}: {report?.subcategory_key || "–"}</Text>
          <Text style={styles.row}>{language === "en" ? "Color" : "Farge"}: {report?.color || "–"}</Text>
          <Text style={styles.row}>{language === "en" ? "Brand" : "Merke"}: {report?.brand || "–"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.h2}>{language === "en" ? "Alert status" : "Varselstatus"}</Text>
          <Text style={styles.row}>{String(campaign.status).toUpperCase() === "ACTIVE" ? (language === "en" ? "Active" : "Aktivt") : campaign.status}</Text>
          <Text style={styles.row}>{language === "en" ? "Area radius" : "Områderadius"}: {campaign.radius_m || "–"} m</Text>
          <Text style={styles.row}>{language === "en" ? "Active until" : "Aktivt til"}: {new Date(campaign.ends_at).toLocaleString(language === "en" ? "en-GB" : "nb-NO")}</Text>
        </View>
        <View style={styles.info}><Text style={styles.infoText}>{language === "en" ? "Observation and found-item actions will be added in the next package." : "Handlingene «Jeg har sett denne» og «Jeg har funnet denne» legges til i neste pakke."}</Text></View>
      </ScrollView>}
    </View>
  </>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:theme.colors.bg},center:{flex:1,alignItems:"center",justifyContent:"center"},content:{padding:14,paddingBottom:40},muted:{color:theme.colors.muted,fontWeight:"700"},hero:{padding:18,borderRadius:18,backgroundColor:"#EFF6FF",borderWidth:1,borderColor:"#93C5FD"},eyebrow:{fontSize:11,fontWeight:"900",color:"#1D4ED8"},title:{marginTop:7,fontSize:23,fontWeight:"900",color:theme.colors.text},meta:{marginTop:6,fontWeight:"700",color:theme.colors.muted},card:{marginTop:12,padding:16,borderRadius:18,backgroundColor:theme.colors.card,borderWidth:1,borderColor:theme.colors.border},h2:{fontSize:17,fontWeight:"900",color:theme.colors.text},body:{marginTop:10,lineHeight:21,fontWeight:"600",color:theme.colors.text},row:{marginTop:10,fontWeight:"700",color:theme.colors.text},info:{marginTop:12,padding:14,borderRadius:14,backgroundColor:"#F8FAFC",borderWidth:1,borderColor:theme.colors.border},infoText:{fontWeight:"700",lineHeight:19,color:theme.colors.muted}});
