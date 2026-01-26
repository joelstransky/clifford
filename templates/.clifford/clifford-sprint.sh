#!/bin/bash
# .clifford/clifford-sprint.sh - The Clifford "Ralph Wiggin" Loop

set -e

# Find active sprint
MANIFEST=$(find sprints -name "manifest.json" -exec grep -l '"status": "active"' {} + | head -n 1)

if [ -z "$MANIFEST" ]; then
  echo "❌ No active sprint found in sprints/*/manifest.json"
  exit 1
fi

SPRINT_DIR=$(dirname "$MANIFEST")
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
  # Using md5sum on Linux, will fallback to md5 if needed (not needed here as env is Linux)
  PREV_HASH=$(md5sum "$MANIFEST" | awk '{print $1}')

  echo "🤖 Invoking Agent..."
  
  # Attempt to invoke the agent. 
  # In this environment, we might use 'opencode', 'clifford', or just 'npm run dev'.
  if command -v opencode &> /dev/null; then
    opencode run --agent developer "CURRENT_SPRINT_DIR: $SPRINT_DIR"
  elif [ -f "package.json" ]; then
    # If clifford is the tool being developed, we might call it directly
    # But usually the loop is what TRIGGERS the agent.
    echo "Waiting for Agent to process task..."
    # Placeholder for actual invocation if needed
    # npm run dev -- sprint "$SPRINT_DIR" 
  else
    echo "❌ No agent execution method found (opencode or local clifford)."
    exit 1
  fi

  # In this simulation/bootstrap, we expect the manifest to be updated by the agent.
  # For the script to work in a real loop, it needs to wait for the agent.
  
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
