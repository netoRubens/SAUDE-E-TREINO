// Ajusta o projeto Android gerado por `npx cap add android`: permissões, versão e ícone.
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
const ver = JSON.parse(readFileSync('../package.json', 'utf8')).version, build = process.env.BUILD_NUMBER || '1';
const man = 'android/app/src/main/AndroidManifest.xml'; let x = readFileSync(man, 'utf8');
for (const p of ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_LOCATION', 'POST_NOTIFICATIONS', 'VIBRATE', 'WAKE_LOCK'])
  if (!x.includes(`android.permission.${p}"`)) x = x.replace('</manifest>', `    <uses-permission android:name="android.permission.${p}" />\n</manifest>`);
writeFileSync(man, x);
const gp = 'android/app/build.gradle'; let g = readFileSync(gp, 'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${parseInt(build, 10)}`).replace(/versionName\s+"[^"]*"/, `versionName "${ver}"`); writeFileSync(gp, g);
const res = 'android/app/src/main/res', dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(dens)) { const dir = `${res}/mipmap-${d}`; mkdirSync(dir, { recursive: true });
  for (const n of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) await sharp('../icons/icon-512.png').resize(s, s).png().toFile(`${dir}/${n}.png`); }
for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) rmSync(`${res}/mipmap-anydpi-v26/${f}`, { force: true }); // usa os PNG
console.log(`✓ Android ajustado: versão ${ver} (build ${build})`);
