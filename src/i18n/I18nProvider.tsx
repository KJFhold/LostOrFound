// src/i18n/I18nProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { en, type TranslationKey } from "./locales/en";
import { no } from "./locales/no";

export type Lang = "no" | "en";
type Params = Record<string, string | number | null | undefined>;
type I18nContextValue = {
  language: Lang;
  setLanguage: (language: Lang) => Promise<void>;
  t: (key: TranslationKey, params?: Params) => string;
};

const STORAGE_KEY = "app.language";
const dictionaries = { en, no } as const;
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
    let active = true;
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && (saved === "no" || saved === "en")) setLanguageState(saved);
      } catch (error) {
        console.warn("[i18n] Could not read the saved language", error);
      }
    })();
    return () => { active = false; };
  }, []);

  const setLanguage = async (nextLanguage: Lang) => {
    setLanguageState(nextLanguage);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.warn("[i18n] Could not save the selected language", error);
    }
  };

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => formatTemplate(dictionaries[language][key] ?? en[key] ?? String(key), params),
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
