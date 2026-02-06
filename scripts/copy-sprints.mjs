#!/usr/bin/env node
/**
 * copy-sprints.mjs
 *
 * Copies UAT test sprint fixtures from templates/sprints/ into .clifford/sprints/.
 * This provides repeatable test data for manual UAT verification.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const source = path.join(projectRoot, 'templates', 'sprints');
const target = path.join(projectRoot, '.clifford', 'sprints');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(source)) {
  console.error('❌ Source not found:', source);
  process.exit(1);
}

// Ensure .clifford/sprints exists
fs.mkdirSync(target, { recursive: true });

const entries = fs.readdirSync(source, { withFileTypes: true });
let copied = 0;

for (const entry of entries) {
  if (entry.isDirectory()) {
    const srcDir = path.join(source, entry.name);
    const destDir = path.join(target, entry.name);
    copyDirSync(srcDir, destDir);
    copied++;
    console.log(`  ✅ ${entry.name} → .clifford/sprints/${entry.name}`);
  }
}

if (copied === 0) {
  console.log('⚠️  No sprint fixtures found in templates/sprints/');
} else {
  console.log(`\n🚀 Copied ${copied} test sprint(s) to .clifford/sprints/`);
}
