# Satori — v1

App pessoal (PWA) de treino, dieta, peso, água, passos e hábitos. 100% local: dados em IndexedDB, sem contas, sem rede, sem APIs.

## Instalar e executar
Precisa apenas do [Node.js](https://nodejs.org) 18+.
```sh
npm run setup    # baixa o Dexie.js (1x, com internet)
npm start        # abre em http://localhost:8000
npm run setup:tests && npm test   # opcional: testes E2E
```
Atalhos: `iniciar.bat` (Windows, duplo clique) ou `./iniciar.sh` (Mac/Linux) fazem tudo.
Sem `vendor/dexie.min.js` o app usa um shim com a mesma API sobre IndexedDB.

## Instalar no Android
O Chrome só instala PWAs via **HTTPS** (ou localhost). Publique a pasta em hospedagem estática gratuita (GitHub Pages, Netlify, Cloudflare Pages), abra a URL no Chrome do Android › menu ⋮ › **Instalar app**. Depois de instalado, funciona offline.

## Backup
Perfil e metas › Backup e dados › **Exportar backup** (JSON). Para transferir de aparelho: **Restaurar**. O arquivo é validado antes e a troca só ocorre após confirmação.
Limpar dados do navegador ou desinstalar o app apaga os dados locais — exporte backups com frequência.

## Testes
`npm test` (após `npm run setup:tests`): 58 verificações × (Desktop + Android/Pixel 7).

## Fontes dos cálculos
TMB: Mifflin-St Jeor (1990). Gasto = TMB × fator de atividade (1,2 / 1,375 / 1,55 / 1,725). Proteína = g/kg configurável (padrão 1,6); gordura = % das kcal (padrão 25%); carboidrato = restante. Estimativas, não prescrição.
