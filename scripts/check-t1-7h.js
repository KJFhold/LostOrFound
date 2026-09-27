const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = ['server/routes/matches.js','src/i18n/locales/en.ts','src/i18n/locales/no.ts'];
for (const file of files) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(path.join(root,file),'utf8');
const keys = (text) => new Set([...text.matchAll(/^\s*"([^"]+)"\s*:/gm)].map(m => m[1]));
const en = keys(read('src/i18n/locales/en.ts'));
const no = keys(read('src/i18n/locales/no.ts'));
const missingNo = [...en].filter(k => !no.has(k));
const missingEn = [...no].filter(k => !en.has(k));
if (missingNo.length || missingEn.length) throw new Error(`Locale mismatch. Missing NO: ${missingNo}; Missing EN: ${missingEn}`);
const matches = read('server/routes/matches.js');
if (!matches.includes('titles: { no: "Treff bekreftet", en: "Match confirmed" }')) throw new Error('Bilingual confirmation notification missing');
if (/henter|oppdaterer|Kun eier|varsle motpart|tidsbuffer|dager|skjul lukkede/.test(matches)) throw new Error('Norwegian technical source text remains in matches.js');
for (const file of ['src/i18n/locales/en.ts','src/i18n/locales/no.ts']) {
  if (read(file).includes('formatDistance(distRaw) :')) throw new Error(`Corrupted locale value remains in ${file}`);
}
console.log(`OK: T1.7H checks passed. ${en.size} translation keys are present in both locales.`);
