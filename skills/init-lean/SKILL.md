---
name: init-lean
description: >
  Comprime CLAUDE.md sotto le 120 righe / 5 KB, sposta i dettagli in docs/architecture.md,
  e genera .claudeignore. Da lanciare una volta su ogni progetto nuovo o pesante.
---

# Skill: init-lean

## Obiettivo

Preparare un progetto per il lavoro lean riducendo il contesto caricato automaticamente da Claude Code.

## Passi

### 1. Analizza `CLAUDE.md`

- Conta righe e dimensione in byte.
- Se è già ≤ 120 righe e ≤ 5120 byte, segnala "già ottimizzato" e passa al passo 3.

### 2. Comprimi `CLAUDE.md`

- Estrai le sezioni di dettaglio (architettura, convenzioni verbose, esempi lunghi).
- Spostale in `docs/architecture.md` (crea la directory se manca).
- In `CLAUDE.md` lascia solo:
  - Descrizione progetto (3-5 righe)
  - Stack tecnologico (elenco puntato)
  - Convenzioni critiche (max 20 righe)
  - Link a `docs/architecture.md` per i dettagli
- Verifica che il risultato sia ≤ 120 righe e ≤ 5120 byte.

### 3. Genera `.claudeignore`

Se `.claudeignore` non esiste, crealo con:

```
node_modules/
dist/
build/
.next/
coverage/
*.lock
*.log
.env*
```

Se esiste già, verifica che contenga almeno le voci sopra e aggiungi quelle mancanti.

### 4. Report finale

Stampa un riepilogo:

```
✅ init-lean completato
   CLAUDE.md: <righe> righe, <byte> byte
   docs/architecture.md: creato/aggiornato
   .claudeignore: creato/verificato
```
