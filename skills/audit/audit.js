#!/usr/bin/env node
/**
 * lean-dev-kit audit: stima il contesto FISSO che Claude carica in questo progetto
 * (agenti, CLAUDE.md, skill, MCP, plugin) e classifica dove si risparmia di piu'.
 * Stima calibrata (vedi estAgent/estMd). Il valore esatto resta /context.
 * Uso: node audit.js [cartella-progetto]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const SAVE = process.argv.includes('--save');
const proj = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const slug = p => p.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
const home = os.homedir();
// Rapporti calibrati su /context reale: frontmatter agenti (inglese) ~4.6 car/token, CLAUDE.md (italiano+markdown) ~2.3.
const estAgent = n => Math.ceil(n / 4.6);
const estMd = n => Math.ceil(n / 2.3);
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return {}; } };
const readTxt = f => { try { return fs.readFileSync(f, 'utf-8'); } catch { return null; } };
const listMd = d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.md')).map(f => path.join(d, f)); } catch { return []; } };

// Testo che finisce nel prompt: il solo frontmatter (nome, descrizione, tools).
function frontmatterLen(file) {
  const t = readTxt(file);
  if (!t) return 0;
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return (m ? m[1] : t.slice(0, 400)).length;
}

const rows = [];   // { cat, tokens, detail, advice }
const notes = [];

// 1. Agenti (utente + progetto)
for (const [label, dir] of [['utente', path.join(home, '.claude', 'agents')], ['progetto', path.join(proj, '.claude', 'agents')]]) {
  const files = listMd(dir);
  if (!files.length) continue;
  const tokens = estAgent(files.reduce((s, f) => s + frontmatterLen(f), 0));
  rows.push({
    cat: `Agenti (${label})`, tokens, detail: `${files.length} file`,
    advice: tokens > 3000 ? 'Troppi: archivia quelli non usati con /lean-dev-kit:init-lean (passo agenti).' : '',
  });
}

// 2. CLAUDE.md
for (const [label, f] of [
  ['utente', path.join(home, '.claude', 'CLAUDE.md')],
  ['progetto', path.join(proj, 'CLAUDE.md')],
  ['progetto/.claude', path.join(proj, '.claude', 'CLAUDE.md')],
  ['locale', path.join(proj, 'CLAUDE.local.md')],
]) {
  const t = readTxt(f);
  if (t === null) continue;
  const tokens = estMd(t.length);
  const lines = t.split(/\r?\n/).length;
  rows.push({
    cat: `CLAUDE.md (${label})`, tokens, detail: `${lines} righe, ${(t.length / 1024).toFixed(1)} KB`,
    advice: tokens > 1500 ? 'Pesante: /lean-dev-kit:init-lean (sposta il dettaglio in docs/).' : '',
  });
  if (/^\s*@\S+/m.test(t)) notes.push(`${label}: CLAUDE.md contiene import @file, il peso reale e' maggiore della stima.`);
}

// 2b. Memoria nativa: le prime 200 righe di MEMORY.md sono caricate a ogni sessione.
try {
  const root = path.join(home, '.claude', 'projects');
  const hit = fs.readdirSync(root).find(d => d.toLowerCase() === slug(proj));
  const mem = hit && readTxt(path.join(root, hit, 'memory', 'MEMORY.md'));
  if (mem) {
    const loaded = mem.split(/\r?\n/).slice(0, 200).join('\n');
    const tokens = estMd(loaded.length);
    rows.push({
      cat: 'Memoria (MEMORY.md)', tokens, detail: `${mem.split(/\r?\n/).length} righe, ${(mem.length / 1024).toFixed(1)} KB`,
      advice: tokens > 1500 ? 'Indice pesante: accorcia le righe o elimina le memorie obsolete.' : '',
    });
  }
} catch { /* nessuna memoria per questo progetto */ }

// 3. Skill e comandi propri (utente + progetto)
for (const [label, base] of [['utente', path.join(home, '.claude')], ['progetto', path.join(proj, '.claude')]]) {
  const files = [];
  try {
    for (const d of fs.readdirSync(path.join(base, 'skills'))) {
      const f = path.join(base, 'skills', d, 'SKILL.md');
      if (fs.existsSync(f)) files.push(f);
    }
  } catch { /* nessuna skill */ }
  files.push(...listMd(path.join(base, 'commands')));
  if (!files.length) continue;
  const tokens = estAgent(files.reduce((s, f) => s + frontmatterLen(f), 0));
  rows.push({ cat: `Skill/comandi (${label})`, tokens, detail: `${files.length} file`, advice: tokens > 2000 ? 'Molte descrizioni sempre caricate: archivia le non usate.' : '' });
}

// 4. Server MCP configurati (nome, non costo: i tool si vedono con /context)
const mcp = new Set(Object.keys(readJson(path.join(home, '.claude.json')).mcpServers || {}));
const projEntry = (readJson(path.join(home, '.claude.json')).projects || {})[proj.replace(/\\/g, '/')] || {};
Object.keys(projEntry.mcpServers || {}).forEach(k => mcp.add(k));
Object.keys(readJson(path.join(proj, '.mcp.json')).mcpServers || {}).forEach(k => mcp.add(k));
if (mcp.size) rows.push({ cat: 'Server MCP', tokens: null, detail: [...mcp].join(', '), advice: 'Ogni server aggiunge definizioni di tool: tieni a livello utente solo quelli usati ovunque. Controlla gli stati con /mcp e rimuovi i Failed.' });

// 5. Plugin e impostazioni effettive
const merged = { plugins: {}, s: {} };
for (const f of [path.join(home, '.claude', 'settings.json'), path.join(proj, '.claude', 'settings.json'), path.join(proj, '.claude', 'settings.local.json')]) {
  const j = readJson(f);
  Object.assign(merged.plugins, j.enabledPlugins || {});
  merged.s = { ...merged.s, ...j, env: { ...(merged.s.env || {}), ...(j.env || {}) } };
}
const on = Object.keys(merged.plugins).filter(k => merged.plugins[k]);
rows.push({ cat: 'Plugin attivi', tokens: null, detail: on.join(', ') || 'nessuno', advice: 'Ogni plugin porta skill/hook sempre caricati. Pesanti per progetto: /lean-dev-kit:mode.' });

const s = merged.s;
const cfg = [];
if (s.model === 'opus') cfg.push('model=opus: tutto su Opus. Usa "opusplan".');
if (s.effortLevel === 'high' || s.effortLevel === 'xhigh') cfg.push(`effortLevel=${s.effortLevel} di default: piu' ragionamento su ogni turno. Meglio "medium", e alto solo sui task a rischio.`);
const pct = Number((s.env || {}).CLAUDE_AUTOCOMPACT_PCT_OVERRIDE);
if (pct && pct < 40) cfg.push(`autocompact al ${pct}%: buffer riservato e compattazioni frequenti. Consigliato 50-60.`);
if ((s.env || {}).CLAUDE_CODE_SUBAGENT_MODEL) cfg.push(`CLAUDE_CODE_SUBAGENT_MODEL=${s.env.CLAUDE_CODE_SUBAGENT_MODEL}: forza questo modello su tutti i subagent (il campo model: degli agent viene ignorato).`);
const [maj, min] = process.versions.node.split('.').map(Number);
if (on.includes('token-optimizer@token-optimizer') && (maj < 22 || (maj === 22 && min < 18)))
  cfg.push(`token-optimizer con Node ${process.versions.node}: hook lenti (serve >=22.18 o >=24.11).`);

// Output
rows.sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
const fixed = rows.reduce((t, r) => t + (r.tokens || 0), 0);
const pad = (x, n) => String(x).padEnd(n);
console.log(`AUDIT contesto fisso - ${proj}`);
console.log(`Modello: ${s.model || '(default)'} | effort: ${s.effortLevel || '(default)'}\n`);
console.log(`${pad('Voce', 28)}${pad('Token stimati', 15)}Dettaglio`);
for (const r of rows) console.log(`${pad(r.cat, 28)}${pad(r.tokens === null ? '-' : '~' + r.tokens, 15)}${r.detail}`);
console.log(`\nTotale stimato (agenti+CLAUDE.md+skill proprie): ~${fixed} token. System prompt e tool di base (~20k) esclusi; skill dei plugin non incluse: confronta con /context.`);
// Baseline: confronto con lo snapshot salvato in precedenza (scrittura solo con --save).
const stateFile = path.join(home, '.claude', 'lean-dev-kit', `baseline-${slug(proj)}.json`);
const snap = { date: new Date().toISOString().slice(0, 10), total: fixed, rows: Object.fromEntries(rows.filter(r => r.tokens !== null).map(r => [r.cat, r.tokens])) };
const base = readJson(stateFile);
if (base.rows) {
  const d = fixed - base.total;
  console.log(`\nBaseline del ${base.date}: ~${base.total} -> ~${fixed} token (${d > 0 ? '+' : ''}${d})`);
  for (const k of new Set([...Object.keys(base.rows), ...Object.keys(snap.rows)])) {
    const delta = (snap.rows[k] || 0) - (base.rows[k] || 0);
    if (delta) console.log(`  ${k}: ${delta > 0 ? '+' : ''}${delta}${k in base.rows ? '' : ' (nuova)'}${k in snap.rows ? '' : ' (rimossa)'}`);
  }
} else if (!SAVE) console.log('\nNessuna baseline: usa --save per salvare lo stato attuale come riferimento.');
if (SAVE) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(snap, null, 2) + '\n');
  console.log(`\nBaseline salvata (${snap.date}, ~${fixed} token) in ${stateFile}`);
}

const adv = rows.filter(r => r.advice && (r.tokens === null || r.tokens > 0));
const top = adv.filter(r => r.tokens).map(r => `- ${r.cat} (~${r.tokens}): ${r.advice}`);
const other = adv.filter(r => !r.tokens).map(r => `- ${r.cat}: ${r.advice}`);
if (top.length || cfg.length || other.length) {
  console.log('\nInterventi, in ordine di resa:');
  [...top, ...cfg.map(c => '- Config: ' + c), ...other].forEach(l => console.log(l));
} else console.log('\nNessun intervento necessario.');
notes.forEach(n => console.log('Nota: ' + n));
