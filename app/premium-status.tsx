// app/premium-status.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";
import { useRevenueCatState } from "../src/hooks/useRevenueCatState";
import { fetchMyPurchases, type PurchaseOverviewItem } from "../src/lib/reportCommerce";
function loadPurchasesModule(): any | null { try { const mod=require("react-native-purchases"); return mod?.default??mod?.Purchases??mod??null; } catch { return null; } }
export default function MyPurchasesScreen(){
 const router=useRouter(); const {language,t}=useI18n(); const purchases=useMemo(()=>loadPurchasesModule(),[]);
 const {summary,reload}=useRevenueCatState({purchases,autoLoad:true});
 const [loading,setLoading]=useState(true),[restoring,setRestoring]=useState(false),[active,setActive]=useState<PurchaseOverviewItem[]>([]),[history,setHistory]=useState<PurchaseOverviewItem[]>([]);
 const load=useCallback(async()=>{try{setLoading(true);const data=await fetchMyPurchases();setActive(data.activePurchases||[]);setHistory(data.purchaseHistory||[]);}catch(e:any){Alert.alert(t("purchases.loadFailed"),e?.message??t("common.unknownError"));}finally{setLoading(false)}},[t]);
 useEffect(()=>{void load()},[load]);
 const restore=async()=>{if(!purchases)return Alert.alert(t("purchases.restoreFailed"),t("purchases.storeUnavailable"));try{setRestoring(true);await purchases.restorePurchases?.();await reload();await load();Alert.alert(t("purchases.restoreComplete"),t("purchases.restoreCompleteBody"));}catch(e:any){Alert.alert(t("purchases.restoreFailed"),e?.message??t("common.unknownError"));}finally{setRestoring(false)}};
 const subscriptions=summary?.hasLostPlus?[{id:"lost-plus",productCode:"LOST_PLUS",status:"ACTIVE",reportId:null,amountOre:null,currency:null,platform:null,provider:"REVENUECAT",purchasedAt:null,startsAt:null,currentPeriodEnd:null,autoRenews:true,report:null} as PurchaseOverviewItem]:[];
 return <><Stack.Screen options={{headerShown:false}}/><View style={s.safe}><PremiumHeader title={t("purchases.title")} onBack={()=>router.back()}/><ScrollView contentContainerStyle={s.content}>
 <Section title={t("purchases.subscriptions")} empty={t("purchases.noSubscriptions")} items={subscriptions} language={language} t={t} onOpen={()=>{}}/>
 {loading?<View style={s.loading}><ActivityIndicator/><Text style={s.muted}>{t("common.loading")}</Text></View>:<>
 <Section title={t("purchases.activeServices")} empty={t("purchases.noAdditionalServices")} items={active} language={language} t={t} onOpen={(x)=>x.reportId&&router.push(`/report-details/${x.reportId}`)}/>
 <Section title={t("purchases.history")} empty={t("purchases.noHistory")} items={history} language={language} t={t} onOpen={(x)=>x.reportId&&router.push(`/report-details/${x.reportId}`)}/></>}
 <View style={s.card}><Text style={s.h2}>{t("purchases.restoreTitle")}</Text><Text style={s.muted}>{t("purchases.restoreBody")}</Text><Pressable style={[s.button,restoring&&s.disabled]} disabled={restoring} onPress={()=>void restore()}><Text style={s.buttonText}>{restoring?t("purchases.restoring"):t("purchases.restore")}</Text></Pressable></View>
 </ScrollView></View></>;
}
function Section({title,empty,items,language,t,onOpen}:{title:string;empty:string;items:PurchaseOverviewItem[];language:"no"|"en";t:any;onOpen:(x:PurchaseOverviewItem)=>void}){return <View style={s.card}><Text style={s.h2}>{title}</Text>{items.length===0?<Text style={s.muted}>{empty}</Text>:items.map(item=><Pressable key={item.id} style={s.item} onPress={()=>onOpen(item)} disabled={!item.reportId}><View style={{flex:1}}><Text style={s.itemTitle}>{product(item.productCode,t)}</Text><Text style={s.itemMeta}>{item.report?.title||t("purchases.accountPurchase")}</Text>{item.purchasedAt&&<Text style={s.itemMeta}>{t("purchases.purchased",{value:date(item.purchasedAt,language)})}</Text>}{item.currentPeriodEnd&&<Text style={s.itemMeta}>{t("purchases.activeUntil",{value:date(item.currentPeriodEnd,language)})}</Text>}{item.amountOre!=null&&<Text style={s.itemMeta}>{`${(Number(item.amountOre)/100).toFixed(0)} ${item.currency||""}`}</Text>}</View><Text style={s.badge}>{status(item.status,t)}</Text></Pressable>)}</View>}
const date=(v:string,l:"no"|"en")=>new Date(v).toLocaleDateString(l==="en"?"en-GB":"nb-NO",{dateStyle:"medium"});
const product=(c:string,t:any)=>c==="REPORT_REACTIVATION"?t("caseDetail.report.reactivation"):c==="LONG_TERM_WATCH_ANNUAL"?t("caseDetail.annual.long.term.watch"):c.startsWith("GEO_ALERT_TIER_")?t("caseDetail.area.alert"):c==="LOST_PLUS"?"Lost Plus":c;
const status=(v:string,t:any)=>String(v).toUpperCase()==="ACTIVE"?t("purchases.active"):String(v).toUpperCase()==="CANCELLED"?t("purchases.cancelled"):String(v).toUpperCase()==="REFUNDED"?t("purchases.refunded"):t("purchases.completed");
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.colors.bg},content:{padding:16,paddingBottom:40},card:{padding:17,borderRadius:18,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.card,marginBottom:12,...theme.shadow.card},h2:{fontSize:18,fontWeight:"900",color:theme.colors.text},muted:{marginTop:8,color:theme.colors.muted,fontWeight:"600",lineHeight:19},loading:{padding:24,alignItems:"center"},item:{marginTop:13,paddingTop:13,borderTopWidth:1,borderTopColor:theme.colors.border,flexDirection:"row",alignItems:"flex-start",gap:10},itemTitle:{fontWeight:"900",color:theme.colors.text,fontSize:16},itemMeta:{marginTop:4,color:theme.colors.muted,fontWeight:"600"},badge:{color:"#15803D",backgroundColor:"#ECFDF5",borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontWeight:"900",overflow:"hidden"},button:{marginTop:16,minHeight:48,borderRadius:13,backgroundColor:theme.colors.primary,alignItems:"center",justifyContent:"center"},buttonText:{color:"#fff",fontWeight:"900"},disabled:{opacity:.5}});
