#!/usr/bin/env node

/**
 * Hook SessionStart: verifica che CLAUDE.md sia leggero e .claudeignore esista.
 * Soglie: max 120 righe, max 5120 byte.
 */

const fs = require('fs');
const path = require('path');

const MAX_LINES = 120;
const MAX_BYTES = 5120;
const PREFIX = '[lean-dev-kit]';

const cwd = process.cwd();
const claudeMd = path.join(cwd, 'CLAUDE.md');
const claudeIgnore = path.join(cwd, '.claudeignore');

const warnings = [];

// Check CLAUDE.md
if (fs.existsSync(claudeMd)) {
  const content = fs.readFileSync(claudeMd, 'utf-8');
  const stats = fs.statSync(claudeMd);
  const lines = content.split('\n').length;
  const bytes = stats.size;

  if (lines > MAX_LINES) {
    warnings.push(`⚠️  CLAUDE.md ha ${lines} righe (limite: ${MAX_LINES}). Lancia /init-lean per comprimerlo.`);
  }
  if (bytes > MAX_BYTES) {
    warnings.push(`⚠️  CLAUDE.md pesa ${bytes} byte (limite: ${MAX_BYTES}). Lancia /init-lean per comprimerlo.`);
  }
  if (lines <= MAX_LINES && bytes <= MAX_BYTES) {
    // Tutto ok, nessun avviso
  }
} else {
  // Nessun CLAUDE.md presente, non è un errore
}

// Check .claudeignore
if (!fs.existsSync(claudeIgnore)) {
  warnings.push(`⚠️  .claudeignore non trovato. Lancia /init-lean per generarlo.`);
}

// Output
if (warnings.length > 0) {
  console.log(`\n${PREFIX} Controllo contesto all'avvio:`);
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}
