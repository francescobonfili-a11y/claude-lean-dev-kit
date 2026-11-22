---
name: audit
description: Stima il contesto fisso del progetto (agenti, CLAUDE.md, skill, MCP, plugin) e classifica i risparmi.
disable-model-invocation: true
---

Esegui `node "<base directory di questa skill>/audit.js"` e riporta l'output senza commenti aggiuntivi.
Se l'output dice "Nessuna baseline", chiedi se salvarla (`--save`); dopo un intervento, ripeti con `--save` per aggiornarla.
Poi proponi (non applicare) al massimo i 3 interventi con la resa maggiore, citando la skill che li esegue
(`/lean-dev-kit:init-lean`, `/lean-dev-kit:mode`, `/lean-dev-kit:setup`).
