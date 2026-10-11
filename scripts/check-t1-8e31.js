const fs = require("fs"),
  p = require("path"),
  r = (f) => fs.readFileSync(p.join(process.cwd(), f), "utf8");
const checks = {
  "app/my-reports.tsx": ["paymentSummary", "cases.complete.test.payment"],
  "app/match.tsx": ["compactCard", "/match-comparison/"],
  "app/match-comparison/[matchId].tsx": [
    "match.view.full.details",
    "sharedColor",
  ],
  "server/routes/reports.js": ['deletionMode: "SOFT"', "REPORT_DELETE_FAILED"],
  "server/routes/matches.js": [
    "display_score_adjustment",
    "previousColorMatch",
  ],
};
for (const [f, items] of Object.entries(checks)) {
  const s = r(f);
  for (const item of items) {
    const value = item.replaceAll('\\"', '"');
    if (!s.includes(value)) throw Error(`Missing ${value} in ${f}`);
  }
}
const en = r("src/i18n/locales/en.ts"),
  no = r("src/i18n/locales/no.ts"),
  keys = (s) =>
    new Set([...s.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1])),
  a = keys(en),
  b = keys(no);
if ([...a].some((k) => !b.has(k)) || [...b].some((k) => !a.has(k)))
  throw Error("Locale parity failed");
console.log(`OK: T1.8E.3.1 checks passed. ${a.size} keys in both locales.`);
