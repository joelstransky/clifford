# Task 3: `clifford.json` Configuration Injection

## Title
Inject AFK configuration into the project's `clifford.json`

## Context
The `npx clifford afk` command should persist its settings in the existing `clifford.json` file. The feature is opt-in, so the `afk` block should only be added when the command is run.

## Step-by-Step

### 1. Update `CliffordConfig` Interface
In `src/utils/config.ts`, add the `afk` array type.
```typescript
export interface AfkAdapterConfig {
  provider: string;
  enabled: boolean;
  token?: string;
  chatId?: string;
  [key: string]: any;
}

export interface CliffordConfig {
  // ... existing
  afk?: AfkAdapterConfig[];
}
```

### 2. Implement Injection Logic
- Read `clifford.json`.
- If `afk` block doesn't exist, create it as an empty array.
- Find the `telegram` entry or create a new one.
- Update the values based on the interview from Task 1.
- Write the updated JSON back to disk, preserving existing settings.

### 3. Key/Enabled Validation
Ensure the code that reads this config checks both `enabled === true` AND the presence of a `token` before attempting to use an adapter.

## Verification
1. Run `npx clifford afk` and provide data.
2. Verify `clifford.json` contains the `afk` block with correct values.
3. Verify existing settings in `clifford.json` (like `model` or `aiTool`) are preserved.
