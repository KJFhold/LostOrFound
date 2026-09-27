const fs = require("fs");
const path = require("path");
const root = process.cwd();
const required = [
  "app/match.tsx",
  "app/matches/[matchId].tsx",
  "app/premium-status.tsx",
  "app/geo-alert-create.tsx",
  "src/lib/categories.ts",
  "src/i18n/locales/en.ts",
  "src/i18n/locales/no.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}
const en = fs.readFileSync(path.join(root, "src/i18n/locales/en.ts"), "utf8");
const no = fs.readFileSync(path.join(root, "src/i18n/locales/no.ts"), "utf8");
const keyPattern = /^\s*"([^"]+)"\s*:/gm;
const keys = (text) => new Set([...text.matchAll(keyPattern)].map((m) => m[1]));
const enKeys = keys(en);
const noKeys = keys(no);
const missingNo = [...enKeys].filter((key) => !noKeys.has(key));
const missingEn = [...noKeys].filter((key) => !enKeys.has(key));
if (missingNo.length || missingEn.length) {
  throw new Error(`Locale mismatch. Missing NO: ${missingNo.join(", ")}; Missing EN: ${missingEn.join(", ")}`);
}
for (const file of required.filter((f) => f.endsWith(".tsx"))) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (/import\s+.*colors.*from\s+["'][^"']*\/colors["']/.test(text)) throw new Error(`${file}: unexpected colors.ts dependency`);
  if (/import\s+.*materials.*from\s+["'][^"']*\/materials["']/.test(text)) throw new Error(`${file}: unexpected materials.ts dependency`);
}
console.log(`OK: T1.7F checks passed. ${enKeys.size} translation keys are present in both locales.`);
