#!/usr/bin/env node
/**
 * lean-dev-kit mode: attiva i plugin pesanti solo nel progetto che li richiede.
 * Scrive enabledPlugins in <progetto>/.claude/settings.local.json (non committato).
 * Uso: node mode.js [status|base|memory|full]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// Plugin "pesanti" (contesto iniettato a ogni sessione) gestiti dai profili.
const HEAVY = {
  memory: ['claude-mem@thedotmack'],
  tokens: ['token-optimizer@token-optimizer'],
};
const PROFILES = {
  base: [],                                  // solo il nucleo globale
  memory: [...HEAVY.memory],                 // memoria persistente cross-sessione
  full: [...HEAVY.memory, ...HEAVY.tokens],  // tutto
};
const ALL_HEAVY = Object.values(HEAVY).flat();

const proj = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const files = {
  user: path.join(os.homedir(), '.claude', 'settings.json'),
  project: path.join(proj, '.claude', 'settings.json'),
  local: path.join(proj, '.claude', 'settings.local.json'),
};
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return {}; } };

function effective() {
  const plugins = {};
  let s = {};
  for (const k of ['user', 'project', 'local']) {
    const j = read(files[k]);
    Object.assign(plugins, j.enabledPlugins || {});
    s = { ...s, ...j, env: { ...(s.env || {}), ...(j.env || {}) } };
  }
  return { plugins, settings: s };
}

function status() {
  const { plugins, settings } = effective();
  const on = Object.keys(plugins).filter(k => plugins[k]);
  const warn = [];
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (on.includes('token-optimizer@token-optimizer') && (maj < 22 || (maj === 22 && min < 18)))
    warn.push(`token-optimizer attivo con Node ${process.versions.node}: hook lenti (serve >=22.18 o >=24.11)`);
  if (settings.model === 'opus') warn.push('model=opus: tutto gira su Opus. Consigliato "opusplan" (Opus pianifica, Sonnet esegue)');
  const pct = Number((settings.env || {}).CLAUDE_AUTOCOMPACT_PCT_OVERRIDE);
  if (pct && pct < 40) warn.push(`autocompact al ${pct}%: compattazioni frequenti (riassunti extra, perdita di dettagli)`);
  if (settings.effortLevel === 'high') warn.push('effortLevel=high di default: piu token di ragionamento su ogni turno');
  console.log(`Progetto: ${proj}`);
  console.log(`Modello: ${settings.model || '(default)'}  effort: ${settings.effortLevel || '(default)'}`);
  console.log(`Plugin attivi: ${on.join(', ') || 'nessuno'}`);
  console.log(warn.length ? 'Avvisi:\n - ' + warn.join('\n - ') : 'Nessun avviso.');
}

function apply(name) {
  const want = PROFILES[name];
  if (!want) {
    console.error(`Profilo sconosciuto: ${name}. Usa: status, ${Object.keys(PROFILES).join(', ')}`);
    process.exit(1);
  }
  const j = read(files.local);
  j.enabledPlugins = j.enabledPlugins || {};
  for (const p of ALL_HEAVY) j.enabledPlugins[p] = want.includes(p);
  fs.mkdirSync(path.dirname(files.local), { recursive: true });
  fs.writeFileSync(files.local, JSON.stringify(j, null, 2) + '\n');
  console.log(`Profilo "${name}" scritto in ${files.local}`);
  console.log('Effettivo dalla prossima sessione: /exit e poi `claude --continue`.');
}

const arg = (process.argv[2] || 'status').toLowerCase();
if (arg === 'status') status(); else apply(arg);
