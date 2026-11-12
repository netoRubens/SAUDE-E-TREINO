# Histórico de versões do Satori

> Cada versão tem número (`MAIOR.MENOR.CORREÇÃO`). A versão aparece no app em **Perfil e metas → Versão do app** e no nome do APK (`satori-v0.5.0-b12.apk`, onde `b12` é o número da compilação).

## [0.5.0] — 11/11/2026
**Novo**
- **Cadastro inicial por perguntas** (uma por tela, estilo Yazio): conta, nome, objetivo, sexo, nascimento, altura, peso, peso desejado e ritmo, atividade, experiência, treinos por semana, limitações, alergias e resumo com meta de calorias e macros.
- **Conta com "Lembrar de mim"** (e-mail lembrado; a senha nunca é guardada pelo app). Quem já tem conta entra direto e recupera o perfil.
- **Corrida (estilo Strava)**: GPS, distância, tempo, pace atual e médio, velocidade, pausa manual e automática, trajeto desenhado ao vivo, resumo final com linha do percurso, salvar/descartar, histórico e detalhes.
- **Aviso sonoro + vibração + notificação a cada 1 km** (configurável: 500 m, 1, 2 ou 5 km).
- **Recuperação** de corrida após fechamento inesperado do app.
- Corridas aparecem no **histórico de treinos**, no calendário e na **Evolução**; sincronizam entre aparelhos.
- **Aplicativo Android** (APK) com GPS em segundo plano, gerado pelo GitHub Actions.
**Decisões**: sem estimativa de calorias na corrida e sem ligação com a dieta; mapa por ora é o trajeto desenhado (sem mapa de ruas).
**Limites conhecidos**: GPS em segundo plano, bipe com tela bloqueada e notificações só podem ser validados no celular (ver `ROTEIRO-TESTE-CELULAR.md`).

## [0.4.0] — 10/11/2026
- Conta e sincronização com o Supabase (login, envio/recebimento, exclusões, conflito = vence o mais recente).

## [0.3.0] — 10/11/2026
- Identidade Satori (rosa `#F0A1BB`), importar treino por planilha + prompt para o ChatGPT, lembrete de backup, refeições modelo, aviso de atualização.

## [0.2.0] — 09/11/2026
- Treinos da planilha original, dieta personalizada, peso com intervalo mínimo de 7 dias, hidratação, passos, hábitos, evolução, backup/restauração, PWA offline.

## [0.1.0] — 09/11/2026
- Primeira versão: perfil, metas, cálculo de calorias (Mifflin-St Jeor) e painel.
