// Garante que a versão está igual em todos os lugares (package.json, app, Android, CHANGELOG).
import { readFileSync } from 'node:fs';
const v = JSON.parse(readFileSync('package.json', 'utf8')).version, a = JSON.parse(readFileSync('android-app/package.json', 'utf8')).version,
  app = readFileSync('app.js', 'utf8').match(/APP_VERSION='([^']+)'/)[1], cl = readFileSync('CHANGELOG.md', 'utf8').match(/^## \[([^\]]+)\]/m)[1];
const ok = v === a && v === app && v === cl; console.log(ok ? `✓ versão ${v} consistente (package, android-app, app.js, CHANGELOG)` : `✗ versões diferentes: package=${v} android=${a} app=${app} changelog=${cl}`); process.exit(ok ? 0 : 1);
