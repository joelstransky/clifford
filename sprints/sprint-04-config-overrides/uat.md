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

## [Task-02] Support model overrides in sprint manifests
- **Status**: ✅ Completed
- **Walkthrough**:
  1. Open `src/utils/sprint.ts` and verify the `SprintManifest` interface now includes an optional `model` field.
  2. Modify any `manifest.json` (e.g., `sprints/sprint-04-config-overrides/manifest.json`) to include a `"model": "any-string"` field.
  3. Run `bun test-discovery.ts` and verify that the output shows the `model` field being correctly parsed into the sprint objects.
  4. Ensure no TypeScript errors occur during build: `npm run build`.
- **Human Sign-off**: [ ]

## [Task-03] Global Config vs. Local Config
- **Status**: ✅ Completed
- **Walkthrough**:
  1. Verify `resolveModel` logic in `src/utils/config.ts` handles the Manifest > Project > Global priority.
  2. Verify that `SprintRunner.run()` in `src/utils/sprint.ts` now uses `loadProjectConfig()`, `loadGlobalConfig()`, and `resolveModel()`.
  3. Create a global config at `~/.cliffordrc.json` with a specific model.
  4. Create a project config at `clifford.json` with a different model.
  5. Run a sprint and verify (via logs) that it uses the project model.
  6. Add a model override to the sprint's `manifest.json` and verify it takes precedence.
- **Human Sign-off**: [ ]

## [Task-04] `clifford init` Command
- **Status**: ✅ Completed
- **Walkthrough**:
  1. Build the project: `npm run build`.
  2. Create a temporary directory and change into it.
  3. Run the init command: `node [path-to-clifford]/dist/index.js init`.
  4. Follow the prompts:
     - When asked for "Preferred Default Model", enter a model name (e.g., `gpt-4o`).
     - Complete the other prompts (Workflow, AI Tool, Gates).
  5. Verify that `clifford.json` is created in the current directory with the model you entered.
  6. Run `node [path-to-clifford]/dist/index.js init` again in the same directory.
  7. Verify it asks if you want to overwrite `clifford.json`.
  8. Choose "No" and verify it aborts without changing the file.
- **Human Sign-off**: [ ]

---
**Final Sprint Approval**: [ ]
