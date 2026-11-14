// Define de onde o app Android carrega o conteúdo: do site publicado (atualização automática) ou do que está dentro do APK.
import { readFileSync, writeFileSync } from 'node:fs';
const auto = process.env.AUTO !== 'false', cfgPath = 'capacitor.config.json', cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
if (!auto) { console.log('✓ Modo embutido: o app usa os arquivos de dentro do APK (atualiza só com APK novo).'); process.exit(0); }
let url = (process.env.SITE_URL || `https://${(process.env.OWNER || '').toLowerCase()}.github.io/${process.env.NAME}/`).trim();
if (!url.endsWith('/')) url += '/';
if (!/^https:\/\//.test(url)) throw new Error('A URL do site precisa começar com https://');
try { const r = await fetch(url + 'index.html'); if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text(); if (!/Satori/.test(t)) throw new Error('a página não parece ser o Satori'); }
catch (e) { throw new Error(`Não consegui abrir ${url} (${e.message}).\n→ Ative o GitHub Pages (Settings > Pages > Source: GitHub Actions), rode o workflow "Publicar site" e tente de novo — ou informe a URL do seu site no campo site_url.`); }
cfg.server = { url, androidScheme: 'https', cleartext: false, allowNavigation: [new URL(url).host] };
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2)); console.log('✓ Atualização automática: o app carrega', url);
