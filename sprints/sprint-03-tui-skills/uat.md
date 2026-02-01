# Sprint 3 UAT: TUI Dashboard & Skill Registry

## 📋 UAT Instructions

### 1. Dashboard Launch
- Run `npx clifford tui`.
- **Expected**: A clean OpenTUI-based dashboard opens.
- Verify that all existing sprints are listed with their correct status colors.

### 2. Navigation & Selection
- Use arrow keys/menu to select a sprint.
- **Expected**: Navigation is fluid and selection highlights the chosen sprint.

### 3. OpenTUI Verification
- Ensure the TUI is indeed powered by the OpenTUI framework.
- Verify the split-screen layout: Manifest on the left, Runner Logs/Blocker Intervention on the right.

### 4. Pre-flight Skill Check
- Select a sprint that has a task with a `## Required Skills` section.
- Choose "Start Sprint".
- **Expected**: The TUI transitions to an "Analyzing Requirements" view.
- Verify it lists any missing skills and provides an "Install" option.

---

## [Task-01] Core TUI Layout
- **Status**: ✅ Completed
- **Human Sign-off**: [ ]

## [Task-02] Integrated Blocker Handling
- **Status**: ✅ Completed
- **Human Sign-off**: [ ]

## [Task-03] Discovery Utility
- **Status**: ✅ Completed
- **Human Sign-off**: [ ]

## [Task-04] Skill Analysis Engine
- **Status**: ✅ Completed
- **Human Sign-off**: [ ]

## [Task-05] CLI Integration
- **Status**: ✅ Completed
- **Human Sign-off**: [ ]

## [Task-06] OpenTUI Verification
- **Status**: ✅ Completed
- **Verification Steps**:
    1. Run `npm run build` to ensure the project compiles with the new OpenTUI dashboard.
    2. Run `clifford tui` (or `node dist/index.js tui`) to verify the dashboard launches.
    3. Confirm that `src/tui/Dashboard.tsx` (the Ink version) has been removed and replaced by `src/tui/Dashboard.ts` (the OpenTUI version).
    4. Confirm that `ink`, `react`, and `ink-select-input` have been removed from `package.json`.
- **Human Sign-off**: [ ]

---
**Final Sprint Approval**: [ ]
