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
| `/lean-dev-kit:mode [status\|base\|memory\|full]` | Stato modello/plugin con avvisi; attiva i plugin pesanti solo nel progetto corrente (`.claude/settings.local.json`) |
| `/lean-dev-kit:init-lean` | Comprime `CLAUDE.md` (<120 righe/5 KB) e aggiunge `permissions.deny` per i file rumorosi (Claude Code non supporta `.claudeignore`) |
| Hook `SessionStart` | Solo dentro un progetto: avvisa se `CLAUDE.md` è pesante o mancano regole deny. Silenzioso altrimenti |

## Routing (cosa usare quando)

| Situazione | Strumento | Modello |
|---|---|---|
| Fix veloce, 1-2 file | chat diretta, nessuna skill | Sonnet |
| Feature nuova / refactor multi-file | plan mode (`Shift+Tab`) + `superpowers:brainstorming` → `writing-plans` | Opus pianifica, Sonnet esegue |
| Bug non ovvio | `superpowers:systematic-debugging` | Sonnet |
| Capire > ~5 file o documenti lunghi | `/ext-analyze` | Gemini |
| Commit con > ~50 righe di logica di dominio | `/ext-review` (una volta) | Codex/Gemini |
| API di una libreria | context7 | — |
| Progetto lungo, serve memoria tra sessioni | `/lean-dev-kit:mode memory` | — |
| Progetto nuovo o `CLAUDE.md` gonfio | `/lean-dev-kit:init-lean` | Sonnet |

## Configurazione consigliata (`~/.claude/settings.json`)

```json
{
  "model": "opusplan",
  "enabledPlugins": {
    "lean-dev-kit@my-lean-marketplace": true,
    "superpowers@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "andrej-karpathy-skills@karpathy-skills": true,
    "claude-mem@thedotmack": false,
    "token-optimizer@token-optimizer": false
  }
}
```

Le regole di routing vanno anche, in forma compatta, nel `~/.claude/CLAUDE.md` globale (vedi sotto), così Claude le applica senza caricare skill.

```markdown
## Orchestrazione
- superpowers: ignora la regola "1% -> invoca sempre". Solo: brainstorming/writing-plans
  per feature multi-file, systematic-debugging per bug non ovvi, TDD se il progetto ha test.
  Fix banali: nessuna skill.
- Design in plan mode (Opus), implementazione su Sonnet (opusplan).
- Memoria: quella nativa. claude-mem solo se attivo nel progetto.
- Output asciutto: niente preamboli, narrazione dei tool o riepiloghi finali.
```

## Installazione

```text
/plugin marketplace add francescobonfili-a11y/claude-lean-dev-kit
/plugin install lean-dev-kit@my-lean-marketplace
```

Aggiornamento sulle altre postazioni dopo un push:

```text
/plugin marketplace update my-lean-marketplace
```

## Struttura

```
.claude-plugin/{plugin.json, marketplace.json}
skills/mode/{SKILL.md, mode.js}
skills/init-lean/SKILL.md
hooks/{hooks.json, check-lean.js}
```

## Licenza

Uso personale — francescobonfili-a11y
