#!/usr/bin/env node
/**
 * lean-dev-kit init-lean: rileva lo stack e aggiunge a .claude/settings.json le regole
 * permissions.deny per i file rumorosi (merge: non tocca altre chiavi ne' regole esistenti).
 * Senza --apply mostra solo l'anteprima. Con --apply scrive, dopo backup se il file esisteva.
 * Con --ask-locks aggiunge i lockfile dello stack a permissions.ask (lettura solo con permesso).
 * Uso: node init-lean.js [cartella-progetto] [--apply] [--ask-locks]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ASK_LOCKS = args.includes('--ask-locks');
const proj = path.resolve(args.find(a => !a.startsWith('--')) || process.env.CLAUDE_PROJECT_DIR || process.cwd());

let entries = [];
try { entries = fs.readdirSync(proj); } catch { console.error(`Cartella non leggibile: ${proj}`); process.exit(1); }
const has = n => entries.includes(n);
const hasExt = ext => entries.some(e => e.endsWith(ext));

// Regole comuni a ogni progetto.
const COMMON_DENY = ['coverage/**', '**/*.log', '.env*'];

// detect: come riconoscere lo stack. deny: percorsi rumorosi. ask: lockfile (opzionali).
const STACKS = {
  node:   { detect: () => has('package.json'), deny: ['node_modules/**', 'dist/**', 'build/**', '.next/**', '.nuxt/**'], ask: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] },
  python: { detect: () => has('pyproject.toml') || has('requirements.txt') || has('setup.py'), deny: ['.venv/**', 'venv/**', '**/__pycache__/**', '.pytest_cache/**'], ask: ['poetry.lock', 'uv.lock', 'Pipfile.lock'] },
  dotnet: { detect: () => hasExt('.sln') || hasExt('.csproj'), deny: ['**/bin/**', '**/obj/**'], ask: ['**/packages.lock.json'] },
  rust:   { detect: () => has('Cargo.toml'), deny: ['target/**'], ask: ['Cargo.lock'] },
  go:     { detect: () => has('go.mod'), deny: ['vendor/**'], ask: ['go.sum'] },
  java:   { detect: () => has('pom.xml') || has('build.gradle') || has('build.gradle.kts'), deny: ['target/**', 'build/**', '.gradle/**'], ask: [] },
  php:    { detect: () => has('composer.json'), deny: ['vendor/**'], ask: ['composer.lock'] },
  unity:  { detect: () => has('Assets') && has('ProjectSettings'), deny: ['Library/**', 'Temp/**', 'Logs/**', '**/obj/**'], ask: [] },
};

const detected = Object.keys(STACKS).filter(k => STACKS[k].detect());
const rule = p => `Read(./${p})`;
const wantDeny = [...new Set([...detected.flatMap(k => STACKS[k].deny), ...COMMON_DENY])].map(rule);
const wantAsk = ASK_LOCKS ? [...new Set(detected.flatMap(k => STACKS[k].ask))].map(rule) : [];

const file = path.join(proj, '.claude', 'settings.json');
let raw = null;
try { raw = fs.readFileSync(file, 'utf-8'); } catch { /* file assente */ }
let settings = {};
if (raw !== null) {
  try { settings = JSON.parse(raw); } catch { console.error(`${file} non e' JSON valido: nessuna modifica.`); process.exit(1); }
}

settings.permissions = settings.permissions || {};
const added = { deny: [], ask: [] };
for (const [key, want] of [['deny', wantDeny], ['ask', wantAsk]]) {
  if (!want.length) continue;
  const cur = Array.isArray(settings.permissions[key]) ? settings.permissions[key] : [];
  const missing = want.filter(r => !cur.includes(r));
  if (missing.length) { settings.permissions[key] = [...cur, ...missing]; added[key] = missing; }
}
if (!Object.keys(settings.permissions).length) delete settings.permissions;

console.log(`Progetto: ${proj}`);
console.log(`Stack rilevato: ${detected.join(', ') || 'nessuno (solo regole comuni)'}`);
if (!added.deny.length && !added.ask.length) { console.log('Gia\' allineato: nessuna regola da aggiungere.'); process.exit(0); }
console.log(APPLY ? 'Regole aggiunte a .claude/settings.json:' : 'Regole proposte (nessuna scritta):');
added.deny.forEach(r => console.log(`  deny ${r}`));
added.ask.forEach(r => console.log(`  ask  ${r}`));

if (APPLY) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (raw !== null) fs.writeFileSync(`${file}.bak-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`, raw);
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  console.log(`\nScritto ${file}.`);
} else {
  console.log('\nPer applicare: aggiungi --apply (e --ask-locks per i lockfile).');
}
