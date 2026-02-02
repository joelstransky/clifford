# Sprint 4 UAT: Configuration & Overrides

## 📋 UAT Instructions

### 1. `clifford init` Configuration
- Run `clifford init` in a clean directory.
- **Expected**: `clifford.json` is created with your selected model.

### 2. Project-Level Config
- Set a specific model in `clifford.json` (e.g., `"model": "gpt-4o"`).
- Run a sprint.
- **Expected**: The runner logs that it is using the model from `clifford.json`.

### 3. Manifest Override
- In a specific sprint's `manifest.json`, add `"model": "claude-3-opus"`.
- Run that sprint.
- **Expected**: The runner uses the manifest model, overriding the project-level `clifford.json`.

---

## [Task-01] Configuration Schema & Loader
- **Status**: ✅ Completed
- **Walkthrough**:
  1. Inspect `src/utils/config.ts` to see the `CliffordConfig` interface and loading functions.
  2. Run `npm test src/utils/config.test.ts` to verify the configuration loader handles missing files and malformed JSON correctly.
  3. Create a dummy `clifford.json` in the root: `echo '{"model": "test-model"}' > clifford.json`.
  4. (Optional) In a node REPL or a temp script, call `loadProjectConfig()` and verify it returns `{ model: "test-model" }`.
- **Human Sign-off**: [ ]

## [Task-02] Integrating Model Selection
- **Status**: ⏳ Pending
- **Human Sign-off**: [ ]

## [Task-03] Global Config vs. Local Config
- **Status**: ⏳ Pending
- **Human Sign-off**: [ ]

## [Task-04] `clifford init` Command
- **Status**: ⏳ Pending
- **Human Sign-off**: [ ]

---
**Final Sprint Approval**: [ ]
