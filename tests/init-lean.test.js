const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', 'skills', 'init-lean', 'init-lean.js');
const run = (dir, ...a) => spawnSync('node', [script, dir, ...a], { encoding: 'utf-8' });
const mk = files => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ild-'));
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
    fs.writeFileSync(path.join(d, f), c);
  }
  return d;
};
const settings = d => JSON.parse(fs.readFileSync(path.join(d, '.claude', 'settings.json'), 'utf-8'));

test('anteprima non scrive nulla', () => {
  const d = mk({ 'package.json': '{}' });
  const r = run(d);
  assert.match(r.stdout, /Stack rilevato: node/);
  assert.ok(!fs.existsSync(path.join(d, '.claude', 'settings.json')));
});

test('default: nessuna restrizione, nemmeno con --apply', () => {
  const d = mk({ 'package.json': '{}' });
  assert.match(run(d, '--apply').stdout, /Nessuna restrizione richiesta/);
  assert.ok(!fs.existsSync(path.join(d, '.claude', 'settings.json')));
});

test('--deny: regole per stack, lockfile NON in deny e nessun ask senza flag', () => {
  const d = mk({ 'package.json': '{}' });
  run(d, '--apply', '--deny');
  const p = settings(d).permissions;
  assert.ok(p.deny.includes('Read(./node_modules/**)'));
  assert.ok(!p.deny.some(r => /\/\.env\*|\.log|lock/.test(r)));
  assert.strictEqual(p.ask, undefined);
});

test('--ask-locks aggiunge a ask solo i lockfile esistenti', () => {
  const d = mk({ 'Cargo.toml': '', 'Cargo.lock': '' });
  run(d, '--apply', '--ask-locks');
  assert.deepStrictEqual(settings(d).permissions.ask, ['Read(./Cargo.lock)']);
});

test('merge: preserva chiavi e regole esistenti, idempotente, backup', () => {
  const d = mk({ 'package.json': '{}', '.claude/settings.json': JSON.stringify({ model: 'opusplan', permissions: { deny: ['Read(./segreti/**)'], allow: ['Bash(ls)'] } }) });
  run(d, '--apply', '--deny');
  const s = settings(d);
  assert.strictEqual(s.model, 'opusplan');
  assert.deepStrictEqual(s.permissions.allow, ['Bash(ls)']);
  assert.ok(s.permissions.deny.includes('Read(./segreti/**)'));
  assert.ok(fs.readdirSync(path.join(d, '.claude')).some(f => f.includes('.bak-')));
  assert.match(run(d, '--apply', '--deny').stdout, /Gia' allineato/);
});

test('settings.json non valido: esce con errore senza toccare il file', () => {
  const d = mk({ 'package.json': '{}', '.claude/settings.json': '{rotto' });
  const r = run(d, '--apply', '--deny');
  assert.strictEqual(r.status, 1);
  assert.strictEqual(fs.readFileSync(path.join(d, '.claude', 'settings.json'), 'utf-8'), '{rotto');
});

test('stack non rilevato: solo regole comuni', () => {
  const d = mk({ 'note.txt': 'x' });
  assert.match(run(d).stdout, /nessuno/);
});

test('monorepo: rileva gli stack nelle sottocartelle e prefissa le regole', () => {
  const d = mk({ 'frontend/package.json': '{}', 'frontend/package-lock.json': '{}', 'backend/requirements.txt': '', '.venv/x': '' });
  const r = run(d, '--apply', '--deny', '--ask-locks');
  assert.match(r.stdout, /node \(frontend\/\)/);
  assert.match(r.stdout, /python \(backend\/\)/);
  const p = settings(d).permissions;
  assert.ok(p.deny.includes('Read(./frontend/node_modules/**)'));
  assert.ok(p.deny.includes('Read(./backend/.venv/**)'));
  assert.ok(p.deny.includes('Read(./.venv/**)'));
  assert.ok(p.ask.includes('Read(./frontend/package-lock.json)'));
  assert.ok(!p.ask.includes('Read(./backend/poetry.lock)'));
  assert.ok(!p.deny.some(r => /\/\.env\*|\.log/.test(r)));
});
