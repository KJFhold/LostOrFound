const fs = require("fs"),
  p = require("path"),
  r = (f) => fs.readFileSync(p.join(process.cwd(), f), "utf8");
const app = r("app/notifications.tsx"),
  server = r("server/routes/notifications.js"),
  en = r("src/i18n/locales/en.ts"),
  no = r("src/i18n/locales/no.ts");
for (const v of [
  "compactNotifications",
  "lifecyclePriority",
  "merged_message",
  "reportHeading",
  "notifications.case.expired.combined",
])
  if (!app.includes(v)) throw Error(`Missing app feature: ${v}`);
for (const v of ["candidateIds", "ownedReport", "NEW_MESSAGE"])
  if (!server.includes(v)) throw Error(`Missing server feature: ${v}`);
const keys = (s) =>
    new Set([...s.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1])),
  a = keys(en),
  b = keys(no);
if ([...a].some((k) => !b.has(k)) || [...b].some((k) => !a.has(k)))
  throw Error("Locale parity failed");
console.log(`OK: T1.8E.2 checks passed. ${a.size} keys in both locales.`);
