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

## Decisões do projeto (fase app + corrida)
- Conta e nuvem: **aprovadas** (backend Supabase, RLS por usuário). Trajetos são privados por padrão.
- **Sem estimativa de calorias na corrida** e sem integração de gasto com a dieta.
- Cor: rosa `#F0A1BB` (identidade do Satori).
- **Somente Android** nesta fase (APK distribuído pelo site).
- `core/running.js`: motor de corrida (testes: `npm run test:core`). `supabase/schema.sql`: tabelas `records` e `activities` com RLS (ainda não executado em um Postgres real).
- Banco local: todo registro tem `uid` + `updatedAt`; exclusões vão para `kv:tombstones` (base da sincronização).
- Mapa: **OpenFreeMap** (tiles vetoriais gratuitos, sem chave/cadastro/limites declarados; atribuição obrigatória: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap") + MapLibre, com estilo escuro próprio. Plano B: trajeto desenhado localmente sobre fundo escuro (sem rede) e, se necessário, tiles próprios em PMTiles. **Não usar** tile.openstreetmap.org no app distribuído (proibido sem permissão da OSMF).

## Conta e sincronização (Supabase)
**Configuração (uma vez):**
1. Supabase › SQL Editor › cole e execute `supabase/schema.sql`.
2. Authentication › Providers › Email: para uso pessoal, desative *Confirm email* (senão cada cadastro exige clicar em um link; nesse caso defina também *Site URL* com o endereço do site).
3. `config.js` já contém a URL do projeto e a chave **publishable** (pública por design). **Nunca** coloque a chave secreta (`sb_secret_…` / `service_role`) no app.

**Como funciona:** Perfil e metas › *Conta e sincronização* › Entrar / Criar conta. A 1ª sincronização de cada aparelho é manual e pede confirmação; depois é automática após cada alteração (com internet). Conflito = vence a alteração mais recente (relógios dos aparelhos devem estar certos). Exclusões são propagadas. Tokens e cursor de sincronização ficam fora do backup JSON.
**Testes:** `npm run test:sync` (usa um Supabase *simulado*; o servidor real não foi exercitado).
**Limite conhecido:** "Apagar tudo" apaga só o aparelho local (não gera exclusões na nuvem).

## Gerar o APK e atualização automática
Veja o passo a passo completo em **`GUIA-APK.md`** (GitHub → Pages → APK → instalar no celular → atualizar).
Resumo: `git push` publica o site (GitHub Pages) e todos os celulares recebem a versão nova ao abrir o app; o APK só precisa ser refeito para mudanças nativas. A chave de assinatura é fixa (`android-app/debug.keystore`, pública no repositório: serve para testes; antes de distribuir para outras pessoas, geramos uma chave privada).

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

## Decisões do projeto (fase app + corrida)
- Conta e nuvem: **aprovadas** (backend Supabase, RLS por usuário). Trajetos são privados por padrão.
- **Sem estimativa de calorias na corrida** e sem integração de gasto com a dieta.
- Cor: rosa `#F0A1BB` (identidade do Satori).
- **Somente Android** nesta fase (APK distribuído pelo site).
- `core/running.js`: motor de corrida (testes: `npm run test:core`). `supabase/schema.sql`: tabelas `records` e `activities` com RLS (ainda não executado em um Postgres real).
- Banco local: todo registro tem `uid` + `updatedAt`; exclusões vão para `kv:tombstones` (base da sincronização).
- Mapa: **OpenFreeMap** (tiles vetoriais gratuitos, sem chave/cadastro/limites declarados; atribuição obrigatória: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap") + MapLibre, com estilo escuro próprio. Plano B: trajeto desenhado localmente sobre fundo escuro (sem rede) e, se necessário, tiles próprios em PMTiles. **Não usar** tile.openstreetmap.org no app distribuído (proibido sem permissão da OSMF).

## Conta e sincronização (Supabase)
**Configuração (uma vez):**
1. Supabase › SQL Editor › cole e execute `supabase/schema.sql`.
2. Authentication › Providers › Email: para uso pessoal, desative *Confirm email* (senão cada cadastro exige clicar em um link; nesse caso defina também *Site URL* com o endereço do site).
3. `config.js` já contém a URL do projeto e a chave **publishable** (pública por design). **Nunca** coloque a chave secreta (`sb_secret_…` / `service_role`) no app.

**Como funciona:** Perfil e metas › *Conta e sincronização* › Entrar / Criar conta. A 1ª sincronização de cada aparelho é manual e pede confirmação; depois é automática após cada alteração (com internet). Conflito = vence a alteração mais recente (relógios dos aparelhos devem estar certos). Exclusões são propagadas. Tokens e cursor de sincronização ficam fora do backup JSON.
**Testes:** `npm run test:sync` (usa um Supabase *simulado*; o servidor real não foi exercitado).
**Limite conhecido:** "Apagar tudo" apaga só o aparelho local (não gera exclusões na nuvem).

## Gerar o APK (Android) — sem instalar nada no seu computador
O APK é compilado de graça pelo GitHub Actions (este ambiente de desenvolvimento não tem Android SDK).
1. Coloque **esta pasta como raiz** de um repositório no GitHub (a pasta `.github/` precisa ficar na raiz).
2. No Supabase › SQL Editor, rode `supabase/migration-002-corridas.sql` (uma vez) para as corridas sincronizarem.
3. GitHub › aba **Actions** › **Gerar APK Android** › **Run workflow** (deixe "usar_dexie" desmarcado nesta versão).
4. Espere ~10–15 min. O APK aparece em **Releases** (`satori-v0.5.0-bNN.apk`) e em *Artifacts*. Abra o link da Release **no celular**, baixe e instale (autorize "instalar apps desconhecidos" para o navegador).
5. Siga `ROTEIRO-TESTE-CELULAR.md` e me diga o resultado. Cada nova compilação gera um número `bNN` maior.
O APK é assinado com a chave de *debug* (serve para instalar e testar no seu celular). Uma versão "release" com chave própria é um passo futuro.

## Testes
`npm run test:all` (motor de corrida, app, sincronização, cadastro, corrida e consistência de versão).
