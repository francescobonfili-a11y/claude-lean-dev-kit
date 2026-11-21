#!/usr/bin/env node
/**
 * Hook UserPromptSubmit: suggerisce la skill giusta in base alla richiesta.
 * Zero token se nessuna regola scatta. Ogni suggerimento compare una sola volta per sessione.
 * Non blocca mai il prompt: ogni errore esce silenziosamente con codice 0.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const RULES = [
  { key: 'debug', plugin: 'superpowers@claude-plugins-official',
    re: /\b(bug|crash(es)?|stack ?trace|traceback|exception|non funziona|errore|fails?|failing|broken|regress(ion|ione))\b/i,
    text: 'bug: superpowers:systematic-debugging (causa prima del fix)' },
  { key: 'feature', plugin: 'superpowers@claude-plugins-official',
    re: /(nuova (feature|funzionalit)|implementa|aggiungi (una |un |il |la )?(funzion|feature|modulo|endpoint|pagina)|refactor|riprogett|architettur|progetta|migrazion|migrate)/i,
    text: 'feature/refactor multi-file: plan mode (Shift+Tab, Opus) + superpowers:brainstorming / writing-plans' },
  { key: 'tdd', plugin: 'superpowers@claude-plugins-official',
    re: /\b(tdd|test[- ]first|scrivi (i )?test|unit test|test di regressione)\b/i,
    text: 'test-first: superpowers:test-driven-development' },
  { key: 'review',
    re: /(\breview\b|revisiona|rivedi il (diff|codice)|pre-?commit|pronto per (il )?(commit|pr)\b|pull request)/i,
    text: 'review: /ext-review solo se il diff supera ~50 righe di logica di dominio, altrimenti autocontrollo' },
  { key: 'docs', plugin: 'context7@claude-plugins-official',
    re: /(documentazione (di|della|del)|\bdocs? (of|for)\b|breaking change|versione (di|della|del) \w+|upgrade (di|a|to) )/i,
    text: 'API/versioni di libreria: context7 (documentazione aggiornata)' },
  { key: 'analyze',
    re: /(analizza (tutta|l'intera|la )?(codebase|repo)|come funziona (tutto|il progetto)|panoramica|mappatura|tutti i file)/i,
    text: 'lettura su molti file: /ext-analyze (se servono >~5 file)' },
  { key: 'memory', plugin: 'claude-mem@thedotmack',
    re: /(ricordi|l'altra volta|sessione precedente|abbiamo gi[aà] (fatto|deciso)|come avevamo)/i,
    text: 'memoria tra sessioni: /lean-dev-kit:mode memory (claude-mem) e riavvio' },
  { key: 'cost',
    re: /(\btoken\b|costi|limite settimanale|contesto (pesante|troppo)|claude\.md (pesante|troppo))/i,
    text: 'consumi/contesto: /lean-dev-kit:audit' },
];

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return {}; } }

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}');
  const prompt = String(input.prompt || '').slice(0, 2000);
  if (prompt.length < 15 || prompt.trim().startsWith('/')) process.exit(0);

  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const plugins = {};
  for (const f of [path.join(os.homedir(), '.claude', 'settings.json'), path.join(cwd, '.claude', 'settings.json'), path.join(cwd, '.claude', 'settings.local.json')])
    Object.assign(plugins, readJson(f).enabledPlugins || {});

  const stateFile = path.join(os.tmpdir(), `lean-dev-kit-${String(input.session_id || 'x').replace(/[^\w-]/g, '')}.json`);
  const seen = new Set(readJson(stateFile).seen || []);

  const hits = RULES.filter(r => !seen.has(r.key) && r.re.test(prompt)).slice(0, 2);
  if (!hits.length) process.exit(0);

  const lines = hits.map(r => {
    const off = r.plugin && plugins[r.plugin] === false ? ' [plugin disattivo: abilitalo con /plugin o /lean-dev-kit:mode]' : '';
    return `- ${r.text}${off}`;
  });
  hits.forEach(r => seen.add(r.key));
  try { fs.writeFileSync(stateFile, JSON.stringify({ seen: [...seen] })); } catch { /* stato opzionale */ }

  const msg = `[lean-dev-kit] Suggerimento:\n${lines.join('\n')}`;
  process.stdout.write(JSON.stringify({
    systemMessage: msg,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `${msg}\nProponi in una riga all'utente se utile; non invocare senza conferma.`,
    },
  }));
} catch { /* mai bloccare il prompt */ }
process.exit(0);
