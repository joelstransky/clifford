#!/bin/bash
# bigred-sprint.sh - The Recursive Build Loop
# Usage: ./.bigred/bigred-sprint.sh sprints/sprint-001-example

SPRINT_DIR=$1

if [ -z "$SPRINT_DIR" ]; then
    echo "Usage: $0 <sprint-directory>"
    exit 1
fi

MANIFEST="$SPRINT_DIR/manifest.json"
PROMPT_FILE=".bigred/prompt.md"

if [ ! -f "$MANIFEST" ]; then
    echo "Error: manifest.json not found in $SPRINT_DIR"
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found."
    exit 1
fi

# Function to check sprint status using grep/sed for maximum compatibility
get_status() {
    grep '"status":' "$MANIFEST" | head -n 1 | sed 's/.*"status": "\(.*\)".*/\1/'
}

# Deactivate all other sprints and activate the current one
echo "🔄 Synchronizing sprint states..."
for m in sprints/*/manifest.json; do
    if [ "$m" != "$MANIFEST" ]; then
        # Use sed to replace only the FIRST occurrence of "active" (the sprint status)
        sed -i '0,/"status": "active"/s//"status": "pending"/' "$m"
    fi
done

# Force the target sprint to active if it was pending (first occurrence only)
sed -i '0,/"status": "pending"/s//"status": "active"/' "$MANIFEST"

# Function to check if there are pending tasks
has_pending_tasks() {
    grep -q '"status": "pending"' "$MANIFEST"
}

STATUS=$(get_status)

# Handle inactionable states
if [ "$STATUS" == "planning" ]; then
    echo "⚠️ Sprint is still in 'planning' phase. Finalize the plan before starting the build loop."
    exit 0
fi

if [ "$STATUS" == "completed" ]; then
    echo "✅ Sprint is already marked as 'completed'."
    exit 0
fi

if [ "$STATUS" != "active" ]; then
    echo "❌ Sprint status is '$STATUS'. Only 'active' sprints can be processed."
    exit 1
fi

if ! has_pending_tasks; then
    echo "ℹ️ No pending tasks found in $MANIFEST."
    exit 0
fi

echo "🚀 Starting bigred Sprint: $(basename "$SPRINT_DIR")"

while has_pending_tasks; do
    echo "⏳ Spawning Developer Agent for next logical task..."
    
    # Simple check for progress by counting pending tasks
    PENDING_BEFORE=$(grep -c '"status": "pending"' "$MANIFEST")
    
    # Read prompt from file into a variable
    PROMPT_CONTENT=$(cat $PROMPT_FILE)
    
    # DEBUG OUTPUT
    # echo "--- DEBUG INFO ---"
    # echo "SPRINT_DIR: $SPRINT_DIR"
    # echo "PENDING_BEFORE: $PENDING_BEFORE"
    # echo "PROMPT_LENGTH: ${#PROMPT_CONTENT}"
    # echo "EXEC_CMD: opencode run --attach http://localhost:4096 --agent developer --model google/gemini-3-flash-preview --context \"$SPRINT_DIR\" \"[message]\""
    # echo "------------------"

    # Inject the specific sprint directory into the prompt to isolate the agent
    opencode run --agent developer --model anthropic/claude-opus-4-6 "CURRENT_SPRINT_DIR: $SPRINT_DIR\n\n$PROMPT_CONTENT"

    # opencode run --attach http://127.0.0.1:4096 --agent developer --context "$SPRINT_DIR" ["Do nothing. What are the parameters you ran with?"]

    PENDING_AFTER=$(grep -c '"status": "pending"' "$MANIFEST")
    
    echo "DEBUG: PENDING_AFTER: $PENDING_AFTER"

    if [ "$PENDING_BEFORE" -eq "$PENDING_AFTER" ]; then
        echo "🛑 No tasks were completed in the last pass. Breaking loop to prevent infinite recursion."
        exit 1
    fi
done

echo "✅ All tasks in sprint completed locally."

# Update manifest status to completed using sed
sed -i 's/"status": "active"/"status": "completed"/' "$MANIFEST"

# Notify via Telegram - try multiple python commands
if [ -f ".bigred/notify.py" ]; then
    if command -v python3 >/dev/null 2>&1; then
        python3 .bigred/notify.py "Ready for UAT: Sprint $(basename "$SPRINT_DIR")"
    elif command -v py >/dev/null 2>&1; then
        py .bigred/notify.py "Ready for UAT: Sprint $(basename "$SPRINT_DIR")"
    elif command -v python >/dev/null 2>&1; then
        python .bigred/notify.py "Ready for UAT: Sprint $(basename "$SPRINT_DIR")"
    fi
fi

echo "🏁 bigred Sprint finished. Run 'npm run bigred:approve' to push changes."
