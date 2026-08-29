// app/(report)/create-report.tsx  
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";  
import {  
  View,  
  Text,  
  TextInput,  
  StyleSheet,  
  Alert,  
  KeyboardAvoidingView,  
  Platform,  
  ScrollView,  
 Modal,  
  Pressable,  
  Image,  
} from "react-native";  
import { Stack, useLocalSearchParams, useRouter } from "expo-router";  
import { API_BASE_URL } from "../../src/lib/config";  
import { useReportDraft } from "../../src/contexts/ReportDraftContext";  
import { pickOneImage, captureOneImage, uploadReportImage } from "../../src/lib/images";  
import { supabase } from "../../src/lib/supabase";  
import { ensureFoundIdentity, ensureLostAuthenticated } from "../../src/lib/authGate";  
import { ensureProfileRow } from "../../src/lib/profile";  
import { reverseGeocodeToLabel } from "../../src/lib/reverseGeocode";  
import { CATEGORIES, SUBCATEGORIES, OBJECT_LABELS_EN, objectLabel, objectSearchText } from "../../src/lib/categories";  
import { theme } from "../../src/ui/theme";  
import { PremiumHeader } from "../../src/ui/PremiumHeader";  
import { useI18n } from "../../src/i18n/I18nProvider";  
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";  
type ReportType = "LOST" | "FOUND";  
type ColorOption = { label: string; value: string };  
type RegionCode = "NO" | "US" | "GB" | "EU" | "OTHER";  

function inferRegionCodeFromLocale(locale?: string): RegionCode {  
  const region = String(locale || "").split("-").pop()?.toUpperCase() || "";  
  if (region === "NO") return "NO";  
  if (region === "US") return "US";  
  if (region === "GB") return "GB";  
  if (["SE", "DK", "FI", "DE", "FR", "ES", "IT", "NL", "BE", "PT", "IE", "AT", "CH", "PL", "CZ"].includes(region)) return "EU";  
  return "OTHER";  
}  

function formatDistanceDisplay(meters: number | undefined, region: RegionCode, language: "no" | "en") {  
  if (meters == null) return "—";  
  if (region === "US") {  
    const feet = meters * 3.28084;  
    if (feet < 1000) return `${Math.round(feet)} ${language === "en" ? "ft" : "fot"}`;  
    const miles = meters / 1609.344;  
    return `${miles.toFixed(miles >= 10 ? 0 : 1)} ${language === "en" ? "mi" : "miles"}`;  
  }  
  if (meters >= 1000) return `${(meters / 1000).toFixed(0)} km`;  
  return `${meters} m`;  
}  

function rewardCurrencyCode(region: RegionCode): "NOK" | "USD" | "GBP" | "EUR" {  
  if (region === "NO") return "NOK";  
  if (region === "US") return "USD";  
  if (region === "GB") return "GBP";  
  return "EUR";  
}  
const COLORS: ColorOption[] = [  
  { label: "Svart", value: "black" },  
  { label: "Hvit", value: "white" },  
  { label: "Grå", value: "gray" },  
  { label: "Rød", value: "red" },  
  { label: "Oransje", value: "orange" },  
  { label: "Gul", value: "yellow" },  
  { label: "Grønn", value: "green" },  
  { label: "Blå", value: "blue" },  
  { label: "Lilla", value: "purple" },  
  { label: "Brun", value: "brown" },  
  { label: "Rosa", value: "pink" },  
  { label: "Beige", value: "beige" },  
  { label: "Mørkeblå (Navy)", value: "navy" },  
  { label: "Lyseblå", value: "light-blue" },  
  { label: "Turkis", value: "turquoise" },  
  { label: "Burgunder", value: "burgundy" },  
  { label: "Lime", value: "lime" },  
  { label: "Cyan", value: "cyan" },  
  { label: "Magenta", value: "magenta" },  
  { label: "Oliven", value: "olive" },  
  { label: "Gull", value: "gold" },  
  { label: "Sølv", value: "silver" },  
  { label: "Bronse", value: "bronze" },  
  { label: "Camo / Kamuflasje", value: "camo" },  
  { label: "Flerfarget", value: "multicolor" },  
  { label: "Mønstret", value: "patterned" },  
  { label: "Usikker", value: "unknown" },  
  { label: "Annet", value: "other" },  
];  
const pad = (n: number) => String(n).padStart(2, "0");  
function localizeCategoryLabel(label: string | undefined, language: "no" | "en") {  
  if (!label) return label ?? "";  
  const map: Record<string, string> = {  
    "Personlige eiendeler": "Personal belongings",  
    "Elektronikk": "Electronics",  
    "Vesker og bagasje": "Bags and luggage",  
    "Klær og tilbehør": "Clothing and accessories",  
    "Smykker": "Jewelry",  
    "Verktøy": "Tools",  
    "Bil / transport": "Vehicle / transport",  
    "Sport og friluft": "Sports and outdoors",  
    "Kultur og hobby": "Culture and hobbies",  
    "Husdyr": "Pets",
    "Barn og familie": "Children and family",  
    "Nøkler": "Keys",  
    "Lommebok": "Wallet",  
    "Mobiltelefon": "Mobile phone",  
    "Solbriller": "Sunglasses",  
    "Vanlige briller": "Glasses",  
    "Bankkort": "Bank card",  
    "ID-kort": "ID card",  
    "Pass": "Passport",  
    "Førerkort": "Driver's license",  
    "Høreapparat": "Hearing aid",  
    "Annet (personlige)": "Other (personal)",  
    "Hund": "Dog",  
    "Katt": "Cat",  
    "Fugl": "Bird",  
    "Kanin": "Rabbit",  
    "Annet (husdyr)": "Other (pet)",  
    "Egendefinert (skriv selv)": "Custom (type your own)",  
  };  
  return language === "en" ? (map[label] ?? label) : label;  
}  

function localizeObjectLabel(value: string | undefined, fallbackLabel: string | undefined, language: "no" | "en") {
  if (!value && !fallbackLabel) return "";
  if (language !== "en") return fallbackLabel ?? value ?? "";

  const map: Record<string, string> = {
    KEYS: "Keys",
    WALLET: "Wallet",
    MOBILE_PHONE: "Mobile phone",
    SUNGLASSES: "Sunglasses",
    GLASSES: "Glasses",
    BANK_CARD: "Bank card",
    ID_CARD: "ID card",
    PASSPORT: "Passport",
    DRIVER_LICENSE: "Driver's license",
    HEARING_AID: "Hearing aid",
    OTHER_PERSONAL: "Other personal item",

    HEADPHONES: "Headphones / AirPods",
    SMARTWATCH: "Smartwatch",
    TABLET: "Tablet",
    LAPTOP: "Laptop",
    POWERBANK: "Power bank",
    CAMERA: "Camera",
    OTHER_ELECTRONICS: "Other electronics",

    BACKPACK: "Backpack",
    HANDBAG: "Handbag",
    SUITCASE: "Suitcase",
    GYM_BAG: "Gym bag",
    LAPTOP_BAG: "Laptop bag",
    SHOULDER_BAG: "Shoulder bag",
    DOCUMENT_BRIEFCASE: "Document briefcase",
    SCHOOL_BAG: "School bag",
    TRAVEL_LUGGAGE: "Travel luggage",
    TOTE_BAG: "Tote bag",
    OTHER_BAGS: "Other bag/luggage",

    JACKET: "Jacket",
    HAT: "Hat / cap",
    GLOVES: "Gloves / mittens",
    SCARF: "Scarf",
    BELT: "Belt",
    SHOES: "Shoes",
    UMBRELLA: "Umbrella",
    OTHER_CLOTHING: "Other clothing/accessory",

    RING: "Ring",
    EARRINGS: "Earrings",
    NECKLACE: "Necklace",
    BRACELET: "Bracelet",
    WATCH: "Watch",
    OTHER_JEWELRY: "Other jewelry",

    TOOLS: "Tools",
    OTHER_TOOLS: "Other tools",

    CAR_KEYS: "Car keys",
    BICYCLE: "Bicycle",
    SCOOTER: "Scooter",
    OTHER_VEHICLE: "Other vehicle/transport",

    FOOTBALL: "Football",
    TENNIS_RACKET: "Tennis racket",
    FISHING_ROD: "Fishing rod",
    HEADLAMP: "Headlamp",
    CAMPING_GEAR: "Camping gear",
    SKIS: "Skis",
    SNOWBOARD: "Snowboard",
    HELMET: "Helmet",
    GOGGLES: "Goggles",
    WATER_BOTTLE: "Water bottle",
    OTHER_SPORT: "Other sports/outdoor item",

    BOOK: "Book",
    OTHER_HOBBY: "Other culture/hobby item",

    DOG: "Dog",
    CAT: "Cat",
    BIRD: "Bird",
    RABBIT: "Rabbit",
    KEYCHAIN: "Keychain", GLASSES_CASE: "Glasses case", ACCESS_CARD: "Access card", TRAVEL_CARD: "Travel card", STUDENT_CARD: "Student card", MEDICATION: "Medication", TOILETRY_BAG: "Toiletry bag",
    CHARGING_CASE: "Charging case", CHARGER: "Charger", CHARGING_CABLE: "Charging cable", SPEAKER: "Speaker", GAME_CONSOLE: "Game console", STYLUS: "Stylus", GPS_DEVICE: "GPS", TRACKER_TAG: "Tracker tag", PHONE_CASE: "Phone case",
    SPORTS_BAG: "Sports bag", CAMERA_BAG: "Camera bag", TOOL_BAG: "Tool bag", SHOPPING_BAG: "Shopping bag",
    SWEATER: "Sweater", TROUSERS: "Trousers", DRESS: "Dress", SHIRT: "Shirt", CAP: "Cap", BOOTS: "Boots",
    WEDDING_RING: "Wedding ring", ENGAGEMENT_RING: "Engagement ring", SIGNET_RING: "Signet ring", PENDANT: "Pendant", BROOCH: "Brooch", CUFFLINKS: "Cufflinks",
    MEASURING_TOOL: "Measuring tool", POWER_TOOL: "Power tool", BIKE_HELMET: "Bike helmet", VEHICLE_ACCESSORY: "Vehicle accessory",
    PADEL_RACKET: "Padel racket", GOLF_CLUB: "Golf club", GOLF_BAG: "Golf bag", HIKING_BACKPACK: "Hiking backpack", SLEEPING_BAG: "Sleeping bag",
    MUSICAL_INSTRUMENT: "Musical instrument", NOTEBOOK: "Notebook", CRAFT_ITEM: "Craft item",
    STROLLER: "Stroller", STUFFED_TOY: "Stuffed toy", PACIFIER: "Pacifier", LUNCH_BOX: "Lunch box", TOY: "Toy", CHILD_BACKPACK: "Child backpack", OTHER_CHILDREN: "Other child/family item",
    GUINEA_PIG: "Guinea pig", TURTLE: "Turtle", REPTILE: "Reptile",
    OTHER_PET: "Other pet",
    CUSTOM: "Custom (type your own)",
  };

  return map[String(value ?? "").toUpperCase()] ?? localizeCategoryLabel(fallbackLabel, language) ?? fallbackLabel ?? value ?? "";
}

function objectSearchAliases(value: string | undefined, noLabel: string | undefined, enLabel: string | undefined) {
  const key = String(value ?? "").toUpperCase();
  const base = [objectSearchText(key, noLabel ?? "", enLabel), key, noLabel ?? "", enLabel ?? ""];
  const aliases: Record<string, string[]> = {
    KEYS: ["nokkel", "nokler", "nøkkel", "nøkler", "keys", "key", "husnokkel", "bilnokkel"],
    CAR_KEYS: ["bilnokkel", "bilnøkler", "car key", "car keys", "carkey"],
    WALLET: ["lommebok", "wallet", "purse"],
    MOBILE_PHONE: ["mobil", "mobiltelefon", "iphone", "telefon", "phone", "mobile", "cellphone"],
    SUNGLASSES: ["solbriller", "sunglasses", "sun glasses"],
    GLASSES: ["briller", "vanlige briller", "glasses", "spectacles", "reading glasses"],
    RING: ["ring", "giftering", "forlovelsesring", "wedding ring", "engagement ring", "signetring"],
    WATCH: ["klokke", "ur", "watch"],
    EARRINGS: ["øredobber", "oredobber", "earrings", "earring"],
    NECKLACE: ["halskjede", "necklace", "chain"],
    BRACELET: ["armbånd", "armband", "bracelet"],
    HEADPHONES: ["airpods", "ørepropper", "orepropper", "hodetelefoner", "headphones", "earbuds", "earphones"],
    DOG: ["hund", "dog", "valp", "puppy"],
    CAT: ["katt", "cat", "kitten"],
    BICYCLE: ["sykkel", "bike", "bicycle"],
    BACKPACK: ["ryggsekk", "sekk", "backpack", "rucksack"],
    CHARGER: ["lader", "charger", "mobillader", "phone charger"],
    CHARGING_CASE: ["ladeetui", "airpods etui", "charging case", "earbud case"],
    ACCESS_CARD: ["adgangskort", "nøkkelkort", "access card", "key card"],
    WEDDING_RING: ["giftering", "wedding ring"],
    ENGAGEMENT_RING: ["forlovelsesring", "engagement ring"],
    STUFFED_TOY: ["kosedyr", "bamse", "stuffed toy", "teddy bear"],
    PACIFIER: ["smokk", "pacifier", "dummy"],
    LUNCH_BOX: ["matboks", "lunch box"],
  };
  return [...base, ...(aliases[key] ?? [])].join(" ");
}

function localizeColorLabel(label: string | undefined, language: "no" | "en") {  
  if (!label) return label ?? "";  
  const map: Record<string, string> = {  
    "Svart": "Black",  
    "Hvit": "White",  
    "Grå": "Gray",  
    "Rød": "Red",  
    "Oransje": "Orange",  
    "Gul": "Yellow",  
    "Grønn": "Green",  
    "Blå": "Blue",  
    "Lilla": "Purple",  
    "Brun": "Brown",  
    "Rosa": "Pink",  
    "Beige": "Beige",  
    "Mørkeblå (Navy)": "Dark blue (navy)",  
    "Lyseblå": "Light blue",  
    "Turkis": "Turquoise",  
    "Burgunder": "Burgundy",  
    "Lime": "Lime",  
    "Cyan": "Cyan",  
    "Magenta": "Magenta",  
    "Oliven": "Olive",  
    "Gull": "Gold",  
    "Sølv": "Silver",  
    "Bronse": "Bronze",  
    "Camo / Kamuflasje": "Camo / camouflage",  
    "Flerfarget": "Multicolor",  
    "Mønstret": "Patterned",  
    "Usikker": "Unknown",  
    "Annet": "Other",  
  };  
  return language === "en" ? (map[label] ?? label) : label;  
}  
const fmtLocal = (iso?: string) => {  
  if (!iso) return { date: "", time: "" };  
  const d = new Date(iso);  
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };  
  return {  
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,  
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,  
  };  
};  
const toISO = (dateStr: string, timeStr: string): string | undefined => {  
  if (!dateStr || !timeStr) return undefined;  
  const [Y, M, D] = dateStr.split("-").map(Number);  
  const [H, Min] = timeStr.split(":").map(Number);  
  if (![Y, M, D, H, Min].every((x) => Number.isFinite(x))) return undefined;  
  const dt = new Date(Y, (M || 1) - 1, D || 1, H || 0, Min || 0);  
  if (Number.isNaN(dt.getTime())) return undefined;  
  return dt.toISOString();  
};  
class ReportApiError extends Error {
  status: number;
  code?: string;
  serverMessage?: string;

  constructor(status: number, code?: string, serverMessage?: string) {
    super(serverMessage || code || `HTTP ${status}`);
    this.name = "ReportApiError";
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

function showReportApiError(
  error: any,
  language: "no" | "en",
  router: ReturnType<typeof useRouter>
) {
  const code = String(error?.code || "").toUpperCase();

  if (code === "LOST_REPORT_WEEKLY_LIMIT") {
    Alert.alert(
      language === "en" ? "Report limit reached" : "Grensen er nådd",
      language === "en"
        ? "You can create up to two lost reports within seven days. You can still edit or follow your existing cases under My cases."
        : "Du kan opprette maksimalt to mistet-rapporter i løpet av syv dager. Du kan fortsatt redigere eller følge opp eksisterende saker under Mine saker.",
      [
        { text: language === "en" ? "OK" : "OK", style: "cancel" },
        {
          text: language === "en" ? "Open My cases" : "Gå til Mine saker",
          onPress: () => router.replace("/my-reports"),
        },
      ]
    );
    return true;
  }

  if (code === "ACCOUNT_REQUIRED_FOR_LOST") {
    Alert.alert(
      language === "en" ? "Account required" : "Konto kreves",
      language === "en"
        ? "You need a regular account to create a lost report. Guests can only report found items."
        : "Du trenger en vanlig konto for å opprette en mistet-rapport. Gjest kan kun registrere funn.",
      [
        { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
        {
          text: language === "en" ? "Log in" : "Logg inn",
          onPress: () => router.push({ pathname: "/(auth)/login", params: { returnTo: "/(report)/create-report", intent: "lost" } }),
        },
      ]
    );
    return true;
  }

  if (code === "CRITICAL_EDIT_COOLDOWN") {
    Alert.alert(
      language === "en" ? "Change temporarily locked" : "Endringen er midlertidig låst",
      language === "en"
        ? "You recently changed the item, time or area. Please try again later."
        : "Du har nylig endret gjenstand, tidspunkt eller område. Prøv igjen senere."
    );
    return true;
  }

  if (code === "CRITICAL_EDIT_LIMIT_REACHED") {
    Alert.alert(
      language === "en" ? "Major change limit reached" : "Grensen for større endringer er nådd",
      language === "en"
        ? "You can still update the description, color, brand and reward."
        : "Du kan fortsatt oppdatere beskrivelse, farge, merke og finnerlønn."
    );
    return true;
  }

  return false;
}

export default function CreateReportScreen() {  
  const router = useRouter();  
  const { language } = useI18n();  
  const regionCode = useMemo(() => inferRegionCodeFromLocale(typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : ""), []);  
  const rewardEnabled = regionCode === "NO";  
  const activeCurrency = rewardCurrencyCode(regionCode);  
  const params = useLocalSearchParams<{ type?: ReportType; editReportId?: string }>();  
  const editReportId = typeof params?.editReportId === "string" ? params.editReportId : undefined;
  const isEditMode = !!editReportId;
  const { draft, setField, reset, flush, loading: draftLoading } = useReportDraft();  
  // Auto-scroll: ref + anchor  
  const scrollRef = useRef<ScrollView>(null);  
  const objectInputRef = useRef<TextInput>(null);
  const editLoadedRef = useRef<string | null>(null);  
  const [categoryAnchorY, setCategoryAnchorY] = useState(0);  
  const [saving, setSaving] = useState(false);
  const [validationMissing, setValidationMissing] = useState<string[]>([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [objectSectionY, setObjectSectionY] = useState(0);
  const [timeSectionY, setTimeSectionY] = useState(0);
  const [detailsSectionY, setDetailsSectionY] = useState(0);
  const [imagesSectionY, setImagesSectionY] = useState(0);
  const [continueWithoutImage, setContinueWithoutImage] = useState(false);
  const [photoPromptOpen, setPhotoPromptOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);  
  const [catOpen, setCatOpen] = useState(false);  
  const [colorOpen, setColorOpen] = useState(false);  
  const [color2Open, setColor2Open] = useState(false);  
  const [subOpen, setSubOpen] = useState(false);  
  const [subQuery, setSubQuery] = useState("");  
  const [objectQuery, setObjectQuery] = useState("");  
  const [objectOpen, setObjectOpen] = useState(false);  
  const [pendingImages, setPendingImages] = useState<string[]>([]);  
  const [uploading, setUploading] = useState(false);  
 // Lagret-modal (proff)  
 const [savedOpen, setSavedOpen] = useState(false);  
 const [savedReportId, setSavedReportId] = useState<string | null>(null);  
 const [savedCount, setSavedCount] = useState<number>(0);  
 const [savedType, setSavedType] = useState<ReportType>('LOST');  
  const savedTypeLabel = savedType === "FOUND" ? (language === "en" ? "found item" : "funn") : (language === "en" ? "lost item" : "mistet gjenstand");  
  // Sted (autofyll fra Google reverse geocode, men redigerbart)  
  const [locationLabel, setLocationLabel] = useState<string>((draft as any).locationLabel ?? "");  
  const [locationLabelTouched, setLocationLabelTouched] = useState(false);  
  useEffect(() => {  
    const t = params?.type;  
    if (t === "LOST" || t === "FOUND") setField("type" as any, t);  
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [params?.type]);  
  const type: ReportType = (draft.type as ReportType) ?? "LOST";  
  // FOUND: nøyaktig sted med liten radius (default 10m). LOST: radius kan være mer usikker og velges.  
  useEffect(() => {  
    if (type !== "FOUND") return;  
    const loc = (draft as any).location;  
    const current = loc?.radiusMeters;  
    if (current === 10) return;  
    setField("location" as any, {  
      latitude: loc?.latitude ?? latitude,  
      longitude: loc?.longitude ?? longitude,  
      radiusMeters: 10,
      confirmed: loc?.confirmed === true,
    });  
  }, [type]);  
  const category = (draft as any).category ?? "PERSONAL";  
  const subcategoryKey = (draft as any).subcategoryKey ?? "";  
  const subcategoryCustom = (draft as any).subcategoryCustom ?? "";  
  const description = (draft as any).description ?? "";  
  const color = (draft as any).color ?? "";  
  const colorSecondary = (draft as any).colorSecondary ?? "";  
  const brand = (draft as any).brand ?? "";  
  const rewardNOK = (draft as any).rewardNOK ?? "0";  
  const occurredAtISO = (draft as any).occurredAtISO as string | undefined;  
  const latitude = (draft as any).location?.latitude ?? 59.9139;  
  const longitude = (draft as any).location?.longitude ?? 10.7522;  
  const radiusMeters = (draft as any).location?.radiusMeters;  
  const effectiveRadiusMeters = type === "FOUND" ? 10 : radiusMeters;  
  const previewRegion = useMemo(  
    () => ({  
      latitude,  
      longitude,  
      latitudeDelta: 0.01,  
      longitudeDelta: 0.01,  
    }),  
    [latitude, longitude]  
  );    
  // Autofyll sted basert på lat/lng (via backend /geo/reverse).  
  // Overstyrer ikke hvis bruker har skrevet manuelt.  
  // Viktig: Beskytter mot race der en eldre reverse-geocode respons (gammel posisjon) kommer etter en nyere.  
  const geoReqRef = useRef(0);  
  useEffect(() => {  
    let alive = true;  
    (async () => {  
      if (locationLabelTouched) return;  
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;  
      const reqId = ++geoReqRef.current;  
      const lat0 = latitude;  
      const lng0 = longitude;  
      try {  
        const label = await reverseGeocodeToLabel(lat0, lng0, { language: language === "en" ? "en" : "no" });  
        if (!alive) return;  
        if (reqId !== geoReqRef.current) return;  
        if (lat0 !== latitude || lng0 !== longitude) return;  
        if (label) {  
          setLocationLabel(label);  
          setField("locationLabel" as any, label);  
        }  
      } catch {  
        // Ikke kritisk: brukeren kan skrive sted manuelt  
      }  
    })();  
    return () => {  
      alive = false;  
    };  
  }, [latitude, longitude, locationLabelTouched, setField]);  
const whatLabel = type === "FOUND" ? (language === "en" ? "What did you find?" : "Hva fant du?") : (language === "en" ? "What did you lose?" : "Hva har du mistet?");  
  const categoryLabel = useMemo(  
    () => localizeCategoryLabel(CATEGORIES.find((c) => c.value === category)?.label, language) ?? (language === "en" ? "Choose category" : "Velg kategori"),  
    [category, language]  
  );  
  const subOptions = useMemo(() => SUBCATEGORIES[category] || [], [category]);  
  const filteredSubOptions = useMemo(() => {  
    const q = subQuery.trim().toLowerCase();  
    if (!q) return subOptions;  
    return subOptions.filter((s) => s.label.toLowerCase().includes(q));  
  }, [subQuery, subOptions]);  
  // Global søk: normaliser (diakritikk + whitespace)  
  const normalize = (s: string) =>  
    s  
      .toLowerCase()  
      .normalize("NFD")  
      .replace(/[\u0300-\u036f]/g, "")  
      .replace(/\s+/g, " ")  
      .trim();  
  const subIndex = useMemo(() => {
    const catLabelByKey = new Map(CATEGORIES.map((c) => [c.value, c.label] as const));
    return Object.entries(SUBCATEGORIES).flatMap(([catKey, subs]) =>
      subs.map((s) => {
        const englishLabel = localizeObjectLabel(s.value, s.label, "en");
        return {
          catKey,
          catLabel: catLabelByKey.get(catKey) ?? catKey,
          subKey: s.value,
          subLabel: s.label,
          search: normalize(`${objectSearchAliases(s.value, s.label, englishLabel)} ${catLabelByKey.get(catKey) ?? ""}`),
        };
      })
    );
  }, []);
  const filteredObjects = useMemo(() => {  
    const q = normalize(objectQuery);  
    if (!q) return [];  
    if (q.length < 2) return [];  
    return subIndex.filter((x) => x.search.includes(q)).slice(0, 30);  
  }, [objectQuery, subIndex]);    
  // Underkategori-browsing (ikke låst til kategori): basert på global subIndex.  
  // Brukes når bruker vil browse uten å bruke objekt-søk (valgfritt).  
  const filteredSubIndex = useMemo(() => {  
    const q = normalize(subQuery);  
    if (!q) return subIndex;  
    return subIndex.filter((x) => x.search.includes(q));  
  }, [subQuery, subIndex]);  
  const subBrowseRows = useMemo(() => {  
    const out: any[] = [];  
    let prevCat = "";  
    for (const hit of filteredSubIndex) {  
      if (hit.catKey !== prevCat) {  
        out.push({ kind: "header", key: `h:${hit.catKey}`, label: hit.catLabel });  
        prevCat = hit.catKey;  
      }  
      out.push({ kind: "item", key: `i:${hit.catKey}:${hit.subKey}`, hit });  
    }  
    return out;  
  }, [filteredSubIndex]);  
const subcategoryLabel = useMemo(() => {
    if (!subcategoryKey) return language === "en" ? "Choose item" : "Velg gjenstand";
    const hit = subOptions.find((s) => s.value === subcategoryKey)?.label;
    return localizeObjectLabel(subcategoryKey, hit, language) || (language === "en" ? "Choose item" : "Velg gjenstand");
  }, [subcategoryKey, subOptions, language]);
  const colorLabel = useMemo(  
    () => (color ? localizeColorLabel(COLORS.find((c) => c.value === color)?.label, language) ?? (language === "en" ? "Choose color" : "Velg farge") : (language === "en" ? "Choose color" : "Velg farge")),  
    [color, language]  
  );  
  const color2Label = useMemo(  
    () =>  
      colorSecondary  
        ? localizeColorLabel(COLORS.find((c) => c.value === colorSecondary)?.label, language) ?? (language === "en" ? "Choose secondary color" : "Velg tilleggsfarge")  
        : (language === "en" ? "Choose secondary color" : "Velg tilleggsfarge"),  
    [colorSecondary, language]  
  );  
  const radiusLabel = formatDistanceDisplay(effectiveRadiusMeters, regionCode, language);  
  // Tid  
  const init = fmtLocal(occurredAtISO);  
  const [dateStr, setDateStr] = useState(init.date);  
  const [timeStr, setTimeStr] = useState(init.time);  
  // Synk lokal date/time når draft rehydreres (occurredAtISO kan komme etter mount)  
  useEffect(() => {  
    if (!occurredAtISO) return;  
    // Ikke overstyr hvis bruker allerede har skrevet noe  
    if (dateStr.trim() || timeStr.trim()) return;  
    const v = fmtLocal(occurredAtISO);  
    if (v.date) setDateStr(v.date);  
    if (v.time) setTimeStr(v.time);  
  }, [occurredAtISO]);  
  // Responsive default "nå"
  useEffect(() => {
    if (occurredAtISO || isEditMode) return;
    const now = new Date();
    now.setSeconds(0, 0);
    setField("occurredAtISO" as any, now.toISOString());
    setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }, [draftLoading, occurredAtISO, setField, isEditMode]);

  useEffect(() => {
    if (!editReportId || editLoadedRef.current === editReportId) return;
    let alive = true;
    (async () => {
      try {
        setEditLoading(true);
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          await flush();
          router.replace({ pathname: "/(auth)/login", params: { returnTo: "/(report)/create-report", intent: "lost" } });
          return;
        }
        const res = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(editReportId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? (language === "en" ? "Could not load case." : "Kunne ikke hente saken."));
        const report = json?.report;
        if (!report) throw new Error(language === "en" ? "Case was not found." : "Fant ikke saken.");
        if (report.type !== "LOST") throw new Error(language === "en" ? "Only lost reports can be edited for now." : "Foreløpig kan bare mistet-rapporter redigeres.");
        if (!alive) return;
        editLoadedRef.current = editReportId;
        setField("type" as any, "LOST");
        setField("category" as any, report.category ?? "PERSONAL");
        setField("subcategoryKey" as any, report.subcategory_key ?? "");
        setField("subcategoryCustom" as any, report.subcategory_custom ?? "");
        setField("description" as any, report.description ?? "");
        setField("color" as any, report.color ?? "");
        setField("colorSecondary" as any, "");
        setField("brand" as any, report.brand ?? "");
        setField("rewardNOK" as any, String(Math.round(Number(report.reward_ore || 0) / 100)));
        setField("occurredAtISO" as any, report.occurred_at);
        setField("location" as any, {
          latitude: Number(report.lat ?? 59.9139),
          longitude: Number(report.lng ?? 10.7522),
          radiusMeters: Number(report.radius_m ?? report.search_radius_m ?? report.area_radius_m ?? report.location_radius_m ?? 500),
        });
        const label = report.location_label ?? "";
        setLocationLabel(label);
        setLocationLabelTouched(!!label);
        setField("locationLabel" as any, label);
        const when = fmtLocal(report.occurred_at);
        setDateStr(when.date);
        setTimeStr(when.time);
      } catch (e: any) {
        Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not load case." : "Kunne ikke hente saken."));
      } finally {
        if (alive) setEditLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [editReportId, setField, router, language, flush]);

  const closeMenus = () => {  
    if (catOpen) setCatOpen(false);  
    if (colorOpen) setColorOpen(false);  
    if (color2Open) setColor2Open(false);  
    if (subOpen) setSubOpen(false);  
    if (objectOpen) setObjectOpen(false);  
  };  
  // Fjernet "Sett"-knappen: synk dato/tid når brukeren er ferdig å skrive  
  const syncDateTimeToDraft = () => {  
    const iso = toISO(dateStr.trim(), timeStr.trim());  
    if (iso) setField("occurredAtISO" as any, iso);  
  };  
  const openMap = () => {  
    closeMenus();  
    router.push("/(report)/map");  
  };  
  const scrollToCategorySection = () => {  
    requestAnimationFrame(() => {  
      scrollRef.current?.scrollTo({ y: Math.max(0, categoryAnchorY - 8), animated: true });  
    });  
  };  
  const applySubcategoryFromGlobalSearch = (catKey: string, subKey: string) => {  
    setField("category" as any, catKey);  
    setField("subcategoryKey" as any, subKey);  
    if (!(catKey === "PETS" && subKey === "CUSTOM")) {  
      setField("subcategoryCustom" as any, "");  
    }  
    setObjectOpen(false);  
    setObjectQuery("");  
    setSubQuery("");  
    setCatOpen(false);  
    setColorOpen(false);  
    setSubOpen(false);  
    scrollToCategorySection();  
  };  
  const setNow = () => {  
    const now = new Date();  
    now.setSeconds(0, 0);  
    setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);  
    setTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}`);  
    setField("occurredAtISO" as any, now.toISOString());  
    closeMenus();  
  };  
  const shiftMinutes = (mins: number) => {  
    const base = new Date(  
      occurredAtISO && !Number.isNaN(new Date(occurredAtISO).getTime()) ? occurredAtISO : new Date().toISOString()  
    );  
    base.setMinutes(base.getMinutes() + mins);  
    base.setSeconds(0, 0);  
    setDateStr(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`);  
    setTimeStr(`${pad(base.getHours())}:${pad(base.getMinutes())}`);  
    setField("occurredAtISO" as any, base.toISOString());  
    closeMenus();  
  };  
  const computedTitle = useMemo(() => {  
    const typeLabel = type === "FOUND" ? (language === "en" ? "Found" : "Funnet") : (language === "en" ? "Lost" : "Mistet");  
    const petCustom =  
      category === "PETS" && subcategoryKey === "CUSTOM" && subcategoryCustom.trim() ? subcategoryCustom.trim() : "";  
    const parts = [  
      typeLabel,  
      localizeCategoryLabel(categoryLabel, language),  
      subcategoryKey ? localizeCategoryLabel(subcategoryLabel, language) : "",  
      petCustom,  
      brand?.trim(),  
      colorLabel !== (language === "en" ? "Choose color" : "Velg farge") ? colorLabel : "",  
      colorSecondary ? color2Label : "",  
    ].filter(Boolean);  
    return parts.join(" • ");  
  }, [type, categoryLabel, subcategoryKey, subcategoryLabel, subcategoryCustom, category, brand, colorLabel, colorSecondary, color2Label, language]);  
  const validationKey = {
    item: language === "en" ? "Item" : "Gjenstand",
    color: language === "en" ? "Primary color" : "Hovedfarge",
    time: language === "en" ? "Date and time" : "Dato og tidspunkt",
    location: language === "en" ? "Confirmed location" : "Bekreftet sted",
  };
  const validate = () => {
    const missing: string[] = [];
    let firstY = 0;
    if (!subcategoryKey) { missing.push(validationKey.item); firstY = objectSectionY; }
    if (category === "PETS" && subcategoryKey === "CUSTOM" && !subcategoryCustom.trim()) { missing.push(language === "en" ? "Type of pet" : "Type husdyr"); firstY = firstY || objectSectionY; }
    if (!color) { missing.push(validationKey.color); firstY = firstY || detailsSectionY; }
    const iso = toISO(dateStr.trim(), timeStr.trim());
    if (!iso) { missing.push(validationKey.time); firstY = firstY || timeSectionY; }
    const locationConfirmed = (draft as any).location?.confirmed === true;
    if (!locationConfirmed || !locationLabel.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      missing.push(validationKey.location); firstY = firstY || timeSectionY;
    }
    if (type === "LOST" && rewardEnabled) {
      const n = Number(rewardNOK || "0");
      if (!Number.isFinite(n) || n < 0) missing.push(language === "en" ? "Valid reward amount" : "Gyldig finnerlønn");
    }
    if (missing.length) {
      setValidationMissing(missing);
      setValidationOpen(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, firstY - 12), animated: true }));
      return false;
    }
    setValidationMissing([]);
    if (iso) setField("occurredAtISO" as any, iso);
    return true;
  };

  const addFromGallery = async () => {  
    try {  
      const uri = await pickOneImage();  
      if (uri) {
        setPendingImages((prev) => [uri, ...prev]);
        setContinueWithoutImage(false);
      }  
    } catch (e: any) {  
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not open image library." : "Kunne ikke åpne bildebiblioteket."));  
    }  
  };  
  const addFromCamera = async () => {  
    try {  
      const uri = await captureOneImage();  
      if (uri) {
        setPendingImages((prev) => [uri, ...prev]);
        setContinueWithoutImage(false);
      }  
    } catch (e: any) {  
      Alert.alert(language === "en" ? "Error" : "Feil", e?.message ?? (language === "en" ? "Could not open camera." : "Kunne ikke åpne kamera."));  
    }  
  };  
  const removePending = (uri: string) => setPendingImages((prev) => prev.filter((u) => u !== uri));  
  const submitRef = useRef<(options?: { testOverrideWeeklyLimit?: boolean }) => Promise<void>>(async () => {});
  const appendToDescription = (line: string) => {  
    const current = String((draft as any).description ?? "").trim();  
    const clean = String(line || "").trim();  
    if (!clean) return;  
    const next = current ? `${current}\n${clean}` : clean;  
    setField("description" as any, next);  
  };  
  const onSubmit = useCallback(async (options?: { testOverrideWeeklyLimit?: boolean }) => {  
    console.log("[create-report] CTA pressed");  
    const log = (...args: any[]) => console.log("[create-report]", ...args);  
    if (!validate()) return;
    if (!isEditMode && pendingImages.length === 0 && !continueWithoutImage) {
      setPhotoPromptOpen(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, imagesSectionY - 12), animated: true }));
      return;
    }  
    // --- Progressive auth ved innsending ---  
    // FOUND: lav friksjon -> bruk session hvis finnes, ellers anonymous sign-in.  
    // LOST: krever ekte konto (ikke anonymous). Hvis ikke innlogget, send til login-skjerm.  
    try {  
      const returnTo = "/(report)/create-report";  
      if (type === "FOUND") {  
        const session = await ensureFoundIdentity();  
        const uid = session?.user?.id;  
        if (uid) {  
          try { await ensureProfileRow(uid); } catch (e: any) { log("ensureProfileRow warn", e?.message ?? e); }  
        }  
      } else {  
        const session = await ensureLostAuthenticated();  
        const uid = session?.user?.id;  
        if (uid) {  
          try { await ensureProfileRow(uid); } catch (e: any) { log("ensureProfileRow warn", e?.message ?? e); }  
        }  
      }  
    } catch (e: any) {  
      const code = e?.code || e?.message;  
      if (type === "LOST" && (code === "LOGIN_REQUIRED" || code === "UPGRADE_REQUIRED")) {  
        await flush();  
        router.push({ pathname: "/(auth)/login", params: { returnTo: "/(report)/create-report", intent: "lost", upgrade: code === "UPGRADE_REQUIRED" ? "1" : undefined } });  
        return;  
      }  
      throw e;  
    }  
    try {  
      setSaving(true);  
      const secondary = colorSecondary && colorSecondary !== color ? colorSecondary : "";  
      const secondaryLabel = secondary ? (COLORS.find((c) => c.value === secondary)?.label || secondary) : "";  
      const descriptionBase = description?.trim() || "";  
      const extraLine = secondaryLabel ? `${language === "en" ? "Secondary color" : "Tilleggsfarge"}: ${localizeColorLabel(secondaryLabel, language)}` : "";  
      const descriptionFull = (descriptionBase || extraLine)  
        ? [descriptionBase, extraLine].filter(Boolean).join("\n")  
        : undefined;  
      const when = (() => {  
        if (occurredAtISO) {  
          const d = new Date(occurredAtISO);  
          if (!Number.isNaN(d.getTime())) return d.toISOString();  
        }  
        return new Date().toISOString();  
      })();  
      const body: any = {  
        type,  
        category: category.trim().toUpperCase(),  
        subcategory_key: subcategoryKey ? String(subcategoryKey).trim().toUpperCase() : undefined,  
        subcategory_custom:  
          category === "PETS" && subcategoryKey === "CUSTOM" ? (subcategoryCustom.trim() || undefined) : undefined,  
        title: computedTitle,  
        description: descriptionFull,  
        color: color.trim() || undefined,  
        brand: brand.trim() || undefined,  
        occurred_at: when,  
        // ✅ VIKTIG: backend forventer lat/lng på toppnivå  
        lat: latitude,  
        lng: longitude,  
        // ✅ VIKTIG: send radius til backend, ellers blir matching pin-basert  
        radius_m: effectiveRadiusMeters ?? undefined,  
        location_label: locationLabel?.trim() || undefined,  
        ...(type === "LOST" && rewardEnabled ? { reward_ore: Math.max(0, Math.round(Number(rewardNOK) * 100)) } : {}),
        ...(options?.testOverrideWeeklyLimit ? { test_override_weekly_limit: true } : {}),
      };
      let accessToken: string | undefined;  
    const headers: Record<string, string> = { "Content-Type": "application/json" };  
      try {  
        const { data } = await supabase.auth.getSession();  
        const token = data.session?.access_token;  
      accessToken = token;  
        if (token) headers.Authorization = `Bearer ${token}`;  
      } catch {}  
      log("payload", body);  
      const controller = new AbortController();  
      const id = setTimeout(() => controller.abort(), 20_000);  
      let r: Response;  
      try {  
        r = await fetch(isEditMode && editReportId ? `${API_BASE_URL}/reports/${encodeURIComponent(editReportId)}` : `${API_BASE_URL}/reports`, {
          method: isEditMode ? "PATCH" : "POST",  
          headers,  
          body: JSON.stringify(body),  
          signal: controller.signal,  
        });  
      } catch (e: any) {  
        clearTimeout(id);  
        const msg =  
          e?.name === "AbortError"  
            ? "Tidsavbrudd: klarte ikke å nå serveren (20s)."  
            : `Nettverksfeil: ${e?.message || e}`;  
        log("POST /reports -> throw", msg);  
        throw new Error(msg);  
      } finally {  
        clearTimeout(id);  
      }  
      const raw = await r.text();  
      let data: any = null;  
      try {  
        data = raw ? JSON.parse(raw) : null;  
      } catch {}  
      if (!r.ok) {
        const errorCode = String(data?.error || "");
        const serverMessage = String(data?.message || data?.error || raw || "");
        log("POST /reports !ok", { status: r.status, errorCode, serverMessage, raw });
        const apiError = new ReportApiError(r.status, errorCode, serverMessage) as ReportApiError & { testOverrideAllowed?: boolean };
        apiError.testOverrideAllowed = data?.test_override_allowed === true;
        throw apiError;
      }  
      log("POST /reports ok", data);  
      const reportId: string | null = data?.report?.id ?? data?.id ?? null;  
      let count = data?.candidates?.length ?? 0;  
    // Hent faktisk match-count (match-motor kan være async etter lagring)  
    let matchCount: number | null = null;  
    if (reportId && accessToken) {  
      const fetchCount = async () => {  
        const rr = await fetch(`${API_BASE_URL}/matches?reportId=${encodeURIComponent(String(reportId))}`, {  
          headers: { Authorization: `Bearer ${accessToken}` },  
        });  
        const jj = await rr.json().catch(() => ({}));  
        if (!rr.ok) throw new Error(jj?.error ?? "Kunne ikke hente matcher");  
        const list = jj?.matches ?? [];  
        return Array.isArray(list) ? list.length : 0;  
      };  
      try {  
        matchCount = await fetchCount();  
        if (matchCount === 0) {  
          await new Promise((res) => setTimeout(res, 700));  
          matchCount = await fetchCount();  
        }  
      } catch {  
        matchCount = null;  
      }  
    }  
    if (matchCount != null) count = matchCount;  
      if (reportId && pendingImages.length > 0) {  
        try {  
          setUploading(true);  
          // --- Upload-diagnostikk ---  
          let sessInfo: any = null;  
          try {  
            const { data: sess } = await supabase.auth.getSession();  
            sessInfo = {  
              hasSession: !!sess.session,  
              userId: sess.session?.user?.id ?? null,  
              // Supabase Auth (anon sign-in) gir is_anonymous claim i JWT  
              isAnonymous: (sess.session?.user as any)?.is_anonymous ?? null,  
            };  
          } catch (e: any) {  
            sessInfo = {  
              hasSession: false,  
              userId: null,  
              isAnonymous: null,  
              error: e?.message ?? String(e),  
            };  
          }  
          log("upload session", sessInfo);  
          // Hvis du ikke er innlogget, vil Storage-policyer for "authenticated" feile.  
          // (For gjester: vi flytter opplasting til backend i neste steg.)  
          if (!sessInfo?.hasSession) {  
            // OK: opplasting går via backend (server-side) og kan fungere uten klient-session.  
            log("upload note", "ingen session i klienten (gjest)");  
          }  
          const results = await Promise.allSettled(  
            pendingImages.map(async (uri) => {  
              try {  
                return await uploadReportImage(String(reportId), uri);  
              } catch (err: any) {  
                const msg = err?.message ?? String(err);  
                throw new Error(`Upload feilet for ${uri}: ${msg}`);  
              }  
            })  
          );  
          const ok = results.filter((x) => x.status === "fulfilled").length;  
          const failed = results.length - ok;  
          const failedDetails = results  
            .map((r, idx) => ({ r, idx }))  
            .filter(({ r }) => r.status === "rejected")  
            .map(({ r, idx }) => ({  
              uri: pendingImages[idx],  
              reason:  
                (r as PromiseRejectedResult).reason?.message ??  
                String((r as PromiseRejectedResult).reason),  
            }));  
          log("uploads done", { ok, failed, failedDetails });  
          if (failed > 0) {  
            const first = failedDetails[0]?.reason ?? (language === "en" ? "Unknown error" : "Ukjent feil");  
            Alert.alert(  
              language === "en" ? "Images" : "Bilder",  
              `${language === "en" ? "Uploaded" : "Lastet opp"} ${ok} ${language === "en" ? "image(s)" : "bilde(r)"}. ${failed} ${language === "en" ? "failed" : "feilet"}.\n${first}`  
            );  
          }  
        } catch (e: any) {  
          log("uploads error", e?.message ?? e);  
          Alert.alert(language === "en" ? "Images" : "Bilder", e?.message ?? "Feil under opplasting av bilder.");  
        } finally {  
          setUploading(false);  
          setPendingImages([]);  
        }  
      }  
      reset();  
      if (reportId) {  
  setSavedType(type);  
  setSavedReportId(String(reportId));  
  setSavedCount(Number(count) || 0);  
  setSavedOpen(true);  
} else {  
  setSavedType(type);  
  setSavedReportId(null);  
  setSavedCount(0);  
  setSavedOpen(true);  
}  
    } catch (e: any) {
      const code = String(e?.code || "").toUpperCase();
      const testOverrideAllowed = e?.testOverrideAllowed === true;

      if (code === "LOST_REPORT_WEEKLY_LIMIT" && testOverrideAllowed && !options?.testOverrideWeeklyLimit) {
        Alert.alert(
          language === "en" ? "Report limit reached" : "Grensen er nådd",
          language === "en"
            ? "You can normally create up to two lost reports within seven days. As an approved test user, you can create this report anyway."
            : "Du kan normalt opprette maksimalt to mistet-rapporter i løpet av syv dager. Som godkjent testbruker kan du opprette rapporten likevel.",
          [
            { text: language === "en" ? "Cancel" : "Avbryt", style: "cancel" },
            {
              text: language === "en" ? "Open My cases" : "Gå til Mine saker",
              onPress: () => router.replace("/my-reports"),
            },
            {
              text: language === "en" ? "Create anyway" : "Opprett likevel",
              onPress: () => { void submitRef.current({ testOverrideWeeklyLimit: true }); },
            },
          ]
        );
        return;
      }

      if (showReportApiError(e, language, router)) return;
      const fallback = language === "en" ? "Could not save the case. Please try again." : "Kunne ikke lagre saken. Prøv igjen.";
      const msg = e instanceof ReportApiError ? (e.serverMessage || fallback) : (e?.message || fallback);
      console.log("[create-report] submit error:", msg);
      Alert.alert(language === "en" ? "Could not save" : "Kunne ikke lagre", msg);
    } finally {  
      setSaving(false);  
    }  
  }, [  
    type,  
    category,  
    subcategoryKey,  
    subcategoryCustom,  
    computedTitle,  
    description,  
    color,  
    colorSecondary,  
    brand,  
    rewardNOK,  
    latitude,  
    longitude,  
    locationLabel,  
    occurredAtISO,  
    pendingImages,  
    reset,  
    router,  
    subOptions.length,  
    dateStr,  
    timeStr,  
    rewardEnabled,  
    activeCurrency,  
  ]);  
  submitRef.current = onSubmit;

  return (  
    <>  
      <Stack.Screen options={{ headerShown: false }} />  
      <View style={styles.safe}>  
        <PremiumHeader
          title={isEditMode ? (language === "en" ? "Edit lost report" : "Rediger mistet-rapport") : type === "FOUND" ? (language === "en" ? "Report found" : "Registrer funn") : (language === "en" ? "Report lost" : "Registrer mistet")}
          onBack={() => {
            try {
              router.back();
            } catch {}
          }}
        />
        <KeyboardAvoidingView  
          behavior={Platform.select({ ios: "padding", android: "height" })}  
          style={styles.keyboardWrap}  
        >  
          <ScrollView  
      nestedScrollEnabled  
            ref={scrollRef}  
            contentContainerStyle={styles.container}  
            keyboardShouldPersistTaps="handled"  
            onScrollBeginDrag={closeMenus}  
          >  
            {/* Premium segmented control */}  
            <View style={styles.segmentedOuter}>  
              <Pressable  
                style={[styles.segmentedItem, type === "LOST" && styles.segmentedItemOn]}  
                onPress={() => {  
                  setField("type" as any, "LOST");  
                  closeMenus();  
                }}  
              >  
                <Text style={[styles.segmentedTxt, type === "LOST" && styles.segmentedTxtOn]}>{language === "en" ? "Lost" : "Mistet"}</Text>  
              </Pressable>  
              <Pressable  
                style={[styles.segmentedItem, type === "FOUND" && styles.segmentedItemOn]}  
                onPress={() => {  
                  setField("type" as any, "FOUND");  
                  closeMenus();  
                }}  
              >  
                <Text style={[styles.segmentedTxt, type === "FOUND" && styles.segmentedTxtOn]}>{language === "en" ? "Found" : "Funnet"}</Text>  
              </Pressable>  
            </View>  
            {/* CARD: Objekt */}
            <View onLayout={(e) => setObjectSectionY(e.nativeEvent.layout.y)} style={styles.card}>
              <Text style={styles.h2}>{whatLabel}</Text>
              <Text style={styles.caption}>{language === "en" ? "Item" : "Gjenstand"}</Text>
              <Text style={styles.muted}>{language === "en" ? "Type what was lost or found. For example: wedding ring, keys, sunglasses, dog." : "Skriv hva du har mistet eller funnet. For eksempel: giftering, nøkler, solbriller, hund."}</Text>

              <View style={[styles.selectWrap, objectOpen && styles.selectWrapOn]} pointerEvents="box-none">
                <TextInput
                  ref={objectInputRef}
                  style={styles.input}
                  value={objectQuery}
                  onPressIn={() => {
                    if (!objectOpen) setObjectOpen(true);
                    if (catOpen) setCatOpen(false);
                    if (colorOpen) setColorOpen(false);
                    if (color2Open) setColor2Open(false);
                    if (subOpen) setSubOpen(false);
                  }}
                  onChangeText={(txt) => {
                    setObjectQuery(txt);
                    if (!objectOpen) setObjectOpen(true);
                  }}
                  placeholder={language === "en" ? "Type e.g. wedding ring, keys, sunglasses…" : "Skriv f.eks. giftering, nøkler, solbriller…"}
                  placeholderTextColor={theme.colors.muted}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {objectOpen && (
                  <View style={[styles.selectMenu, { top: 52 }]} pointerEvents="auto">
                    {objectQuery.trim().length < 2 ? (
                      <View style={{ padding: theme.space.md }}>
                        <Text style={styles.muted}>{language === "en" ? "Type at least 2 characters to search." : "Skriv minst 2 tegn for å søke."}</Text>
                      </View>
                    ) : filteredObjects.length === 0 ? (
                      <View style={{ padding: theme.space.md }}>
                        <Text style={styles.muted}>{language === "en" ? "No item found. Try another word, or describe it in the comment field." : "Fant ikke gjenstanden. Prøv et annet ord, eller beskriv den i kommentarfeltet."}</Text>
                      </View>
                    ) : (
                      filteredObjects.map((hit) => (
                        <Pressable
                          key={`${hit.catKey}:${hit.subKey}`}
                          style={styles.selectItem}
                          onPress={() => applySubcategoryFromGlobalSearch(hit.catKey, hit.subKey)}
                        >
                          <Text style={styles.selectItemTxt}>{localizeObjectLabel(hit.subKey, hit.subLabel, language)}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </View>

              <View onLayout={(e) => setCategoryAnchorY(e.nativeEvent.layout.y)} />
              <Text style={[styles.caption, { marginTop: theme.space.lg }]}>{language === "en" ? "Selected item" : "Valgt gjenstand"}</Text>
              <View style={[styles.selectedObjectBox, validationMissing.some((x) => x === "Item" || x === "Gjenstand") && styles.inputError]}>
                <Text style={styles.selectedObjectTxt}>{subcategoryLabel}</Text>
              </View>

              {category === "PETS" && subcategoryKey === "CUSTOM" && (
                <>
                  <Text style={[styles.caption, { marginTop: theme.space.md }]}>{language === "en" ? "Specify pet" : "Spesifiser husdyr"}</Text>
                  <TextInput
                    style={styles.input}
                    value={subcategoryCustom}
                    onChangeText={(v) => setField("subcategoryCustom" as any, v)}
                    placeholder={language === "en" ? "E.g. guinea pig, turtle, goat…" : "F.eks. marsvin, skilpadde, geit…"}
                    placeholderTextColor={theme.colors.muted}
                  />
                </>
              )}
            </View>
            {/* CARD: Detaljer */}
            <View onLayout={(e) => setDetailsSectionY(e.nativeEvent.layout.y)} style={[styles.card, (colorOpen || color2Open) && styles.cardOnTop, validationMissing.includes(validationKey.color) && styles.cardError]}>  
              <Text style={styles.h2}>{language === "en" ? "Details" : "Detaljer"}</Text>  
              <View style={[styles.row, { marginTop: theme.space.md, alignItems: "flex-start" }]}>  
                <View style={{ flex: 1 }}>  
                  <Text style={styles.caption}>{language === "en" ? "Primary color" : "Hovedfarge"}</Text>  
                  <Pressable  
                    style={[styles.selectBtn, validationMissing.includes(validationKey.color) && styles.inputError]}  
                    onPress={() => {  
                      setColorOpen((v) => !v);  
                      setCatOpen(false);  
                      setSubOpen(false);  
                      setObjectOpen(false);  
                    }}  
                  >  
                    <Text style={styles.selectBtnTxt}>{colorLabel} ▾</Text>  
                  </Pressable>  
                  {colorOpen && (  
                    <View style={styles.selectMenu}>  
                      <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">  
                      {COLORS.map((opt) => (  
                        <Pressable  
                          key={opt.value}  
                          style={[styles.selectItem, color === opt.value && styles.selectItemActive]}  
                          onPress={() => {  
                            setField("color" as any, opt.value);  
                            setColorOpen(false);  
                          }}  
                        >  
                          <Text style={[styles.selectItemTxt, color === opt.value && styles.selectItemTxtActive]}>  
                            {localizeColorLabel(opt.label, language)}  
                          </Text>  
                        </Pressable>  
                      ))}  
                      {!!color && (  
                        <Pressable  
                          style={styles.selectItem}  
                          onPress={() => {  
                            setField("color" as any, "");  
                            setColorOpen(false);  
                          }}  
                        >  
                          <Text style={styles.selectItemTxt}>{language === "en" ? "Remove color" : "Fjern farge"}</Text>  
                        </Pressable>  
                      )}  
                      </ScrollView>  
                    </View>  
                  )}  
{/* removed stray token */}  
                  {validationMissing.includes(validationKey.color) && <Text style={styles.errorText}>{language === "en" ? "Choose a primary color." : "Velg en hovedfarge."}</Text>}
                  <Text style={[styles.caption, { marginTop: theme.space.md }]}>{language === "en" ? "Secondary color (optional)" : "Tilleggsfarge (valgfritt)"}</Text>  
                  <Pressable  
                    style={styles.selectBtn}  
                    onPress={() => {  
                      setColor2Open((v) => !v);  
                      setColorOpen(false);  
                      setCatOpen(false);  
                      setSubOpen(false);  
                      setObjectOpen(false);  
                    }}  
                  >  
                    <Text style={styles.selectBtnTxt}>{color2Label} ▾</Text>  
                  </Pressable>  
                  {color2Open && (  
                    <View style={styles.selectMenu}>  
                      <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">  
                      {COLORS.map((opt) => {  
                        const disabled = opt.value === color;  
                        return (  
                          <Pressable  
                            key={opt.value}  
                            style={[  
                              styles.selectItem,  
                              colorSecondary === opt.value && styles.selectItemActive,  
                              disabled && { opacity: 0.4 },  
                            ]}  
                            onPress={() => {  
                              if (disabled) return;  
                              setField("colorSecondary" as any, opt.value);  
                              setColor2Open(false);  
                            }}  
                          >  
                            <Text  
                              style={[  
                                styles.selectItemTxt,  
                                colorSecondary === opt.value && styles.selectItemTxtActive,  
                              ]}  
                            >  
                              {localizeColorLabel(opt.label, language)}  
                            </Text>  
                          </Pressable>  
                        );  
                      })}  
                      {!!colorSecondary && (  
                        <Pressable  
                          style={styles.selectItem}  
                          onPress={() => {  
                            setField("colorSecondary" as any, "");  
                            setColor2Open(false);  
                          }}  
                        >  
                          <Text style={styles.selectItemTxt}>{language === "en" ? "Remove secondary color" : "Fjern tilleggsfarge"}</Text>  
                        </Pressable>  
                      )}  
                      </ScrollView>  
                    </View>  
                  )}  
</View>  
                <View style={{ width: 8 }} />  
                <View style={{ flex: 1 }}>  
                  <Text style={styles.caption}>{language === "en" ? "Brand (optional)" : "Merke (valgfri)"}</Text>  
                  <TextInput  
                    style={styles.input}  
                    value={brand}  
                    onChangeText={(v) => setField("brand" as any, v)}  
                    placeholder={language === "en" ? "Apple" : "Apple"}  
                    placeholderTextColor={theme.colors.muted}  
                  />  
                </View>  
              </View>

              <Text style={[styles.caption, { marginTop: theme.space.lg }]}>{language === "en" ? "Comment (optional)" : "Kommentar (valgfritt)"}</Text>
              <TextInput
                style={[styles.input, { minHeight: 76 }]}
                value={description}
                onChangeText={(v) => setField("description" as any, v)}
                placeholder={language === "en" ? "Describe important details, identifiers or handover preferences." : "Beskriv kjennetegn, detaljer eller preferanse for overlevering."}
                placeholderTextColor={theme.colors.muted}
                multiline
              />
            </View>
            {/* CARD: Tid & sted */}
            <View onLayout={(e) => setTimeSectionY(e.nativeEvent.layout.y)} style={[styles.card, validationMissing.includes(validationKey.time) && styles.cardError, validationMissing.includes(validationKey.location) && styles.cardError]}>  
              <Text style={styles.h2}>{language === "en" ? "Time & place" : "Tid & sted"}</Text>  
              <Text style={styles.muted}>{language === "en" ? `Radius: ${type === "FOUND" ? `${radiusLabel} (precise)` : radiusLabel}` : `Radius: ${type === "FOUND" ? `${radiusLabel} (nøyaktig)` : radiusLabel}`}</Text>  
              <Text style={styles.caption}>{type === "LOST" ? (language === "en" ? "Estimated time lost" : "Antatt tidspunkt mistet") : (language === "en" ? "Time (if known)" : "Tidspunkt (hvis kjent)")}</Text>  
              <View style={[styles.row, { alignItems: "center" }]}>  
                <TextInput  
                  style={[styles.input, styles.inputCompact, { flex: 1 }]}  
                  value={dateStr}  
                  onChangeText={setDateStr}  
                  onEndEditing={syncDateTimeToDraft}  
                  placeholder="YYYY-MM-DD"  
                  placeholderTextColor={theme.colors.muted}  
                />  
                <View style={{ width: 8 }} />  
                <TextInput  
                  style={[styles.input, styles.inputCompact, { flex: 1 }]}  
                  value={timeStr}  
                  onChangeText={setTimeStr}  
                  onEndEditing={syncDateTimeToDraft}  
                  placeholder="HH:mm"  
                  placeholderTextColor={theme.colors.muted}  
                />  
              </View>  
              <View style={[styles.row, { justifyContent: "flex-start", marginTop: theme.space.md }]}>  
                <Pressable style={styles.chip} onPress={setNow}>  
                  <Text style={styles.chipTxt}>{language === "en" ? "Now" : "Nå"}</Text>  
                </Pressable>  
                <Pressable style={styles.chip} onPress={() => shiftMinutes(-60)}>  
                  <Text style={styles.chipTxt}>{language === "en" ? "-1 h" : "-1 t"}</Text>  
                </Pressable>  
                <Pressable style={styles.chip} onPress={() => shiftMinutes(-1440)}>  
                  <Text style={styles.chipTxt}>{language === "en" ? "-1 day" : "-1 dag"}</Text>  
                </Pressable>  
              </View>  
              <Text style={[styles.caption, { marginTop: theme.space.lg }]}>{language === "en" ? "Position" : "Posisjon"}</Text>  
              <Text style={styles.muted}>{language === "en" ? "Choose the place on the map or enter an address / place description." : "Velg sted på kart eller skriv inn adresse / stedsbeskrivelse."}</Text>    
              <Text style={[(draft as any).location?.confirmed === true ? styles.confirmedText : styles.unconfirmedText]}>{(draft as any).location?.confirmed === true ? (language === "en" ? "✓ Location confirmed" : "✓ Sted bekreftet") : (language === "en" ? "Location must be confirmed on the map" : "Stedet må bekreftes på kartet")}</Text>
              <Pressable style={[styles.mapPreviewWrap, validationMissing.includes(validationKey.location) && styles.inputError]} onPress={openMap}>  
                <View pointerEvents="none" style={styles.mapPreviewInner}>  
                  <MapView  
                    provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}  
                    style={StyleSheet.absoluteFill}  
                    key={`preview-${latitude}-${longitude}`}  
 initialRegion={previewRegion}  
                    scrollEnabled={false}  
                    zoomEnabled={false}  
                    rotateEnabled={false}  
                    pitchEnabled={false}  
                  >  
                    <Marker coordinate={{ latitude, longitude }} />  
                  </MapView>  
                  <View style={styles.mapPreviewBadge}>  
                    <Text style={styles.mapPreviewBadgeTxt}>{language === "en" ? "Tap to choose on map" : "Trykk for å velge på kart"}</Text>  
                  </View>  
                </View>  
              </Pressable>  
              <Pressable style={[styles.primaryBtn, { marginTop: theme.space.md }]} onPress={openMap}>  
                <Text style={styles.primaryBtnTxt}>{language === "en" ? "Choose on map" : "Velg på kart"}</Text>  
              </Pressable>  
            </View>
<Text style={[styles.caption, { marginTop: theme.space.lg }]}>{language === "en" ? "Place" : "Sted"}</Text>  
<TextInput  
  style={styles.input}  
  value={locationLabel}  
  onChangeText={(v) => {  
    setLocationLabel(v);  
    setLocationLabelTouched(true);  
    setField('locationLabel' as any, v);  
  }}  
  placeholder={language === "en" ? "Address, place or place description" : "Adresse, sted eller stedsbeskrivelse"}  
  placeholderTextColor={theme.colors.muted}  
/>  
            {/* Finnerlønn */}  
            {type === "LOST" && rewardEnabled && (  
              <View style={styles.card}>  
                <Text style={styles.h2}>{language === "en" ? "Reward (optional)" : "Finnerlønn (valgfritt)"}</Text>  
                <Text style={styles.muted}>  
                  {language === "en" ? `Reward is optional. Currency for this market: ${activeCurrency}.` : `Finnerlønn er frivillig. Valuta for dette markedet: ${activeCurrency}.`}  
                </Text>  
                <Text style={styles.caption}>{language === "en" ? "Suggestions" : "Forslag"}</Text>  
                <View style={[styles.row, { flexWrap: "wrap", gap: 8, marginTop: theme.space.sm }]}>  
                  {[0, 50, 100, 250].map((n) => (  
                    <Pressable  
                      key={String(n)}  
                      style={[styles.chip, Number(rewardNOK) === n && styles.chipOn]}  
                      onPress={() => setField("rewardNOK" as any, String(n))}  
                    >  
                      <Text style={[styles.chipTxt, Number(rewardNOK) === n && styles.chipTxtOn]}>{n} {activeCurrency}</Text>  
                    </Pressable>  
                  ))}  
                </View>  
                <Text style={[styles.caption, { marginTop: theme.space.md }]}>{language === "en" ? `Custom amount (${activeCurrency})` : `Eget beløp (${activeCurrency})`}</Text>  
                <TextInput  
                  style={styles.input}  
                  value={String(rewardNOK)}  
                  onChangeText={(v) => setField("rewardNOK" as any, v)}  
                  keyboardType="numeric"  
                  placeholder="0"  
                  placeholderTextColor={theme.colors.muted}  
                />  
              </View>  
            )}  
            {type === "LOST" && !rewardEnabled && (  
              <View style={styles.card}>  
                <Text style={styles.h2}>{language === "en" ? "Reward" : "Finnerlønn"}</Text>  
                <Text style={styles.muted}>  
                  {language === "en" ? `Local currency support is not enabled for ${activeCurrency} yet. Reward is currently available in Norway only.` : `Lokal valutastøtte for ${activeCurrency} er ikke aktivert ennå. Finnerlønn er foreløpig kun tilgjengelig i Norge.`}  
                </Text>  
              </View>  
            )}  
            {type === "LOST" && (  
              <Pressable  
                style={[styles.selectBtn, { marginTop: theme.space.md, alignItems: "center" }]}  
                onPress={() => router.push("/premium-status")}  
              >  
                <Text style={styles.selectBtnTxt}>  
                  {language === "en" ? "View premium status" : "Se premiumstatus"}  
                </Text>  
              </Pressable>  
            )}  
            {/* Bilder */}
            <View onLayout={(e) => setImagesSectionY(e.nativeEvent.layout.y)} style={styles.card}>  
              <Text style={styles.h2}>{language === "en" ? "Images" : "Bilder"}</Text>  
              <View style={[styles.row, { marginTop: theme.space.md }]}>  
                <Pressable style={styles.primaryBtn} onPress={addFromGallery}>  
                  <Text style={styles.primaryBtnTxt}>{language === "en" ? "Choose from gallery" : "Velg fra galleri"}</Text>  
                </Pressable>  
                <View style={{ width: 8 }} />  
                <Pressable style={styles.primaryBtn} onPress={addFromCamera}>  
                  <Text style={styles.primaryBtnTxt}>{language === "en" ? "Take photo" : "Ta bilde"}</Text>  
                </Pressable>  
              </View>  
              {pendingImages.length === 0 ? (  
                <Text style={styles.muted}>{language === "en" ? "No images selected yet." : "Ingen bilder valgt ennå."}</Text>  
              ) : (  
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: theme.space.md }}>  
                  {pendingImages.map((uri) => (  
                    <View key={uri} style={{ marginRight: theme.space.md, marginBottom: theme.space.md }}>  
                      <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: theme.radius.md }} />  
                      <Pressable onPress={() => removePending(uri)} style={{ marginTop: theme.space.xs }}>  
                        <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>{language === "en" ? "Remove" : "Fjern"}</Text>  
                      </Pressable>  
                    </View>  
                  ))}  
                </View>  
              )}  
            </View>  
            {/* CTA */}  
            <Pressable style={[styles.ctaBtn, saving && { opacity: 0.7 }]} onPress={() => void onSubmit()} disabled={saving || editLoading}>  
              <Text style={styles.ctaTxt}>  
                {saving
                  ? (language === "en" ? "Saving…" : "Lagrer…")
                  : editLoading
                  ? (language === "en" ? "Loading case…" : "Laster sak…")
                  : uploading
                  ? (language === "en" ? "Saving & uploading…" : "Lagrer & laster opp…")
                  : isEditMode
                  ? (language === "en" ? "Save changes" : "Lagre endringer")
                  : type === "FOUND"
                  ? (language === "en" ? "Report found item" : "Meld inn funn")
                  : (language === "en" ? "Report lost item" : "Meld inn mistet gjenstand")}              </Text>  
            </Pressable>  
            <View style={{ height: theme.space.xl }} />  
          </ScrollView>  
        </KeyboardAvoidingView>  
 <Modal visible={validationOpen} transparent animationType="fade" onRequestClose={() => setValidationOpen(false)}>
   <View style={modalStyles.backdrop}>
     <View style={modalStyles.card}>
       <View style={[modalStyles.icon, { backgroundColor: "#FEF3C7" }]}><Text style={[modalStyles.iconTxt, { color: "#B45309" }]}>!</Text></View>
       <Text style={modalStyles.title}>{language === "en" ? "The report is incomplete" : "Rapporten er ikke fullstendig"}</Text>
       <Text style={modalStyles.body}>{language === "en" ? "Complete the highlighted fields before submitting the report." : "Fyll ut de markerte feltene før rapporten sendes inn."}</Text>
       <View style={styles.missingList}>{validationMissing.map((item) => <Text key={item} style={styles.missingItem}>• {item}</Text>)}</View>
       <Pressable style={[modalStyles.btn, modalStyles.btnPrimary, { marginTop: 16 }]} onPress={() => setValidationOpen(false)}><Text style={modalStyles.btnPrimaryTxt}>{language === "en" ? "Go to first missing field" : "Gå til første manglende felt"}</Text></Pressable>
     </View>
   </View>
 </Modal>
 <Modal visible={photoPromptOpen} transparent animationType="fade" onRequestClose={() => setPhotoPromptOpen(false)}>
   <View style={modalStyles.backdrop}><View style={modalStyles.card}>
     <View style={[modalStyles.icon, { backgroundColor: "#EEF2FF" }]}><Text style={[modalStyles.iconTxt, { color: theme.colors.primary }]}>+</Text></View>
     <Text style={modalStyles.title}>{language === "en" ? "Continue without a photo?" : "Fortsette uten bilde?"}</Text>
     <Text style={modalStyles.body}>{language === "en" ? "A photo can make the item easier to identify and improve possible matches." : "Et bilde kan gjøre gjenstanden enklere å identifisere og forbedre mulige treff."}</Text>
     <View style={modalStyles.actions}>
       <Pressable style={[modalStyles.btn, modalStyles.btnOutline]} onPress={() => { setPhotoPromptOpen(false); requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, imagesSectionY - 12), animated: true })); }}><Text style={modalStyles.btnOutlineTxt}>{language === "en" ? "Add photo" : "Legg til bilde"}</Text></Pressable>
       <Pressable style={[modalStyles.btn, modalStyles.btnPrimary]} onPress={() => { setPhotoPromptOpen(false); setContinueWithoutImage(true); setTimeout(() => { void submitRef.current(); }, 0); }}><Text style={modalStyles.btnPrimaryTxt}>{language === "en" ? "Continue" : "Fortsett"}</Text></Pressable>
     </View>
   </View></View>
 </Modal>
 {/* Lagret-modal (proff) */}  
 <Modal  
   visible={savedOpen}  
   transparent  
   animationType="fade"  
   onRequestClose={() => setSavedOpen(false)}  
 >  
   <Pressable style={modalStyles.backdrop} onPress={() => setSavedOpen(false)}>  
     <Pressable style={modalStyles.card} onPress={() => {}}>  
       <View style={modalStyles.icon}>  
         <Text style={modalStyles.iconTxt}>✓</Text>  
       </View>  
       <Text style={modalStyles.title}>{isEditMode ? (language === "en" ? "Case updated" : "Sak oppdatert") : (language === "en" ? "Case created" : "Sak opprettet")}</Text>  
       <Text style={modalStyles.body}>  
         {isEditMode
           ? (language === "en" ? "The report has been updated. Matches are being refreshed if relevant changes were made." : "Rapporten er oppdatert. Treff oppdateres på nytt hvis relevante endringer ble gjort.")
           : savedReportId
           ? (savedCount > 0
               ? (language === "en" ? `Case created (${savedTypeLabel}). Suggested matches: ${savedCount}` : `Sak opprettet (${savedTypeLabel}). Foreslåtte treff: ${savedCount}`)
               : (language === "en" ? `Case created (${savedTypeLabel}). Matches are updating…` : `Sak opprettet (${savedTypeLabel}). Treff oppdateres…`))
           : (language === "en" ? `Case created (${savedTypeLabel}).` : `Sak opprettet (${savedTypeLabel}).`)}  
       </Text>  
       <View style={modalStyles.actions}>  
         <Pressable  
           style={[modalStyles.btn, modalStyles.btnOutline]}  
           onPress={() => {  
             setSavedOpen(false);  
             router.replace("/");  
           }}  
         >  
           <Text style={modalStyles.btnOutlineTxt}>{language === "en" ? "To home" : "Til forsiden"}</Text>  
         </Pressable>  
         <Pressable  
           style={[modalStyles.btn, modalStyles.btnPrimary, !savedReportId && { opacity: 0.4 }]}  
           disabled={!savedReportId}  
           onPress={() => {  
             if (!savedReportId) return;  
             setSavedOpen(false);  
             router.push({ pathname: "/match", params: { reportId: savedReportId } });  
           }}  
         >  
           <Text style={modalStyles.btnPrimaryTxt}>{language === "en" ? "View matches" : "Se treff"}</Text>  
         </Pressable>  
       </View>  
     </Pressable>  
   </Pressable>  
 </Modal>  
      </View>  
    </>  
  );  
}  
const styles = StyleSheet.create({  
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  keyboardWrap: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: {  
    flexDirection: "row",  
    alignItems: "center",  
    justifyContent: "space-between",  
    paddingHorizontal: theme.space.lg,  
    paddingTop: theme.space.sm,  
    paddingBottom: theme.space.sm,  
    backgroundColor: theme.colors.bg,  
  },  
  topBarBtn: {  
    width: 44,  
    height: 44,  
    borderRadius: 22,  
    alignItems: "center",  
    justifyContent: "center",  
    backgroundColor: theme.colors.card,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    ...theme.shadow.card,  
  },  
  topBarBtnTxt: {  
    fontSize: 26,  
    fontWeight: "900",  
    color: theme.colors.text,  
    marginTop: -2,  
  },  
  topBarTitle: {  
    flex: 1,  
    textAlign: "center",  
    marginHorizontal: theme.space.sm,  
    fontSize: 16,  
    fontWeight: "900",  
    color: theme.colors.text,  
    fontFamily: "Inter_800ExtraBold",  
  },  
  container: {  
    paddingHorizontal: theme.space.lg,  
    paddingTop: theme.space.md,  
    paddingBottom: 80,  
    backgroundColor: theme.colors.bg,  
    flexGrow: 1,  
  },  
  row: { flexDirection: "row" },  
  card: {  
    position: "relative",  
    backgroundColor: theme.colors.card,  
    borderRadius: theme.radius.lg,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    padding: theme.space.lg,  
    marginTop: theme.space.md,  
    ...theme.shadow.card,  
  },  
  // Løft kortet over andre når dropdown er åpen (hindrer at meny skjules bak andre cards)  
  inputError: { borderColor: theme.colors.danger, borderWidth: 1.5, backgroundColor: "#FFF7F7" },
  cardError: { borderColor: theme.colors.danger, borderWidth: 1.5 },
  errorText: { marginTop: 7, color: theme.colors.danger, fontWeight: "800", fontSize: 12 },
  confirmedText: { marginTop: 9, color: "#15803D", fontWeight: "800", fontSize: 12 },
  unconfirmedText: { marginTop: 9, color: "#B45309", fontWeight: "800", fontSize: 12 },
  missingList: { marginTop: 14, backgroundColor: "#FFF7ED", borderRadius: 12, padding: 12 },
  missingItem: { color: "#9A3412", fontWeight: "800", marginVertical: 2 },
  cardOnTop: {  
    zIndex: 5000,  
    ...Platform.select({ android: { elevation: 30 } }),  
  },  
  h2: {  
    fontSize: theme.type.h2,  
    fontWeight: "800",  
    color: theme.colors.text,  
    fontFamily: "Inter_800ExtraBold",  
  },  
  caption: {  
    fontSize: theme.type.caption,  
    fontWeight: "700",  
    color: theme.colors.muted,  
    marginTop: theme.space.md,  
    fontFamily: "Inter_700Bold",  
  },  
  muted: {  
    fontSize: theme.type.caption,  
    fontWeight: "600",  
    color: theme.colors.muted,  
    marginTop: theme.space.sm,  
    fontFamily: "Inter_600SemiBold",  
  },  
  labelSmall: {  
    fontSize: theme.type.small,  
    fontWeight: "700",  
    color: theme.colors.muted,  
    marginTop: theme.space.md,  
    fontFamily: "Inter_600SemiBold",  
  },  
  input: {  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    paddingHorizontal: theme.space.md,  
    paddingVertical: 12,  
    borderRadius: theme.radius.md,  
    backgroundColor: theme.colors.inputBg,  
    marginTop: theme.space.sm,  
    color: theme.colors.text,  
    fontSize: theme.type.body,  
    fontFamily: "Inter_400Regular",  
  },  
  // Kompakt variant for dato/tid (premium-polish)  
  inputCompact: {  
    marginTop: 0,  
    paddingVertical: 10,  
  },  
  selectWrap: { position: "relative", marginTop: theme.space.sm },  
  selectWrapOn: { zIndex: 9999, ...(Platform.OS === "android" ? { elevation: 9999 } : {}) },  
  selectBtn: {  
    backgroundColor: theme.colors.card,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    paddingHorizontal: theme.space.md,  
    paddingVertical: 12,  
    borderRadius: theme.radius.md,  
    marginTop: theme.space.sm,  
  },  
  selectBtnTxt: { fontWeight: "800", color: theme.colors.text, fontSize: theme.type.body },  
  selectMenu: {  
    position: "absolute",  
    top: 44,  
    left: 0,  
    right: 0,  
    backgroundColor: theme.colors.card,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    borderRadius: theme.radius.lg,  
    overflow: "hidden",  
    zIndex: 9999,  
    ...Platform.select({  
      android: { elevation: 50 },  
      ios: {  
        shadowColor: "#000",  
        shadowOpacity: 0.12,  
        shadowRadius: 16,  
        shadowOffset: { width: 0, height: 8 },  
    fontFamily: "Inter_700Bold",  
      },  
    }),  
  },  
  selectItem: { paddingVertical: 12, paddingHorizontal: theme.space.lg },  
  selectItemActive: { backgroundColor: "#F1F5F9" },  
  selectItemTxt: { color: theme.colors.text, fontSize: theme.type.body, fontWeight: "700" },  
  selectItemTxtActive: { fontWeight: "800", color: theme.colors.primary },
  selectedObjectBox: {
    marginTop: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: theme.space.md,
    paddingVertical: 12,
  },
  selectedObjectTxt: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: theme.type.body,
  },  
  selectHeader: { paddingVertical: 10, paddingHorizontal: theme.space.lg, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: theme.colors.border },  
  selectHeaderTxt: { color: theme.colors.muted, fontWeight: '900', fontSize: 12 },  
  // Segmented control  
  segmentedOuter: {  
    flexDirection: "row",  
    backgroundColor: theme.colors.chipBg,  
    borderRadius: theme.radius.pill,  
    padding: 4,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    marginTop: theme.space.md,  
    fontFamily: "Inter_600SemiBold",  
  },  
  segmentedItem: {  
    flex: 1,  
    paddingVertical: 10,  
    borderRadius: theme.radius.pill,  
    alignItems: "center",  
    justifyContent: "center",  
  },  
  segmentedItemOn: {  
    backgroundColor: theme.colors.primary,  
  },  
  segmentedTxt: {  
    fontSize: theme.type.body,  
    fontFamily: "Inter_400Regular",  
    fontWeight: "800",  
    color: theme.colors.text,  
  },  
  segmentedTxtOn: {  
    color: "#fff",  
  },  
  chip: {  
    backgroundColor: theme.colors.chipBg,  
    paddingHorizontal: 12,  
    paddingVertical: 8,  
    borderRadius: theme.radius.pill,  
    marginRight: theme.space.sm,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
  },  
  chipTxt: { fontWeight: "800", color: theme.colors.text },  
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },  
  chipTxtOn: { color: "#fff" },  
  primaryBtn: {  
    flex: 1,  
    backgroundColor: theme.colors.primary,  
    borderRadius: theme.radius.md,  
    paddingVertical: 12,  
    alignItems: "center",  
    justifyContent: "center",  
    fontFamily: "Inter_700Bold",  
  },  
  primaryBtnTxt: { color: "#fff", fontWeight: "800", fontSize: theme.type.body },  
  ctaBtn: {  
    marginTop: theme.space.lg,  
    backgroundColor: theme.colors.primary,  
    borderRadius: theme.radius.lg,  
    paddingVertical: 14,  
    alignItems: "center",  
    justifyContent: "center",  
    ...theme.shadow.card,  
    fontFamily: "Inter_700Bold",  
  },  
  ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },  
  // Kart-preview for posisjon  
  mapPreviewWrap: {  
    marginTop: theme.space.sm,  
    borderRadius: theme.radius.lg,  
    overflow: "hidden",  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    backgroundColor: theme.colors.card,  
    ...theme.shadow.card,  
  },  
  mapPreviewInner: {  
    height: 160,  
    position: "relative",  
  },  
  mapPreviewBadge: {  
    position: "absolute",  
    right: 10,  
    top: 10,  
    backgroundColor: "rgba(0,0,0,0.6)",  
    paddingHorizontal: 10,  
    paddingVertical: 6,  
    borderRadius: 999,  
  },  
  mapPreviewBadgeTxt: {  
    color: "#fff",  
    fontWeight: "800",  
    fontSize: 12,  
  },  
});  
const modalStyles = StyleSheet.create({  
  backdrop: {  
    ...StyleSheet.absoluteFillObject,  
    backgroundColor: "rgba(0,0,0,0.45)",  
    alignItems: "center",  
    justifyContent: "center",  
    padding: 24,  
  },  
  card: {  
    width: "100%",  
    maxWidth: 420,  
    backgroundColor: theme.colors.card,  
    borderRadius: theme.radius.lg,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
    padding: 18,  
    ...theme.shadow.card,  
  },  
  icon: {  
    width: 56,  
    height: 56,  
    borderRadius: 28,  
    backgroundColor: theme.colors.primary,  
    alignItems: "center",  
    justifyContent: "center",  
    alignSelf: "center",  
  },  
  iconTxt: {  
    color: "#fff",  
    fontSize: 28,  
    fontWeight: "900",  
    marginTop: -2,  
  },  
  title: {  
    marginTop: 12,  
    fontSize: 18,  
    fontWeight: "900",  
    color: theme.colors.text,  
    textAlign: "center",  
    fontFamily: "Inter_800ExtraBold",  
  },  
  body: {  
    marginTop: 8,  
    fontSize: 14,  
    fontWeight: "700",  
    color: theme.colors.muted,  
    textAlign: "center",  
    lineHeight: 20,  
    fontFamily: "Inter_600SemiBold",  
  },  
  actions: {  
    flexDirection: "row",  
    gap: 10,  
    marginTop: 16,  
  },  
  btn: {  
    flex: 1,  
    paddingVertical: 12,  
    borderRadius: theme.radius.md,  
    alignItems: "center",  
    justifyContent: "center",  
  },  
  btnPrimary: {  
    backgroundColor: theme.colors.primary,  
  },  
  btnPrimaryTxt: {  
    color: "#fff",  
    fontWeight: "900",  
  },  
  btnOutline: {  
    backgroundColor: theme.colors.card,  
    borderWidth: 1,  
    borderColor: theme.colors.border,  
  },  
  btnOutlineTxt: {  
    color: theme.colors.text,  
    fontWeight: "900",  
  },  
});