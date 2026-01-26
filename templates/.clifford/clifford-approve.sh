#!/bin/bash
# .clifford/clifford-approve.sh - Clifford Sprint Approval Script

set -e

echo "🏁 Finalizing Clifford Sprint..."

# Find active sprint
MANIFEST=$(find sprints -name "manifest.json" -exec grep -l '"status": "active"' {} + | head -n 1)

if [ -z "$MANIFEST" ]; then
  echo "❌ No active sprint found to approve."
  exit 1
fi

SPRINT_DIR=$(dirname "$MANIFEST")
echo "Processing sprint: $SPRINT_DIR"

# Mark sprint as completed
node -e "
  const fs = require('fs');
  const manifestPath = '$MANIFEST';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.status = 'completed';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
"

echo "✅ Sprint marked as completed in $MANIFEST"
echo "🚀 Ready for final push/merge."
