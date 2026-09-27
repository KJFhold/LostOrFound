import type { Lang } from "./I18nProvider";

export function localeForLanguage(language: Lang) {
  return language === "en" ? "en-GB" : "nb-NO";
}

export function formatLocalizedDateTime(value: string | Date, language: Lang) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: "medium", timeStyle: "short" }).format(date);
}
