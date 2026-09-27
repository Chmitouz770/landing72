#!/usr/bin/env node
/**
 * Transforme l'export web de la démo (EXPO_PUBLIC_DEMO=1) en UNE page HTML
 * autonome : JS, CSS, police d'icônes et images intégrés (data: URIs).
 * Idéal pour partager la démo par un simple lien, sans serveur.
 *
 * Usage : node scripts/make-demo-page.mjs <dossier-export> <fichier-sortie.html>
 */
import fs from 'node:fs';
import path from 'node:path';

const [exportDir = 'dist-demo', output = 'dist-demo/umetum-demo.html'] = process.argv.slice(2);
const html = fs.readFileSync(path.join(exportDir, 'index.html'), 'utf8');

const scriptSrc = html.match(/<script src="([^"]+)"/)?.[1];
const cssHrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
if (!scriptSrc) throw new Error('Bundle JS introuvable dans index.html');

const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' };
const toDataUri = (file) =>
  `data:${mime[path.extname(file)] ?? 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;

let js = fs.readFileSync(path.join(exportDir, scriptSrc), 'utf8');
let inlined = 0;
js = js.replace(/"(\/assets\/[^"]+)"/g, (match, assetPath) => {
  const file = path.join(exportDir, assetPath);
  if (!fs.existsSync(file)) return match;
  inlined++;
  return JSON.stringify(toDataUri(file));
});
// Un « </script » dans le code fermerait la balise : on l'échappe.
js = js.replace(/<\/script/gi, '<\\/script');

const css = cssHrefs.map((href) => fs.readFileSync(path.join(exportDir, href), 'utf8')).join('\n');

const page = `<title>UMETUM</title>
<style>
  :root { --umetum-bg: #FAF7F2; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --umetum-bg: #0E1524; color-scheme: dark; }
  }
  :root[data-theme="dark"] { --umetum-bg: #0E1524; color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; overflow: hidden; background: var(--umetum-bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<style>${css}</style>
<div id="root"></div>
<script>
  // L'app (Expo Router) démarre sur « / » quelle que soit l'adresse de la page.
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
</script>
<script>${js}</script>
`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, page);
console.log(`✅ ${output} (${(page.length / 1024 / 1024).toFixed(2)} Mo, ${inlined} ressources intégrées)`);
