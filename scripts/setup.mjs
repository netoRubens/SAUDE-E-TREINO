// Instala o que o Satori precisa. Uso: npm run setup   (ou: npm run setup:tests, para incluir os testes E2E)
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const URL_DEXIE = 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js';
if (+process.versions.node.split('.')[0] < 18) { console.error('✗ Precisa de Node 18 ou mais novo: https://nodejs.org'); process.exit(1); }
console.log('→ Baixando Dexie.js (banco de dados local, Apache-2.0)…');
try {
  const r = await fetch(URL_DEXIE); if (!r.ok) throw new Error('HTTP ' + r.status);
  const t = await r.text(); if (!t.includes('Dexie') || t.length < 20000) throw new Error('arquivo inesperado');
  mkdirSync('vendor', { recursive: true }); writeFileSync('vendor/dexie.min.js', t);
  console.log(`✓ vendor/dexie.min.js (${Math.round(t.length / 1024)} KB)`);
} catch (e) { console.error('✗ Não consegui baixar o Dexie: ' + e.message + '\n  Verifique a internet e rode de novo.'); process.exit(1); }
if (process.argv.includes('--tests')) {
  console.log('→ Instalando Playwright + Chromium para os testes (pode levar alguns minutos)…');
  try { execSync('npm install --no-save playwright', { stdio: 'inherit' }); execSync('npx playwright install chromium', { stdio: 'inherit' }); console.log('✓ Testes prontos: npm test'); }
  catch { console.error('✗ Falha ao instalar o Playwright.'); process.exit(1); }
}
console.log('\n✓ Pronto. Para abrir o app: npm start   →   http://localhost:8000');
