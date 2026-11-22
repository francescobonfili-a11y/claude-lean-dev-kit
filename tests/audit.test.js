const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', 'skills', 'audit', 'audit.js');
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };

function env() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-home-'));
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'aud-proj-'));
  const run = (...a) => spawnSync('node', [script, proj, ...a], { encoding: 'utf-8', env: { ...process.env, HOME: home, USERPROFILE: home } }).stdout;
  return { home, proj, run };
}
const slug = p => p.replace(/[^a-zA-Z0-9]/g, '-');

test('conta MEMORY.md del progetto', () => {
  const { home, proj, run } = env();
  write(path.join(home, '.claude', 'projects', slug(proj), 'memory', 'MEMORY.md'), '- [a](a.md) — gancio\n'.repeat(50));
  assert.match(run(), /Memoria \(MEMORY\.md\)\s+~\d+\s+51 righe/);
});

test('senza memoria non compare la voce', () => {
  const { run } = env();
  assert.doesNotMatch(run(), /Memoria \(MEMORY/);
});

test('baseline: nessuna scrittura senza --save, delta dopo --save', () => {
  const { home, proj, run } = env();
  write(path.join(proj, 'CLAUDE.md'), 'x'.repeat(2300));
  assert.match(run(), /Nessuna baseline/);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'lean-dev-kit')));
  assert.match(run('--save'), /Baseline salvata/);
  write(path.join(proj, 'CLAUDE.md'), 'x'.repeat(4600));
  const out = run();
  assert.match(out, /~1001 -> ~2001 token \(\+1000\)/);
  assert.match(out, /CLAUDE\.md \(progetto\): \+1000/);
});
