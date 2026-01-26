#!/bin/bash
# Ralph Verify - Autonomous error detection

echo "🔍 Running Type Check (TSC)..."
npx tsc --noEmit
TSC_STATUS=$?

echo "🎨 Running Linter (ESLint)..."
LINT_PATTERNS="src/**/*.{ts,tsx}"
if [ -d "app" ]; then LINT_PATTERNS="$LINT_PATTERNS app/**/*.{ts,tsx}"; fi
if [ -d "convex" ]; then LINT_PATTERNS="$LINT_PATTERNS convex/**/*.{ts,tsx}"; fi
npx eslint $LINT_PATTERNS
LINT_STATUS=$?

echo "🧪 Running Smoke Tests (Jest)..."
npm test -- --passWithNoTests
TEST_STATUS=$?

echo "🌐 Running Headless Web Boot Check..."
if [ -d "app" ]; then
    node .bigred/headless-check.js
    HEADLESS_STATUS=$?
else
    echo "⏭️ Skipping Headless Web Boot Check (no 'app' directory found)."
    HEADLESS_STATUS=0
fi

if [ $TSC_STATUS -eq 0 ] && [ $LINT_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ] && [ $HEADLESS_STATUS -eq 0 ]; then
    echo "✅ Loop Verification Passed. Clean as a whistle."
    exit 0
else
    echo "❌ Loop Verification Failed. Check the errors above."
    exit 1
fi
