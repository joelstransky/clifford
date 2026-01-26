#!/bin/bash
# .clifford/sprint-verify.sh - Clifford Sprint Verification Script

set -e

echo "🔍 Running Clifford Sprint Verification..."

if [ -f "package.json" ]; then
# GATES_START
  echo "--- Checking Lint ---"
  npm run lint || { echo "❌ Linting failed"; exit 1; }
  
  echo "--- Running Tests ---"
  npm test || { echo "❌ Tests failed"; exit 1; }
# GATES_END
fi

echo "✅ Verification complete. All systems go!"
exit 0
