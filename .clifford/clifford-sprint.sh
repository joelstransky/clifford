#!/bin/bash
# .clifford/clifford-sprint.sh - The Clifford "Ralph Wiggin" Loop

set -e

# Support passing a specific sprint directory
TARGET_DIR=$1

if [ -n "$TARGET_DIR" ]; then
  MANIFEST="$TARGET_DIR/manifest.json"
  if [ ! -f "$MANIFEST" ]; then
    echo "❌ Manifest not found at $MANIFEST"
    exit 1
  fi
else
  # Find active sprint
  MANIFEST=$(find sprints -name "manifest.json" -exec grep -l '"status": "active"' {} + | head -n 1)
fi

if [ -z "$MANIFEST" ]; then
  echo "❌ No active sprint found in sprints/*/manifest.json and no target provided."
  exit 1
fi

SPRINT_DIR=$(dirname "$MANIFEST")

# --- Sprint State Synchronization ---
echo "🔄 Synchronizing sprint states..."
for m in sprints/*/manifest.json; do
  if [ "$m" == "$MANIFEST" ]; then
    # Force target to active
    sed -i '0,/"status": "[^"]*"/s//"status": "active"/' "$m"
  else
    # Set any other active sprints to pending
    sed -i '0,/"status": "active"/s//"status": "pending"/' "$m"
  fi
done
# ------------------------------------

echo "🚀 Clifford Loop Started for: $SPRINT_DIR"

while true; do
  # Get next pending task using Node to check if we should continue
  PENDING_TASK=$(node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));
    const task = manifest.tasks.find(t => t.status === 'pending');
    if (task) {
      console.log(task.id);
    }
  ")

  if [ -z "$PENDING_TASK" ]; then
    echo "🏁 No more pending tasks. Sprint complete!"
    echo "Run .clifford/clifford-approve.sh to finalize."
    break
  fi

  echo "------------------------------------------------"
  echo "🔍 Next Task: $PENDING_TASK"
  
  # Calculate manifest hash to detect progress
  PREV_HASH=$(md5sum "$MANIFEST" | awk '{print $1}')

  echo "🤖 Invoking Agent..."
  
  # Load prompt content
  PROMPT_CONTENT=$(cat .opencode/agent/developer.md 2>/dev/null || echo "Implement the next task.")

  # Attempt to invoke the agent. 
  if command -v opencode &> /dev/null; then
    opencode run --agent developer "CURRENT_SPRINT_DIR: $SPRINT_DIR\n\n$PROMPT_CONTENT"
  elif [ -f "package.json" ]; then
    echo "Waiting for Agent to process task..."
    # Placeholder for actual invocation if needed
  else
    echo "❌ No agent execution method found (opencode or local clifford)."
    exit 1
  fi

  # Check if manifest updated
  NEW_HASH=$(md5sum "$MANIFEST" | awk '{print $1}')
  
  if [ "$PREV_HASH" == "$NEW_HASH" ]; then
    echo "⚠️ No progress detected in manifest.json."
    echo "If you are running this manually, ensure you have updated the manifest."
    echo "Breaking loop to prevent infinite recursion."
    exit 1
  fi
  
  echo "✅ Progress detected. Moving to next task..."
done
