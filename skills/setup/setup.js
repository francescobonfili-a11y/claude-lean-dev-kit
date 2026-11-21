#!/usr/bin/env node
/**
 * lean-dev-kit setup: applica la configurazione consigliata su QUESTA postazione.
 * Idempotente. Senza --apply mostra solo il diff. Con --apply scrive, dopo backup.
 * Tocca solo: model, effortLevel, env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE in settings.json
 * e il blocco delimitato da marcatori in ~/.claude/CLAUDE.md.
 * Uso: node setup.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const APPLY = process.argv.includes('--apply');
const claudeDir = path.join(os.homedir(), '.claude');
const settingsFile = path.join(claudeDir, 'settings.json');
const mdFile = path.join(claudeDir, 'CLAUDE.md');
const policyFile = path.join(__dirname, '..', '..', 'templates', 'policy.md');
const START = '<!-- lean-dev-kit:start -->';
const END = '<!-- lean-dev-kit:end -->';

const RECOMMENDED = { model: 'opusplan', effortLevel: 'medium', autocompact: '50' };

const rd = f => { try { return fs.readFileSync(f, 'utf-8'); } catch { return null; } };
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const changes = [];

// 1. settings.json
let raw = rd(settingsFile);
let settings = {};
if (raw !== null) {
  try { settings = JSON.parse(raw); } catch { console.error('settings.json non e\' JSON valido: nessuna modifica.'); process.exit(1); }
}
const before = JSON.stringify(settings);
const set = (label, cur, next, fn) => {
  if (cur === next) return;
  changes.push(`settings.json: ${label}: ${cur === undefined ? '(non impostato)' : cur} -> ${next}`);
  fn();
};
set('model', settings.model, RECOMMENDED.model, () => { settings.model = RECOMMENDED.model; });
set('effortLevel', settings.effortLevel, RECOMMENDED.effortLevel, () => { settings.effortLevel = RECOMMENDED.effortLevel; });
settings.env = settings.env || {};
set('env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE', settings.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, RECOMMENDED.autocompact,
  () => { settings.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = RECOMMENDED.autocompact; });
if (!Object.keys(settings.env).length) delete settings.env;
const settingsChanged = JSON.stringify(settings) !== before;

// 2. blocco in ~/.claude/CLAUDE.md
const policy = rd(policyFile);
if (policy === null) { console.error(`Template non trovato: ${policyFile}`); process.exit(1); }
const block = `${START}\n${policy.trim()}\n${END}`;
let md = rd(mdFile);
let newMd;
if (md === null) { newMd = block + '\n'; changes.push('CLAUDE.md globale: creato con il blocco lean-dev-kit'); }
else {
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (re.test(md)) {
    newMd = md.replace(re, block);
    if (newMd !== md) changes.push('CLAUDE.md globale: blocco lean-dev-kit aggiornato');
  } else {
    newMd = md.replace(/\s*$/, '') + '\n\n' + block + '\n';
    changes.push('CLAUDE.md globale: blocco lean-dev-kit aggiunto in fondo');
  }
}
const mdChanged = md === null || newMd !== md;

if (!changes.length) { console.log('Gia\' allineato: nessuna modifica.'); process.exit(0); }
console.log(APPLY ? 'Modifiche applicate:' : 'Modifiche proposte (nessuna scritta):');
changes.forEach(c => console.log(' - ' + c));
if (md !== null && !/lean-dev-kit:start/.test(md) && /Orchestrazione skill/i.test(md))
  console.log('\nAttenzione: nel tuo CLAUDE.md esiste gia\' una sezione "Orchestrazione skill" scritta a mano: dopo il setup conviene rimuoverla per non duplicare le regole.');

if (APPLY) {
  if (settingsChanged) {
    if (raw !== null) fs.writeFileSync(`${settingsFile}.bak-${stamp}`, raw);
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  }
  if (mdChanged) {
    if (md !== null) fs.writeFileSync(`${mdFile}.bak-${stamp}`, md);
    fs.writeFileSync(mdFile, newMd);
  }
  console.log(`\nBackup con suffisso .bak-${stamp}. Riavvia Claude Code per applicare.`);
} else {
  console.log('\nPer applicare: node setup.js --apply');
}
