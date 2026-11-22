---
name: init-lean
description: Comprime CLAUDE.md (<120 righe/5 KB) e fa il triage degli agenti. Restrizioni di lettura solo se richieste.
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

### 3. Permessi di lettura (solo su richiesta esplicita)

Principio: **Claude deve poter leggere ogni file**. Non proporre ne' applicare restrizioni di tua iniziativa: salta questo passo, a meno che l'utente le chieda.
Se le chiede (`.claudeignore` NON e' supportato; si usa `permissions` in `.claude/settings.json`):

1. Anteprima: `node "<base directory di questa skill>/init-lean.js" --deny [--ask-locks]`. `--deny` blocca cartelle generate/dipendenze dello stack; `--ask-locks` richiede l'approvazione per leggere i lockfile esistenti. Il merge non tocca altre chiavi ne' regole esistenti.
2. Mostra l'anteprima e chiedi conferma. Senza un "si'" non scrivere nulla.
3. Con la conferma aggiungi `--apply`.
4. Avverti che `vendor/` (PHP, Go) bloccato impedisce di leggere il sorgente delle librerie per il debug: lo script lo include solo con `--deny`, chiedi se tenerlo.

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
   Permessi: nessuna restrizione (default) | deny/ask aggiunti su richiesta
   Agenti: <tenuti>/<totali>, archiviati in .claude/_archivio/agents/
```
