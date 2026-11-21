---
name: dev-flow
description: >
  Orchestra automaticamente i 3 subagent (explorer → architect → reviewer)
  per gestire feature strutturate e refactor critici con routing ottimale dei modelli.
---

# Skill: dev-flow

## Obiettivo

Automatizzare il flusso completo di sviluppo di una feature o refactor:
**Esplorazione → Design → Implementazione → Review**

## Uso

```
/dev-flow <descrizione del task>
```

## Passi

### 1. Esplorazione (→ explorer / Haiku)

Delega all'agent `explorer` con il prompt:

> Analizza la codebase in relazione a: `<descrizione del task>`.
> Identifica: file coinvolti, dipendenze, pattern esistenti, rischi.
> Restituisci un report conciso (max 50 righe).

Attendi il report prima di procedere.

### 2. Design (→ architect / Opus)

Delega all'agent `architect` con il prompt:

> Dato il seguente report di esplorazione:
> ```
> <report dell'explorer>
> ```
> Progetta la soluzione per: `<descrizione del task>`.
> Produci: specifiche implementative, file da creare/modificare, ordine delle operazioni.

Attendi il design prima di procedere.

### 3. Implementazione (Sonnet — contesto principale)

Implementa la soluzione seguendo le specifiche dell'architect:

- Lavora sui file indicati, nell'ordine specificato.
- Rispetta le convenzioni del progetto (da `CLAUDE.md`).
- Fai commit atomici con messaggi convenzionali (`feat:`, `fix:`, `refactor:`).

### 4. Review (→ reviewer / Sonnet)

Delega all'agent `reviewer` con il prompt:

> Esegui una code review del diff corrente (`git diff HEAD~1`).
> Produci il report nel formato standard.

### 5. Report finale

Stampa un riepilogo:

```
✅ dev-flow completato per: <descrizione del task>

📊 Modelli utilizzati:
   - Explorer (Haiku): ~<token> token
   - Architect (Opus): ~<token> token
   - Implementazione (Sonnet): contesto principale
   - Reviewer (Sonnet): ~<token> token

📋 Review verdict: <APPROVE|REQUEST_CHANGES>
```

Se il verdict è `REQUEST_CHANGES`, mostra i punti critici e chiedi all'utente se procedere con le correzioni.
