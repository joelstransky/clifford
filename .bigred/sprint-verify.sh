#!/bin/bash
# Sprint Verify - Validate manifest, commit, and push

set -e

# --- Find the active/completed sprint manifest ---
SPRINT_DIR=""
for dir in sprints/*/; do
  if [ -f "$dir/manifest.json" ]; then
    STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$dir/manifest.json','utf8')).status)")
    if [ "$STATUS" = "active" ] || [ "$STATUS" = "completed" ]; then
      SPRINT_DIR="$dir"
      break
    fi
  fi
done

if [ -z "$SPRINT_DIR" ]; then
  echo "❌ No active or completed sprint found."
  exit 1
fi

MANIFEST="$SPRINT_DIR/manifest.json"
echo "📋 Validating manifest: $MANIFEST"

# --- Validate manifest structure ---
node -e "
const fs = require('fs');
const path = require('path');
const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));

const errors = [];

if (!m.id) errors.push('Missing id');
if (!m.name) errors.push('Missing name');
if (!m.status) errors.push('Missing status');
if (!Array.isArray(m.tasks) || m.tasks.length === 0) errors.push('No tasks defined');

const validStatuses = ['planning', 'active', 'completed'];
if (!validStatuses.includes(m.status)) errors.push('Invalid sprint status: ' + m.status);

const validTaskStatuses = ['pending', 'active', 'completed', 'blocked', 'pushed'];
for (const t of (m.tasks || [])) {
  if (!t.id) errors.push('Task missing id');
  if (!t.file) errors.push('Task ' + t.id + ' missing file');
  if (!validTaskStatuses.includes(t.status)) errors.push('Task ' + t.id + ' has invalid status: ' + t.status);
  
  const taskPath = path.join('$SPRINT_DIR', t.file);
  if (!fs.existsSync(taskPath)) errors.push('Task file not found: ' + taskPath);
}

// If sprint is completed, all tasks must be completed/pushed
if (m.status === 'completed') {
  const incomplete = m.tasks.filter(t => t.status !== 'completed' && t.status !== 'pushed');
  if (incomplete.length > 0) {
    errors.push('Sprint is completed but these tasks are not: ' + incomplete.map(t => t.id).join(', '));
  }
}

if (errors.length > 0) {
  console.error('❌ Manifest validation failed:');
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
} else {
  console.log('✅ Manifest is valid (' + m.tasks.length + ' tasks, status: ' + m.status + ')');
}
"

# --- Commit and push ---
echo "📦 Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit — working tree clean."
else
  SPRINT_NAME=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).id)")
  echo "💾 Committing: $SPRINT_NAME verified"
  git commit -m "verified: $SPRINT_NAME"
fi

echo "🚀 Pushing to remote..."
git push

echo "✅ Sprint verified, committed, and pushed."
