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

`.claudeignore` NON e' supportato da Claude Code. Usa `permissions.deny` in `.claude/settings.json`.

- Se il file esiste, leggilo e fai merge: non sovrascrivere altre chiavi ne' regole esistenti.
- Aggiungi (solo quelle mancanti, adattando allo stack del progetto):

```json
{
  "permissions": {
    "deny": [
      "Read(./node_modules/**)",
      "Read(./dist/**)",
      "Read(./build/**)",
      "Read(./.next/**)",
      "Read(./coverage/**)",
      "Read(./**/*.lock)",
      "Read(./**/*.log)",
      "Read(./.env*)"
    ]
  }
}
```

- Mostra il diff all'utente prima di scrivere se il file esisteva gia'.

### 4. Report finale

```
✅ init-lean completato
   CLAUDE.md: <righe> righe, <byte> byte
   docs/architecture.md: creato/aggiornato/non necessario
   .claude/settings.json: <n> regole deny aggiunte
```
