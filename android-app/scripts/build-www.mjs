// Copia o site (pasta pai) para android-app/www, que o Capacitor empacota dentro do APK.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
const src = new URL('../../', import.meta.url).pathname, out = new URL('../www/', import.meta.url).pathname;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'styles.css', 'db.js', 'config.js', 'sync.js', 'app.js', 'manifest.webmanifest', 'core', 'icons', 'templates', 'vendor']) {
  if (existsSync(src + f)) cpSync(src + f, out + f, { recursive: true });
}
console.log('✓ www pronto', existsSync(out + 'vendor/dexie.min.js') ? '(com Dexie real)' : '(com substituto compatível com Dexie)');
