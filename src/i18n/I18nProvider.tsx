// src/i18n/I18nProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

export type Lang = "no" | "en";

type Dictionaries = typeof dictionaries;
type TranslationKey = keyof Dictionaries["en"];
type Params = Record<string, string | number | null | undefined>;

type I18nContextValue = {
  language: Lang;
  setLanguage: (l: Lang) => Promise<void>;
  t: (key: TranslationKey, params?: Params) => string;
};

const STORAGE_KEY = "app.language";

const dictionaries = {
  en: {
    "common.login": "Log in",
    "common.logout": "Log out",
    "common.back": "Back",
    "common.loading": "Loading…",
    "common.refresh": "Refresh",
    "common.overview": "Overview",
    "common.unknownError": "Unknown error",

    "language.currentName": "English",

    "lang.title": "Choose language",
    "lang.back": "Back",
    "lang.norwegian": "Norwegian",
    "lang.norwegianMeta": "Bokmål",
    "lang.english": "English",
    "lang.englishMeta": "International",
    "lang.tipTitle": "Tip",
    "lang.tipBody": "Your choice is saved on the device and will be used next time you open the app.",

    "home.languageSelectorA11y": "Choose language",
    "home.eyebrow": "Lost something? Found something?",
    "home.title": "Lost or Found",
    "home.subtitle": "A simple and safer way to report lost and found items — and let the app look for possible matches.",
    "home.ctaPrimary": "Report lost or found item",
    "home.ctaPrimaryA11y": "Report a lost or found item",
    "home.ctaSecondary": "How it works",
    "home.ctaSecondaryA11y": "Open how it works",
    "home.myCases": "My cases",
    "home.myCasesA11y": "Open my cases",
    "home.privacyTitle": "Safety first",
    "home.privacyBody": "Exact find locations and contact are handled carefully. You choose what to share, and chat opens when a match is relevant.",
    "home.stepsTitle": "Get started quickly",
    "home.stepReportTitle": "1. Report",
    "home.stepReportBody": "Choose lost or found, then add place, time and key details.",
    "home.stepMatchTitle": "2. We match",
    "home.stepMatchBody": "We compare category, place, time, color, brand and descriptions.",
    "home.stepConnectTitle": "3. Connect",
    "home.stepConnectBody": "When a match looks likely, both sides can confirm and arrange a safe return.",
    "home.trustFooter": "Built for honest finds, fewer misunderstandings and safer returns.",

    "start.title": "Report an item",
    "start.subtitle": "Choose what best fits the situation.",
    "start.lost": "I lost something",
    "start.found": "I found something",
    "start.cta": "Continue",
    "start.myCases": "My cases",
    "start.switchUser": "Switch user",

    "notifications.title": "Notifications",
    "notifications.empty": "No notifications yet.",
    "notifications.loadError": "Could not load notifications",
    "notifications.unread": "{{count}} unread",
    "notifications.invalid.case": "Case unavailable",
    "notifications.invalid.match": "Match unavailable",
    "notifications.invalid.chat": "Chat unavailable",

    "reports.title": "My cases",
    "matches.title": "Matches",
    "matches.empty": "No matches yet.",
  },
  no: {
    "common.login": "Logg inn",
    "common.logout": "Logg ut",
    "common.back": "Tilbake",
    "common.loading": "Laster…",
    "common.refresh": "Oppdater",
    "common.overview": "Oversikt",
    "common.unknownError": "Ukjent feil",

    "language.currentName": "Norsk",

    "lang.title": "Velg språk",
    "lang.back": "Tilbake",
    "lang.norwegian": "Norsk",
    "lang.norwegianMeta": "Bokmål",
    "lang.english": "English",
    "lang.englishMeta": "International",
    "lang.tipTitle": "Tips",
    "lang.tipBody": "Språket lagres på enheten og brukes neste gang du åpner appen.",

    "home.languageSelectorA11y": "Velg språk",
    "home.eyebrow": "Mistet noe? Funnet noe?",
    "home.title": "Lost or Found",
    "home.subtitle": "En trygg og enkel måte å melde inn mistede og funnede ting — og la appen lete etter mulige treff.",
    "home.ctaPrimary": "Meld inn mistet eller funnet",
    "home.ctaPrimaryA11y": "Meld inn en mistet eller funnet gjenstand",
    "home.ctaSecondary": "Slik fungerer det",
    "home.ctaSecondaryA11y": "Åpne slik fungerer det",
    "home.myCases": "Mine saker",
    "home.myCasesA11y": "Åpne mine saker",
    "home.privacyTitle": "Trygt først",
    "home.privacyBody": "Nøyaktig funnsted og kontakt håndteres varsomt. Du velger hva du deler, og chat åpnes når et treff er relevant.",
    "home.stepsTitle": "Kom raskt i gang",
    "home.stepReportTitle": "1. Meld inn",
    "home.stepReportBody": "Velg mistet eller funnet, og legg inn sted, tid og kjennetegn.",
    "home.stepMatchTitle": "2. Appen matcher",
    "home.stepMatchBody": "Vi sammenligner kategori, sted, tid, farge, merke og beskrivelser.",
    "home.stepConnectTitle": "3. Ta kontakt",
    "home.stepConnectBody": "Når et treff virker sannsynlig, kan begge parter bekrefte og avtale trygg tilbakelevering.",
    "home.trustFooter": "Bygget for ærlige funn, færre misforståelser og tryggere tilbakelevering.",

    "start.title": "Registrer mistet eller funnet",
    "start.subtitle": "Velg hva som passer best for situasjonen.",
    "start.lost": "Jeg har mistet noe",
    "start.found": "Jeg har funnet noe",
    "start.cta": "Fortsett",
    "start.myCases": "Mine saker",
    "start.switchUser": "Bytt bruker",

    "notifications.title": "Varsler",
    "notifications.empty": "Ingen varsler ennå.",
    "notifications.loadError": "Kunne ikke hente varsler",
    "notifications.unread": "{{count}} uleste",
    "notifications.invalid.case": "Sak ikke tilgjengelig",
    "notifications.invalid.match": "Treff ikke tilgjengelig",
    "notifications.invalid.chat": "Chat ikke tilgjengelig",

    "reports.title": "Mine saker",
    "matches.title": "Treff",
    "matches.empty": "Ingen treff ennå.",
  },
} as const;

const I18nContext = createContext<I18nContextValue | null>(null);

function guessDeviceLanguage(): Lang {
  const first = Localization.getLocales()?.[0]?.languageCode;
  return first === "en" ? "en" : "no";
}

function formatTemplate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(guessDeviceLanguage());

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;

        if (saved === "no" || saved === "en") {
          setLanguageState(saved);
        }
      } catch {
        // ignore storage errors
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = async (l: Lang) => {
    setLanguageState(l);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore storage errors
    }
  };

  const t = (key: TranslationKey, params?: Params) => {
    const pack = dictionaries[language] ?? dictionaries.en;
    const raw = pack[key] ?? dictionaries.en[key] ?? String(key);
    return formatTemplate(raw, params);
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
