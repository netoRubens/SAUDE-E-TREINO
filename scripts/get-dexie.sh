#!/bin/sh
# Baixa o Dexie.js real para vendor/ (precisa de internet apenas nesta etapa). Licença Apache-2.0.
set -e; cd "$(dirname "$0")/.."
curl -fsSL https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js -o vendor/dexie.min.js && echo "Dexie instalado em vendor/dexie.min.js"
