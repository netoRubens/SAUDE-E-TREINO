#!/bin/sh
# Roda um comando e, se falhar, escreve o MOTIVO no painel "Annotations" do GitHub (além do log).
# Uso: sh scripts/ci-step.sh "Título do passo" comando args...
title="$1"; shift
log="$(mktemp)"
"$@" >"$log" 2>&1; code=$?
cat "$log"
if [ "$code" -ne 0 ]; then
  enc() { sed 's/%/%25/g; s/\r//g' | awk '{printf "%s%%0A", $0}'; }
  echo "::error title=FALHOU em $title::$(tail -n 30 "$log" | enc)"
  key="$(grep -n -i -E 'what went wrong|caused by|error[: ]|ERR!|not found|cannot|could not|failed' "$log" | head -15 | enc)"
  [ -n "$key" ] && echo "::error title=Linhas-chave ($title)::$key"
  exit "$code"
fi
