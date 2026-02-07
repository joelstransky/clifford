#!/bin/bash
set -e
SPRINT_DIR="sprints/sprint-10-ux-refinements"
MANIFEST="$SPRINT_DIR/manifest.json"
echo "📋 Validating manifest: $MANIFEST"
node -e "
const fs = require('fs');
const path = require('path');
const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));
const errors = [];
if (!m.id) errors.push('Missing id');
if (!m.name) errors.push('Missing name');
if (!m.status) errors.push('Missing status');
if (!Array.isArray(m.tasks) || m.tasks.length === 0) errors.push('No tasks defined');
const validTaskStatuses = ['pending', 'active', 'completed', 'blocked', 'pushed'];
for (const t of (m.tasks || [])) {
  if (!t.id) errors.push('Task missing id');
  if (!t.file) errors.push('Task ' + t.id + ' missing file');
  if (!validTaskStatuses.includes(t.status)) errors.push('Task ' + t.id + ' has invalid status: ' + t.status);
  const taskPath = path.join('$SPRINT_DIR', t.file);
  if (!fs.existsSync(taskPath)) errors.push('Task file not found: ' + taskPath);
}
if (errors.length > 0) {
  console.error('❌ Manifest validation failed:');
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
} else {
  console.log('✅ Manifest is valid (' + m.tasks.length + ' tasks, status: ' + m.status + ')');
}
"
