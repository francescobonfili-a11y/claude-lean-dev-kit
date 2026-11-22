# claude-lean-dev-kit

Regolatore leggero per Claude Code: ogni skill/plugin si attiva solo quando serve, il resto non occupa contesto. Obiettivo: massima resa professionale con il minimo consumo del limite Claude Pro.

## Principi

1. **Il contesto fisso costa a ogni turno.** Solo plugin piccoli restano attivi globalmente; quelli pesanti si accendono per progetto.
2. **Un modello per fase.** `opusplan`: Opus in plan mode (design), Sonnet per implementare.
3. **Il lavoro largo esce da Claude.** Contesto ampio → Gemini (`/ext-analyze`), seconda opinione sul diff → modello esterno (`/ext-review`).
4. **Le skill del kit non si auto-invocano** (`disable-model-invocation`): zero token finché non le lanci.

## Componenti

| Componente | Cosa fa |
|---|---|
| `/lean-dev-kit:audit` | In qualsiasi progetto stima il contesto fisso (agenti, CLAUDE.md, MEMORY.md, skill, MCP, plugin; baseline con `--save`; stima calibrata, il valore esatto e' `/context`) e classifica i risparmi |
| `/lean-dev-kit:setup` | Allinea **questa postazione**: `opusplan`, effort `medium`, autocompact 50 e blocco di regole in `~/.claude/CLAUDE.md` (marcatori, idempotente, anteprima + backup). Da lanciare su ogni PC |
| `/lean-dev-kit:init-lean` | Comprime `CLAUDE.md`, aggiunge `permissions.deny` (rileva lo stack; lockfile in `ask` opzionale), fa il triage degli agenti del progetto (archivia, non cancella) |
| `/lean-dev-kit:mode [status\|base\|memory\|full]` | Accende i plugin pesanti solo nel progetto corrente |
| Hook `SessionStart` | Solo in un progetto: avvisa se `CLAUDE.md` e' pesante o mancano regole deny |
| Hook `UserPromptSubmit` | Suggerisce la skill adatta alla richiesta (bug, feature, test, review, API, analisi, memoria, costi). Una volta per tipo e sessione, silenzioso se nulla corrisponde |

Nessuna skill del kit si auto-invoca (`disable-model-invocation`): zero token finche' non le lanci.

## Politica per rischio

| Rischio | Processo |
|---|---|
| Banale (1 file, <20 righe) | modifica diretta, `/effort low` |
| Medio | piano di 3-5 righe, test mirato, verifica prima di dire "fatto" |
| Alto (sicurezza, dati, piu' moduli) | plan mode (Opus), TDD, `/ext-review` una volta sul diff |

## Messa a punto di una nuova postazione

```text
/plugin marketplace add francescobonfili-a11y/claude-lean-dev-kit
/plugin install lean-dev-kit@my-lean-marketplace
/lean-dev-kit:setup          # anteprima, poi conferma
```

Su ogni progetto: `/lean-dev-kit:audit`, poi se serve `/lean-dev-kit:init-lean`.

## Aggiornamento

```text
/plugin marketplace update my-lean-marketplace
```

## Struttura

```
.claude-plugin/{plugin.json, marketplace.json}
skills/{audit,setup,mode}/{SKILL.md, *.js}
skills/init-lean/{SKILL.md, init-lean.js}
tests/{init-lean,audit,hooks}.test.js  (node --test tests/)
hooks/{hooks.json, check-lean.js, suggest.js}
templates/policy.md
```

## Licenza

Uso personale — francescobonfili-a11y
