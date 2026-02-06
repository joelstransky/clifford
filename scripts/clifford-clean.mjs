#!/usr/bin/env node
/**
 * clifford-clean.mjs
 *
 * Wipes transient Clifford state so UAT can start from a clean slate.
 * Removes:
 *   - .clifford/sprints/   (copied test fixtures)
 *   - .clifford/asm.json   (agent memory)
 *   - .clifford/state.json (session state)
 *   - uat-output/          (artifacts from test sprints)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const targets = [
  { path: path.join(projectRoot, '.clifford', 'sprints'), label: '.clifford/sprints/' },
  { path: path.join(projectRoot, '.clifford', 'asm.json'), label: '.clifford/asm.json' },
  { path: path.join(projectRoot, '.clifford', 'state.json'), label: '.clifford/state.json' },
  { path: path.join(projectRoot, 'uat-output'), label: 'uat-output/' },
];

let cleaned = 0;

for (const t of targets) {
  if (fs.existsSync(t.path)) {
    fs.rmSync(t.path, { recursive: true, force: true });
    console.log(`  🗑️  Removed ${t.label}`);
    cleaned++;
  }
}

if (cleaned === 0) {
  console.log('✨ Already clean — nothing to remove.');
} else {
  console.log(`\n🧹 Cleaned ${cleaned} item(s). Ready for a fresh run.`);
}
