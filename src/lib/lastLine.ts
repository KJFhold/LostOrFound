// src/lib/lastLine.ts
// Konsistent formattering av "Sist"-linje (Du/Motpart + klokkeslett + snippet).
// Mål:
// - Respekter enhetens locale (språk/region)
// - Respekter enhetens 12/24t-innstilling når mulig

import * as RNLocalize from "react-native-localize";

export function shortMessage(body?: string | null, max = 70) {
  if (!body) return "";
  const t = String(body).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + "…";
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getLocaleTag() {
  try {
    const loc = RNLocalize.getLocales()?.[0];
    return loc?.languageTag ?? undefined;
  } catch {
    return undefined;
  }
}

function getHour12(): boolean | undefined {
  // true => 12t, false => 24t
  try {
    return !RNLocalize.uses24HourClock();
  } catch {
    return undefined;
  }
}

function fmtTime(d: Date) {
  const locale = getLocaleTag();
  const hour12 = getHour12();

  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...(hour12 === undefined ? {} : { hour12 }),
  };

  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toLocaleTimeString(locale ? [locale] : [], {
      hour: "2-digit",
      minute: "2-digit",
      ...(hour12 === undefined ? {} : { hour12 }),
    } as any);
  }
}

function fmtDate(d: Date) {
  const locale = getLocaleTag() ?? "nb-NO";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toLocaleDateString(locale);
  }
}

export function formatLastLine(opts: {
  createdAt?: string | null;
  senderId?: string | null;
  body?: string | null;
  currentUserId?: string | null;
  maxBody?: number;
}) {
  const { createdAt, senderId, body, currentUserId, maxBody = 70 } = opts;
  if (!createdAt || !senderId) return null;

  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const who = senderId === currentUserId ? "Du" : "Motpart";
  const time = fmtTime(d);
  const msg = shortMessage(body ?? "", maxBody);

  if (isSameDay(d, now)) {
    return `Sist: ${who} ${time}: ${msg}`;
  }
  return `Sist: ${who} ${fmtDate(d)} ${time}: ${msg}`;
}
