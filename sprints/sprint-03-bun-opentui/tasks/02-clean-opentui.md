# Task 02: Clean OpenTUI Integration

## Title
Remove all Node.js polyfills and workarounds for OpenTUI.

## Context
The current codebase contains extensive fake `Bun.ffi` stubs and fallback rendering paths that were necessary to run on Node.js. With Bun as the runtime, these are no longer needed and should be removed entirely. The code should be written as if Bun was always the intended runtime.

## Step-by-Step

1. **Remove the Bun polyfill block** from `src/index.ts`:
   - Delete the entire `if (typeof (globalThis as any).Bun === 'undefined')` block (approximately lines 12-32)
   - This includes the fake `Bun.ffi`, `Bun.stringWidth`, `JSCallback`, etc.

2. **Remove `IS_NODE_FALLBACK` references** throughout the codebase:
   - Search for `IS_NODE_FALLBACK` and remove all conditional logic based on it

3. **Clean up `src/tui/Dashboard.ts`**:
   - Remove the fallback CLI monitoring mode (the `console.log` based rendering)
   - Remove the `isNodeFallback` check and its associated branch
   - The dashboard should now assume OpenTUI always works

4. **Remove the loader-based respawn logic** from the `tui` command in `src/index.ts`:
   - Delete the `CLIFFORD_TUI_LOADED` environment variable check
   - Delete the `spawn` call that re-invokes with `--loader`
   - The `tui` command should directly call `launchDashboard()`

5. **Remove optional dependencies** from `package.json`:
   - Remove the `optionalDependencies` section with `@opentui/core-win32-x64`
   - OpenTUI will resolve its native bindings automatically under Bun

6. **Clean up imports** in `src/index.ts`:
   - Remove unused imports (`spawn`, `fileURLToPath`, `pathToFileURL` if no longer needed)

## Verification
- Run `bun run dev tui` and confirm OpenTUI initializes without errors.
- Grep for `IS_NODE_FALLBACK` - should return no results.
- Grep for `globalThis.Bun` - should return no results.
- The codebase should have no references to Node.js-specific workarounds.
