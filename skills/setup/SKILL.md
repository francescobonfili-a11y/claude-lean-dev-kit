---
name: setup
description: Allinea questa postazione alla configurazione lean consigliata (modello, effort, autocompact, regole globali).
disable-model-invocation: true
---

1. Esegui `node "<base directory di questa skill>/setup.js"` (solo anteprima) e mostra l'elenco delle modifiche.
2. Chiedi conferma esplicita. Senza un "si'" non scrivere nulla.
3. Con la conferma esegui `node "<base directory di questa skill>/setup.js" --apply` e riporta l'esito.

Il comando e' idempotente e fa backup (`.bak-<data>`). Va eseguito una volta per ogni postazione.
