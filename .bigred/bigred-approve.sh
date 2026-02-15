#!/bin/bash
# bigred-approve.sh - The Final Sprint Approval and Push
# Usage: ./.bigred/bigred-approve.sh sprints/sprint-001-example

SPRINT_DIR=$1

if [ -z "$SPRINT_DIR" ]; then
    echo "Usage: $0 <sprint-directory>"
    exit 1
fi

echo "🏁 Approving Sprint: $(basename "$SPRINT_DIR")"

# 1. Update Changelog (Optional but recommended)
echo "📝 Updating CHANGELOG.md..."
DATE=$(date +%Y-%m-%d)
SPRINT_NAME=$(basename "$SPRINT_DIR")
echo -e "\n## [$DATE] $SPRINT_NAME" >> CHANGELOG.md
grep '"file"' "$SPRINT_DIR/manifest.json" | sed 's/.*tasks\/\(.*\).md.*/- \1/' >> CHANGELOG.md

# 2. Final Verification
./.bigred/sprint-verify.sh
if [ $? -ne 0 ]; then
    echo "❌ Final verification failed. Please fix before pushing."
    exit 1
fi

# 3. Final Commit
echo "💾 Finalizing sprint..."
git add CHANGELOG.md
git commit -m "chore: approve sprint $(basename "$SPRINT_DIR")" || true

# 4. Mark as Verified
sed -i 's/"status": "completed"/"status": "verified"/' "$SPRINT_DIR/manifest.json"

echo "✨ Sprint approved and finalized locally."
