"use strict";
const fs = require("fs");
function keys(file) {
  const source = fs.readFileSync(file, "utf8");
  return new Set([...source.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1]));
}
const en = keys("src/i18n/locales/en.ts");
const no = keys("src/i18n/locales/no.ts");
const missingNo = [...en].filter((key) => !no.has(key));
const missingEn = [...no].filter((key) => !en.has(key));
if (missingNo.length || missingEn.length) {
  console.error("Missing Norwegian keys:", missingNo);
  console.error("Missing English keys:", missingEn);
  process.exit(1);
}
console.log(`OK: ${en.size} translation keys are present in both locales.`);
