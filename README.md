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

## Importar treino por planilha (aba Treino)
- **Baixar planilha modelo** (.xlsx ou .csv): colunas `Dia, Treino, Horário, Duração, Exercício, Séries x repetições, Observações`; uma linha por exercício; linhas começando com `#` são ignoradas.
- **Importar planilha**: lê .xlsx/.csv localmente (sem biblioteca externa), valida linha a linha, mostra pré-visualização e deixa escolher *adicionar* ou *substituir* o plano. O histórico de sessões nunca é apagado.
- **Prompt para o ChatGPT**: entrevista de preferências e objetivos, confirmação e entrega em .xlsx/CSV no formato do app. Opção de incluir os dados do perfil (sem o nome).

## Atualizações
O service worker usa *rede primeiro*: ao publicar uma versão nova, o app a carrega na próxima abertura online. Se o `sw.js` mudar, aparece o aviso "Nova versão instalada — Recarregar". Os dados (IndexedDB) não são afetados.
