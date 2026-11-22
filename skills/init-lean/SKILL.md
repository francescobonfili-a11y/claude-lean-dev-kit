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

Struttura: un file per modulo/sezione in `docs/moduli/<modulo>.md`, letto solo quando serve.

- Dividi `CLAUDE.md` per sezioni (`## ...`). Sposta il dettaglio dei moduli (architettura, regole di dominio, flussi, esempi lunghi) in `docs/moduli/<slug>.md`, una sezione per file, **copiando le righe testualmente**: non riassumere e non perdere contenuto.
- Ogni file modulo inizia con un titolo e una riga di contesto ("leggi prima di toccare X").
- In `CLAUDE.md` lascia: descrizione (3-5 righe), stack, convenzioni e insidie trasversali, una sezione "Regole critiche" (una riga per regola "mai/sempre" che si rompe facilmente), e un indice dei moduli (`nome` -> `docs/moduli/<slug>.md`) con l'istruzione "leggi il file solo quando lavori su quel modulo".
- Se una parte duplica `~/.claude/CLAUDE.md` (regole globali), sostituiscila con un rimando e dillo nel report.
- Prima di sovrascrivere `CLAUDE.md` mostra l'elenco dei file che creerai e le righe che restano. Se `CLAUDE.md` e' tracciato da git, il backup e' git; altrimenti salva `CLAUDE.md.bak`.
- Verifica che ogni riga non vuota dell'originale compaia nel nuovo `CLAUDE.md` o nei file modulo (escluse intestazioni e duplicati dichiarati) e che il risultato sia <= 120 righe e <= 5120 byte.

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
   docs/moduli/: <n> file creati (o non necessario)
   Permessi: nessuna restrizione (default) | deny/ask aggiunti su richiesta
   Agenti: <tenuti>/<totali>, archiviati in .claude/_archivio/agents/
```
