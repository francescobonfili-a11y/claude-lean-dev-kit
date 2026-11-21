# claude-lean-dev-kit

Plugin leggero per Claude Code progettato per mantenere alta la qualità ingegneristica riducendo il consumo del limite settimanale su Claude Pro.

## Componenti inclusi

- **Subagent `explorer` (Haiku):** analisi codebase e log in sola lettura, senza sporcare il contesto principale.
- **Subagent `architect` (Opus):** design architetturale, specifiche e bug complessi.
- **Subagent `reviewer` (Sonnet):** code review isolata sul solo `git diff`.
- **Skill `/init-lean`:** crea/comprime `CLAUDE.md` (<120 righe), sposta i dettagli in `docs/architecture.md` e genera `.claudeignore`.
- **Skill `/dev-flow`:** orchestra automaticamente i 3 subagent (Esplorazione → Design → Implementazione → Review).
- **Hook `SessionStart`:** segnala all'avvio se `CLAUDE.md` supera le 120 righe/5 KB o se manca `.claudeignore`.

## Installazione (su ogni postazione)

1. Apri Claude Code ed esegui:
   ```text
   /plugin marketplace add francescobonfili-a11y/claude-lean-dev-kit
   /plugin install lean-dev-kit@my-lean-marketplace
   ```

2. Imposta sonnet (o opus/plan) come modello base in `~/.claude/settings.json`:
   ```json
   {
     "model": "sonnet"
   }
   ```

3. Disabilita dallo scope user i plugin ridondanti (`code-review`, `token-optimizer`) e sposta fuori da `~/.claude/agents/` eventuali agenti globali inutilizzati.

## Aggiornamento sulle altre postazioni

Dopo aver fatto `git push` di una modifica al repository, esegui su ciascun PC:

```text
/plugin marketplace update my-lean-marketplace
```

## Utilizzo quotidiano

| Scenario | Azione |
|---|---|
| **Nuovo progetto o progetto pesante** | Lancia `/init-lean` una volta sola |
| **Fix veloci** | Lavora direttamente in chat su Sonnet |
| **Feature strutturate o refactor critici** | Lancia `/dev-flow <descrizione del task>` |

## Struttura del repository

```
claude-lean-dev-kit/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── agents/
│   ├── explorer.md
│   ├── architect.md
│   └── reviewer.md
├── skills/
│   ├── init-lean/SKILL.md
│   └── dev-flow/SKILL.md
├── hooks/
│   ├── hooks.json
│   └── check-lean.js
├── .gitignore
└── README.md
```

## Licenza

Uso personale — francescobonfili-a11y
