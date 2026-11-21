---
name: mode
description: Mostra stato di modello/plugin o cambia profilo (base|memory|full) per il progetto corrente.
argument-hint: "[status|base|memory|full]"
disable-model-invocation: true
---

Esegui `node "<base directory di questa skill>/mode.js" $ARGUMENTS` (senza argomenti = `status`).

Riporta solo l'output, senza commenti. Profili:
- `base`: nucleo globale (default, contesto minimo)
- `memory`: + claude-mem, per progetti lunghi che richiedono memoria tra sessioni
- `full`: + token-optimizer (richiede Node >= 22.18)
