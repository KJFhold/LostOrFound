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
    "tabs.home": "Home",
    "tabs.cases": "My cases",
    "tabs.report": "Report",
    "tabs.matches": "Matches",
    "tabs.profile": "Profile",
    "dashboard.greeting": "Your lost and found overview",
    "dashboard.guestNotice": "You are using the app as a guest. You can report found items, but an account is required for lost reports.",
    "dashboard.whatToDo": "What would you like to do?",
    "dashboard.lostTitle": "Lost something?",
    "dashboard.lostBody": "Report where and when the item was lost, then follow possible matches.",
    "dashboard.lostCta": "Report lost",
    "dashboard.foundTitle": "Found something?",
    "dashboard.foundBody": "Help the owner by reporting the item and where it was found.",
    "dashboard.foundCta": "Report found",
    "dashboard.quickTitle": "Overview",
    "dashboard.casesTitle": "My cases",
    "dashboard.casesBody": "See active, expired and closed reports.",
    "dashboard.notificationsTitle": "Notifications",
    "dashboard.notificationsBody": "See new matches, messages and updates.",
    "dashboard.howTitle": "How it works",
    "dashboard.howBody": "Learn about reporting, matching and safe returns.",
    "dashboard.safety": "Exact contact details are not shared automatically. Verify ownership before arranging a return.",
    "matchesHub.title": "Matches",
    "matchesHub.body": "Matches belong to a specific report. Open My cases and choose the report you want to review.",
    "matchesHub.cta": "Open My cases",
    "matchesHub.notifications": "Open notifications",
    "profile.title": "Profile",
    "profile.account": "Your account",
    "profile.guest": "Guest account",
    "profile.guestBody": "Guests can report found items. Create an account to report lost items.",
    "profile.noEmail": "Signed-in account",
    "profile.loginCreate": "Log in or create account",
    "profile.cases": "My cases",
    "profile.notifications": "Notifications",
    "profile.premium": "Premium and purchases",
    "profile.language": "Language",
    "profile.how": "How it works",
    "profile.logout": "Log out",
    "profile.login": "Log in",
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

    "how.back": "Back",
    "how.backA11y": "Go back",
    "how.eyebrow": "How it works",
    "how.title": "From report to safe return",
    "how.subtitle": "Lost or Found helps both sides share enough information to identify an item — without exposing more than needed.",
    "how.stepsTitle": "The flow",
    "how.stepsIntro": "The app is built around a simple process: report, match, confirm and return.",
    "how.card1.title": "Report what happened",
    "how.card1.body": "Choose whether you lost or found something. Add category, place, time, description, color, brand and photos when available.",
    "how.card2.title": "We look for possible matches",
    "how.card2.body": "The app compares reports using details such as category, location, time and item characteristics.",
    "how.card3.title": "Review matches carefully",
    "how.card3.body": "Possible matches are shown with context, photos and match details so you can decide whether the case looks relevant.",
    "how.card4.title": "Confirm and arrange return",
    "how.card4.body": "When a match looks right, both sides can confirm. Chat and exact details are handled in a controlled way.",
    "how.trustTitle": "Privacy and safety",
    "how.trustBody": "Do not share sensitive personal information before a match is relevant. Use item details to verify ownership before arranging a return.",
    "how.cta": "Start reporting",
    "how.ctaA11y": "Start reporting a lost or found item",

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
    "tabs.home": "Hjem",
    "tabs.cases": "Mine saker",
    "tabs.report": "Registrer",
    "tabs.matches": "Treff",
    "tabs.profile": "Profil",
    "dashboard.greeting": "Din oversikt over mistet og funnet",
    "dashboard.guestNotice": "Du bruker appen som gjest. Du kan registrere funn, men mistet-rapporter krever konto.",
    "dashboard.whatToDo": "Hva ønsker du å gjøre?",
    "dashboard.lostTitle": "Mistet noe?",
    "dashboard.lostBody": "Registrer hvor og når gjenstanden ble mistet, og følg mulige treff.",
    "dashboard.lostCta": "Registrer mistet",
    "dashboard.foundTitle": "Funnet noe?",
    "dashboard.foundBody": "Hjelp eieren ved å registrere gjenstanden og hvor den ble funnet.",
    "dashboard.foundCta": "Registrer funnet",
    "dashboard.quickTitle": "Oversikt",
    "dashboard.casesTitle": "Mine saker",
    "dashboard.casesBody": "Se aktive, utløpte og avsluttede rapporter.",
    "dashboard.notificationsTitle": "Varsler",
    "dashboard.notificationsBody": "Se nye treff, meldinger og oppdateringer.",
    "dashboard.howTitle": "Slik fungerer det",
    "dashboard.howBody": "Les om innmelding, matching og trygg tilbakelevering.",
    "dashboard.safety": "Kontaktinformasjon deles ikke automatisk. Bekreft eierskap før tilbakelevering avtales.",
    "matchesHub.title": "Treff",
    "matchesHub.body": "Treff tilhører en bestemt rapport. Åpne Mine saker og velg rapporten du vil se treff for.",
    "matchesHub.cta": "Åpne Mine saker",
    "matchesHub.notifications": "Åpne varsler",
    "profile.title": "Profil",
    "profile.account": "Din konto",
    "profile.guest": "Gjestekonto",
    "profile.guestBody": "Gjest kan registrere funn. Opprett konto for å registrere noe mistet.",
    "profile.noEmail": "Innlogget konto",
    "profile.loginCreate": "Logg inn eller opprett konto",
    "profile.cases": "Mine saker",
    "profile.notifications": "Varsler",
    "profile.premium": "Premium og kjøp",
    "profile.language": "Språk",
    "profile.how": "Slik fungerer det",
    "profile.logout": "Logg ut",
    "profile.login": "Logg inn",
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

    "how.back": "Tilbake",
    "how.backA11y": "Gå tilbake",
    "how.eyebrow": "Slik fungerer det",
    "how.title": "Fra innmelding til trygg tilbakelevering",
    "how.subtitle": "Lost or Found hjelper begge parter å dele nok informasjon til å kjenne igjen en gjenstand — uten å dele mer enn nødvendig.",
    "how.stepsTitle": "Flyten",
    "how.stepsIntro": "Appen er bygget rundt en enkel prosess: meld inn, finn treff, bekreft og lever tilbake.",
    "how.card1.title": "Meld inn hva som skjedde",
    "how.card1.body": "Velg om du har mistet eller funnet noe. Legg inn kategori, sted, tid, beskrivelse, farge, merke og bilder når du har det.",
    "how.card2.title": "Vi leter etter mulige treff",
    "how.card2.body": "Appen sammenligner rapporter basert på kategori, sted, tid og kjennetegn ved gjenstanden.",
    "how.card3.title": "Vurder treffene nøye",
    "how.card3.body": "Mulige treff vises med kontekst, bilder og treffdetaljer, slik at du kan vurdere om saken virker relevant.",
    "how.card4.title": "Bekreft og avtal levering",
    "how.card4.body": "Når et treff virker riktig, kan begge parter bekrefte. Chat og nøyaktige detaljer håndteres kontrollert.",
    "how.trustTitle": "Personvern og trygghet",
    "how.trustBody": "Ikke del sensitiv personlig informasjon før et treff er relevant. Bruk detaljer om gjenstanden for å bekrefte eierskap før tilbakelevering avtales.",
    "how.cta": "Start innmelding",
    "how.ctaA11y": "Start innmelding av mistet eller funnet gjenstand",

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
