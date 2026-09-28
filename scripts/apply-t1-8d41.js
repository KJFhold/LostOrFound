const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "app/alert-areas.tsx");
let s = fs.readFileSync(file, "utf8");
if (!s.includes('type AreaMode = "CIRCLE" | "POLYGON"')) throw new Error("Expected T1.8D.4 alert-areas.tsx not found");
if (s.includes("useSafeAreaInsets") && s.includes("s.backButton")) { console.log("OK: T1.8D.4.1 app patch already applied."); process.exit(0); }
s = s.replace('import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";', 'import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";');
s = s.replace('import { Stack, useRouter } from "expo-router";', 'import { Stack, useRouter } from "expo-router";\nimport { useSafeAreaInsets } from "react-native-safe-area-context";');
s = s.replace('import { PremiumHeader } from "../src/ui/PremiumHeader";\n', '');
s = s.replace('const router=useRouter();const {language,t}=useI18n();const mapRef=useRef<MapView>(null);', 'const router=useRouter();const insets=useSafeAreaInsets();const {language,t}=useI18n();const mapRef=useRef<MapView>(null);');
s = s.replace('const friendly=(e:any,fallback:string)=>String(e?.message||e)==="LOGIN_REQUIRED"?t("alertAreas.loginRequired"):fallback;', 'const friendly=(e:any,fallback:string)=>{const code=String(e?.message||e||"");if(code==="LOGIN_REQUIRED")return t("alertAreas.loginRequired");if(code.includes("INVALID_BOUNDARY_COORDINATES")||code.includes("INVALID_BOUNDARY"))return t("alertAreas.invalidArea");return fallback;};');
s = s.replace('return <><Stack.Screen options={{headerShown:false}}/><View style={s.safe}><PremiumHeader title={t("alertAreas.title")} onBack={()=>router.back()}/>', 'return <><Stack.Screen options={{headerShown:false}}/><View style={s.safe}>');
s = s.replace('</MapView>\n <View style={s.searchBox}>', '</MapView>\n <View style={[s.header,{paddingTop:insets.top+4}]}><Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={()=>router.back()} style={s.backButton}><Text style={s.backText}>â€¹</Text></Pressable><Text style={s.headerTitle}>{t("alertAreas.title")}</Text><View style={s.headerSpacer}/></View>\n <View style={[s.searchBox,{top:insets.top+58}]}>');
s = s.replace('<View style={s.panel}><View style={s.modeRow}>', '<View style={[s.panel,{bottom:Math.max(12,insets.bottom+8)}]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.panelContent}><View style={s.modeRow}>');
const endOld = '/></View></View></>;';
const endNew = '/></ScrollView></View></View></>;';
if (!s.includes(endOld)) throw new Error("Could not locate T1.8D.4 panel closing tags");
s = s.replace(endOld, endNew);
s = s.replace('searchBox:{position:"absolute",top:74,left:12,right:12,zIndex:50', 'header:{position:"absolute",top:0,left:0,right:0,zIndex:60,minHeight:56,backgroundColor:"rgba(255,255,255,.98)",paddingHorizontal:10,paddingBottom:7,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:theme.colors.border},backButton:{width:42,height:42,borderRadius:21,backgroundColor:"#F1F5F9",alignItems:"center",justifyContent:"center"},backText:{fontSize:30,fontWeight:"900",color:theme.colors.text,marginTop:-3},headerTitle:{flex:1,textAlign:"center",fontSize:18,fontWeight:"900",color:theme.colors.text},headerSpacer:{width:42},searchBox:{position:"absolute",left:12,right:12,zIndex:50');
s = s.replace('maxHeight:"62%"},modeRow:', 'maxHeight:"58%"},panelContent:{paddingBottom:4},modeRow:');
for (const required of ["useSafeAreaInsets", "s.backButton", "<ScrollView", "top:insets.top+58"]) if (!s.includes(required)) throw new Error(`App patch incomplete: ${required}`);
fs.writeFileSync(file, s, "utf8");
console.log("OK: Applied T1.8D.4.1 app navigation and layout patch.");

