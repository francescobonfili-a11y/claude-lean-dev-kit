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
try { entries = fs.readdirSync(proj, { withFileTypes: true }); } catch { console.error(`Cartella non leggibile: ${proj}`); process.exit(1); }
// Monorepo: oltre alla radice si guardano le sottocartelle di primo livello (frontend/, backend/...).
const SKIP = new Set(['node_modules', 'dist', 'build', 'target', 'vendor', 'storage', 'docs']);
const locations = [''].concat(entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name)).map(e => e.name));
const listDir = loc => { try { return fs.readdirSync(path.join(proj, loc)); } catch { return []; } };

// Regole comuni a ogni progetto.
const COMMON_DENY = ['coverage/**', '**/*.log', '.env*'];

// detect: come riconoscere lo stack. deny: percorsi rumorosi. ask: lockfile (opzionali).
const STACKS = {
  node:   { detect: (has) => has('package.json'), deny: ['node_modules/**', 'dist/**', 'build/**', '.next/**', '.nuxt/**'], ask: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] },
  python: { detect: (has) => has('pyproject.toml') || has('requirements.txt') || has('setup.py') || has('.venv') || has('venv'), deny: ['.venv/**', 'venv/**', '**/__pycache__/**', '.pytest_cache/**'], ask: ['poetry.lock', 'uv.lock', 'Pipfile.lock'] },
  dotnet: { detect: (has, hasExt) => hasExt('.sln') || hasExt('.csproj'), deny: ['**/bin/**', '**/obj/**'], ask: ['**/packages.lock.json'] },
  rust:   { detect: (has) => has('Cargo.toml'), deny: ['target/**'], ask: ['Cargo.lock'] },
  go:     { detect: (has) => has('go.mod'), deny: ['vendor/**'], ask: ['go.sum'] },
  java:   { detect: (has) => has('pom.xml') || has('build.gradle') || has('build.gradle.kts'), deny: ['target/**', 'build/**', '.gradle/**'], ask: [] },
  php:    { detect: (has) => has('composer.json'), deny: ['vendor/**'], ask: ['composer.lock'] },
  unity:  { detect: (has) => has('Assets') && has('ProjectSettings'), deny: ['Library/**', 'Temp/**', 'Logs/**', '**/obj/**'], ask: [] },
};

// found: { stack, loc } per ogni stack trovato nella radice o in una sottocartella.
const found = [];
for (const loc of locations) {
  const names = listDir(loc);
  const has = n => names.includes(n);
  const hasExt = ext => names.some(e => e.endsWith(ext));
  for (const k of Object.keys(STACKS)) if (STACKS[k].detect(has, hasExt)) found.push({ stack: k, loc });
}
// Pattern gia' globali (**/...) restano tali; gli altri sono relativi alla cartella dello stack.
const rule = (loc, p) => `Read(./${loc && !p.startsWith('**/') ? loc + '/' : ''}${p})`;
const wantDeny = [...new Set([...found.flatMap(({ stack, loc }) => STACKS[stack].deny.map(p => rule(loc, p))), ...COMMON_DENY.map(p => rule('', p))])];
const wantAsk = ASK_LOCKS ? [...new Set(found.flatMap(({ stack, loc }) => STACKS[stack].ask.map(p => rule(loc, p))))] : [];

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
console.log(`Stack rilevato: ${found.map(x => x.stack + (x.loc ? ` (${x.loc}/)` : '')).join(', ') || 'nessuno (solo regole comuni)'}`);
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
