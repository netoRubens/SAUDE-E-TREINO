#!/bin/sh
cd "$(dirname "$0")"
[ -f vendor/dexie.min.js ] || npm run setup || exit 1
npm start
