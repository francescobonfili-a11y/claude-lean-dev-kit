#!/usr/bin/env node
/**
 * Hook SessionStart: avvisa se CLAUDE.md e' pesante. Non chiede mai restrizioni di lettura
 * (permissions.deny): Claude deve poter leggere ogni file. Soglie: max 120 righe, max 5120 byte.
 * Non blocca mai la sessione: ogni errore esce silenziosamente con codice 0.
 */
const fs = require('fs');
const path = require('path');

const MAX_LINES = 120;
const MAX_BYTES = 5120;

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf-8') || '{}'); } catch { return {}; }
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const warnings = [];
  // Avvisa solo dentro un progetto vero: niente rumore (e token) in cartelle qualsiasi.
  const markers = ['.git', 'package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml', 'composer.json', 'CLAUDE.md'];
  if (!markers.some(m => fs.existsSync(path.join(cwd, m)))) process.exit(0);

  for (const p of [path.join(cwd, 'CLAUDE.md'), path.join(cwd, '.claude', 'CLAUDE.md')]) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf-8');
    const lines = content.replace(/\r?\n$/, '').split(/\r?\n/).length;
    const bytes = Buffer.byteLength(content, 'utf-8');
    const name = path.relative(cwd, p);
    if (lines > MAX_LINES) warnings.push(`${name} ha ${lines} righe (limite ${MAX_LINES})`);
    if (bytes > MAX_BYTES) warnings.push(`${name} pesa ${bytes} byte (limite ${MAX_BYTES})`);
  }

  if (warnings.length) {
    const msg = `[lean-dev-kit] ${warnings.join('; ')}. Lancia /lean-dev-kit:init-lean.`;
    // systemMessage = visibile all'utente; additionalContext = visibile a Claude
    process.stdout.write(JSON.stringify({
      systemMessage: msg,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg }
    }));
  }
} catch { /* mai bloccare l'avvio */ }
process.exit(0);
