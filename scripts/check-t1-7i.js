const fs = require('fs');
const path = require('path');
const root = process.cwd();
const required = [
  'tsconfig.json',
  'components/parallax-scroll-view.tsx',
  'components/themed-text.tsx',
  'components/themed-view.tsx',
  'components/ui/collapsible.tsx',
  'components/ui/icon-symbol.tsx',
  'components/ui/icon-symbol.ios.tsx',
  'hooks/use-theme-color.ts',
  'hooks/use-color-scheme.ts',
  'constants/theme.ts',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
const alias = config?.compilerOptions?.paths?.['@/*'];
if (!Array.isArray(alias) || alias.length !== 1 || !['./*', '*'].includes(alias[0])) {
  throw new Error(`Unexpected @/* alias: ${JSON.stringify(alias)}`);
}
console.log('OK: T1.7I root alias and Expo template file checks passed.');
