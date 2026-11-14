# Guia completo: do GitHub ao app instalado no celular (grátis)

## O que você vai ter no final
- O site publicado em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/` (GitHub Pages).
- Um APK (`satori-v0.6.0-bNN.apk`) que você instala no celular **uma vez**.
- **A cada `git push`, o site é publicado de novo e todos os celulares com o app recebem a versão nova na próxima abertura.** Só é preciso gerar um APK novo quando mudar algo *nativo* (permissões, plugins); o app avisa quando houver.
- O APK usa uma **chave de assinatura fixa** (`android-app/debug.keystore`): um APK novo instala por cima do antigo, sem desinstalar e sem perder dados.

## Parte 1 — Colocar o projeto no GitHub
1. Entre em github.com (crie a conta grátis se precisar) → **New repository** → nome `satori` → *Public* (Actions e Pages são ilimitados em repositório público; em privado há uma cota grátis mensal) → **Create repository**.
2. Descompacte o `satori.zip`. A pasta `satori/` tem `index.html`, `app.js`, `.github/`, `android-app/` etc. **O conteúdo dessa pasta precisa ficar na raiz do repositório** (o `index.html` na raiz, não dentro de uma subpasta).
3. No terminal, dentro da pasta `satori/`:
   ```sh
   git init
   git add .
   git commit -m "Satori 0.6.0"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/satori.git
   git push -u origin main
   ```
   - Se o `push` recusar com *"refusing to allow ... to create or update workflow"*: o seu token não tem a permissão `workflow`. Gere um token novo em GitHub → Settings → Developer settings → Personal access tokens, marcando **repo** e **workflow**, ou use o GitHub Desktop.
   - Já tem um repositório com a versão antiga? Apague os arquivos antigos, copie os novos por cima (inclusive a pasta oculta `.github`) e faça `git add . && git commit && git push`.

## Parte 2 — Ligar o GitHub Pages (uma vez)
1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Aba **Actions** → se aparecer um aviso, clique em *"I understand my workflows, go ahead and enable them"*.
3. Escolha **Publicar site (GitHub Pages)** → **Run workflow**. Em ~1 minuto fica verde e mostra o endereço do site. Abra e confira.

## Parte 3 — Supabase (uma vez)
No Supabase → **SQL Editor** → cole e execute `supabase/migration-002-corridas.sql` (para as corridas sincronizarem).

## Parte 4 — Gerar o APK
1. **Actions → Gerar APK Android → Run workflow.**
2. Deixe **atualizacao_automatica** marcada, **site_url** vazio (se o seu site for o do GitHub Pages) e **usar_dexie** desmarcado. Clique **Run workflow**.
3. Espere 10–15 min. Verde = pronto. Vermelho = clique no passo que falhou, copie as últimas ~30 linhas do log e me envie.
4. O APK fica em **Releases** (coluna direita da página inicial do repositório) → *Assets* → `satori-vX.Y.Z-bNN.apk`.

## Parte 5 — Instalar no celular
1. No **celular**, abra a página da Release no Chrome e toque no `.apk`.
2. O Android avisa que arquivos assim podem ser perigosos → **Baixar mesmo assim**.
3. Abra o arquivo baixado → o Android pede para permitir *"Instalar apps desconhecidos"* para o Chrome → **Permitir** → voltar → **Instalar**. Se o Play Protect avisar, toque em **Instalar mesmo assim** (o app é seu e foi compilado no seu repositório).
4. Ao abrir o Satori: **Localização → "Permitir o tempo todo"** (no Android 10+ escolha primeiro "Durante o uso" e depois, em *Configurações → Apps → Satori → Permissões → Localização*, mude para "Permitir o tempo todo") e **permita as notificações**.
5. Para a gravação não ser interrompida: *Configurações → Apps → Satori → Bateria → **Sem restrições***.

## Parte 6 — Atualizar depois
- **Mudanças no app (telas, corrida, cálculos…):** `git add . && git commit -m "..." && git push`. O workflow publica o site; no celular, feche e abra o Satori (precisa de internet nessa abertura). Pronto.
- **Mudanças nativas** (nova permissão/plugin, mudança de ícone): rode **Gerar APK Android** de novo. O app mostra "Nova versão do aplicativo → Baixar e instalar"; instalar por cima mantém os dados.
- Cada APK tem número: `vX.Y.Z-bNN`. O histórico está em `CHANGELOG.md`.

## Problemas comuns
| Sintoma | O que fazer |
|---|---|
| Passo "Configurar origem" falha dizendo que não abriu o site | Faça a Parte 2 (Pages) e rode "Publicar site"; ou preencha `site_url` (ex.: seu domínio da Vercel). |
| O app abre em branco | Rode o APK de novo com **atualizacao_automatica desmarcada** (modo embutido) e me avise. |
| "App não instalado" | Provavelmente existe uma versão antiga com outra assinatura: desinstale (faça backup/sincronize antes) e instale de novo. |
| Corrida para quando bloqueio a tela | Localização "Permitir o tempo todo" + bateria "Sem restrições". |
