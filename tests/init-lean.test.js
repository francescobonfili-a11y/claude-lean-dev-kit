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

test('apply: deny per stack, lockfile NON in deny e nessun ask senza flag', () => {
  const d = mk({ 'package.json': '{}' });
  run(d, '--apply');
  const p = settings(d).permissions;
  assert.ok(p.deny.includes('Read(./node_modules/**)'));
  assert.ok(p.deny.includes('Read(./.env*)'));
  assert.ok(!p.deny.some(r => /lock/.test(r)));
  assert.strictEqual(p.ask, undefined);
});

test('--ask-locks aggiunge i lockfile a ask', () => {
  const d = mk({ 'Cargo.toml': '' });
  run(d, '--apply', '--ask-locks');
  assert.deepStrictEqual(settings(d).permissions.ask, ['Read(./Cargo.lock)']);
});

test('merge: preserva chiavi e regole esistenti, idempotente, backup', () => {
  const d = mk({ 'package.json': '{}', '.claude/settings.json': JSON.stringify({ model: 'opusplan', permissions: { deny: ['Read(./segreti/**)'], allow: ['Bash(ls)'] } }) });
  run(d, '--apply');
  const s = settings(d);
  assert.strictEqual(s.model, 'opusplan');
  assert.deepStrictEqual(s.permissions.allow, ['Bash(ls)']);
  assert.ok(s.permissions.deny.includes('Read(./segreti/**)'));
  assert.ok(fs.readdirSync(path.join(d, '.claude')).some(f => f.includes('.bak-')));
  assert.match(run(d, '--apply').stdout, /Gia' allineato/);
});

test('settings.json non valido: esce con errore senza toccare il file', () => {
  const d = mk({ 'package.json': '{}', '.claude/settings.json': '{rotto' });
  const r = run(d, '--apply');
  assert.strictEqual(r.status, 1);
  assert.strictEqual(fs.readFileSync(path.join(d, '.claude', 'settings.json'), 'utf-8'), '{rotto');
});

test('stack non rilevato: solo regole comuni', () => {
  const d = mk({ 'note.txt': 'x' });
  assert.match(run(d).stdout, /nessuno/);
});
