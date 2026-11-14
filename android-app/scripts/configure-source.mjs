// Define de onde o app Android carrega o conteúdo: do site publicado (atualização automática) ou do que está dentro do APK.
import { readFileSync, writeFileSync } from 'node:fs';
const auto = process.env.AUTO !== 'false', cfgPath = 'capacitor.config.json', cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
if (!auto) { console.log('✓ Modo embutido: o app usa os arquivos de dentro do APK (atualiza só com APK novo).'); process.exit(0); }
let url = (process.env.SITE_URL || `https://${(process.env.OWNER || '').toLowerCase()}.github.io/${process.env.NAME}/`).trim();
if (!url.endsWith('/')) url += '/';
if (!/^https:\/\//.test(url)) throw new Error('A URL do site precisa começar com https://');
try { const r = await fetch(url + 'index.html'); if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text(); if (!/Satori/.test(t)) throw new Error('a página não parece ser o Satori'); }
catch (e) { throw new Error(`\n\n=== NÃO CONSEGUI ABRIR O SITE: ${url} (${e.message}) ===\nO app precisa do site publicado para se atualizar sozinho. Escolha UMA opção:\n  A) GitHub Pages: Settings > Pages > Source = "GitHub Actions" (em conta gratuita o repositório precisa ser PÚBLICO), depois rode o workflow "Publicar site (GitHub Pages)" e espere ficar verde.\n  B) Se você já publica na Vercel (ou outro lugar): rode este workflow de novo e preencha o campo site_url com o endereço, ex.: https://seu-app.vercel.app/\n  C) Sem atualização automática: rode de novo com "atualizacao_automatica" desmarcada (tudo vai embutido no APK).\n`); }
cfg.server = { url, androidScheme: 'https', cleartext: false, allowNavigation: [new URL(url).host] };
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2)); console.log('✓ Atualização automática: o app carrega', url);
