const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const hook = n => path.join(__dirname, '..', 'hooks', n);
const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));
const write = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
let n = 0;

function suggest(prompt, { cwd, session } = {}) {
  const home = tmp('hk-home-');
  const input = { prompt, cwd: cwd || tmp('hk-proj-'), session_id: session || `t${process.pid}-${Date.now()}-${n++}` };
  const r = spawnSync('node', [hook('suggest.js')], { input: JSON.stringify(input), encoding: 'utf-8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  return { out: r.stdout ? JSON.parse(r.stdout) : null, input };
}
const ctx = r => r.out && r.out.hookSpecificOutput.additionalContext;

test('suggest: bug -> systematic-debugging', () => {
  assert.match(ctx(suggest('c\'e\' un bug: il login va in crash dopo il submit')), /systematic-debugging/);
});

test('suggest: una sola volta per tipo e sessione', () => {
  const first = suggest('c\'e\' un bug: il login va in crash dopo il submit');
  const second = suggest('altro bug: il logout va in crash dopo il click', { session: first.input.session_id });
  assert.strictEqual(second.out, null);
});

test('suggest: silenzioso su slash command, prompt corti e testo neutro', () => {
  assert.strictEqual(suggest('/lean-dev-kit:audit con un bug crash').out, null);
  assert.strictEqual(suggest('ok grazie').out, null);
  assert.strictEqual(suggest('rinomina la variabile count in total nel file utils').out, null);
});

test('suggest: ignora i blocchi iniettati dalla sessione (falso positivo gia\' corretto)', () => {
  const p = '<system-reminder>bug crash errore stack trace refactor</system-reminder>\n<browser_instruction>review pull request</browser_instruction>\nrinomina la variabile count in total';
  assert.strictEqual(suggest(p).out, null);
});

test('suggest: al massimo 2 suggerimenti per prompt', () => {
  const r = suggest('c\'e\' un bug con crash; scrivi unit test e fai la review della pull request, controlla i token');
  assert.ok(ctx(r).split('\n').filter(l => l.startsWith('- ')).length <= 2);
});

test('suggest: segnala il plugin disattivo', () => {
  const cwd = tmp('hk-proj-');
  write(path.join(cwd, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'superpowers@claude-plugins-official': false } }));
  assert.match(ctx(suggest('c\'e\' un bug: il login va in crash dopo il submit', { cwd })), /plugin disattivo/);
});

const check = cwd => {
  const r = spawnSync('node', [hook('check-lean.js')], { input: JSON.stringify({ cwd }), encoding: 'utf-8' });
  return r.stdout ? JSON.parse(r.stdout).systemMessage : null;
};

test('check-lean: silenzioso fuori da un progetto', () => {
  assert.strictEqual(check(tmp('hk-vuota-')), null);
});

test('check-lean: avvisa se mancano i deny', () => {
  const d = tmp('hk-proj-');
  write(path.join(d, 'package.json'), '{}');
  assert.match(check(d), /permissions\.deny/);
});

test('check-lean: nessun avviso con deny presenti e CLAUDE.md leggero', () => {
  const d = tmp('hk-proj-');
  write(path.join(d, 'package.json'), '{}');
  write(path.join(d, 'CLAUDE.md'), 'regola\n'.repeat(10));
  write(path.join(d, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: ['Read(./.env*)'] } }));
  assert.strictEqual(check(d), null);
});

test('check-lean: avvisa se CLAUDE.md supera le soglie', () => {
  const d = tmp('hk-proj-');
  write(path.join(d, 'CLAUDE.md'), 'riga lunga di testo\n'.repeat(200));
  write(path.join(d, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: ['Read(./.env*)'] } }));
  assert.match(check(d), /righe.*byte|righe/);
});
