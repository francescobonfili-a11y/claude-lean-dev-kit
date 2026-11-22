---
name: init-lean
description: Comprime CLAUDE.md (<120 righe/5 KB) e aggiunge regole permissions.deny per i file rumorosi.
disable-model-invocation: true
---

# Skill: init-lean

## Obiettivo

Ridurre il contesto caricato automaticamente da Claude Code.

## Passi

### 1. Analizza `CLAUDE.md`

- Conta righe e byte. Se <= 120 righe e <= 5120 byte, segnala "gia' ottimizzato" e passa al passo 3.

### 2. Comprimi `CLAUDE.md`

- Sposta architettura, convenzioni verbose ed esempi lunghi in `docs/architecture.md` (crea la directory se manca). Non perdere contenuto: spostalo, non cancellarlo.
- In `CLAUDE.md` lascia solo: descrizione (3-5 righe), stack (elenco), convenzioni critiche (max 20 righe), link a `docs/architecture.md`.
- Mostra il diff all'utente prima di sovrascrivere `CLAUDE.md`.
- Verifica che il risultato sia <= 120 righe e <= 5120 byte.

### 3. Escludi i file rumorosi

`.claudeignore` NON e' supportato da Claude Code. Le esclusioni vanno in `permissions.deny` di `.claude/settings.json`. Lo script rileva lo stack, fa il merge (non tocca altre chiavi ne' regole esistenti) e fa backup.

1. Anteprima: `node "<base directory di questa skill>/init-lean.js"`. Mostra lo stack e le regole che aggiungerebbe.
2. Lockfile (opzionale): non vanno in `deny` perche' a volte servono per debuggare le dipendenze. Chiedi all'utente se vuole che Claude debba chiedere permesso prima di leggerli (`permissions.ask`). Se si', aggiungi `--ask-locks`.
3. Mostra l'anteprima e chiedi conferma. Senza un "si'" non scrivere nulla.
4. Con la conferma: `node "<base directory di questa skill>/init-lean.js" --apply [--ask-locks]`.

### 4. Triage agenti e skill del progetto

Solo se `node "<base directory>/../audit/audit.js"` segnala agenti > ~3k token:

- Elenca gli agenti in `.claude/agents/` (nome + una riga di descrizione) raggruppati per area.
- Proponi quali tenere (quelli coerenti con lo stack e il lavoro reale del progetto) e quali archiviare.
- Dopo conferma, **sposta** (mai cancellare) i non scelti in `.claude/_archivio/agents/`. Ripristino = rimettere il file.
- Non toccare `~/.claude/agents/` senza richiesta esplicita.

### 5. Report finale

```
✅ init-lean completato
   CLAUDE.md: <righe> righe, <byte> byte
   docs/architecture.md: creato/aggiornato/non necessario
   .claude/settings.json: <n> regole deny aggiunte, lockfile ask: si'/no
   Agenti: <tenuti>/<totali>, archiviati in .claude/_archivio/agents/
```
