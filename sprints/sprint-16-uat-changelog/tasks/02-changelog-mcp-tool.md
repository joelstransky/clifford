# Task 2: Changelog MCP Tool

## Title
Add a `update_changelog` MCP tool that appends to the project's CHANGELOG.md at sprint completion

## Context
At the end of each sprint, the agent should update the project's `CHANGELOG.md` with a summary of what was accomplished. This mirrors bigred's behavior. The tool should only be called if the project is configured to use changelog updates (stored in `clifford.json`).

## Step-by-Step

### 1. Add `changelog` config flag to `CliffordConfig`

In `src/utils/config.ts`, add the field:

```typescript
export interface CliffordConfig {
  model?: string;
  agentName?: string;
  aiTool?: string;
  changelog?: boolean;
}
```

### 2. Add changelog prompt to `clifford init`

In `src/index.ts`, add a new question to the interactive prompts:

```typescript
{
  type: 'confirm',
  name: 'changelog',
  message: 'Auto-update CHANGELOG.md at the end of each sprint?',
  default: true,
}
```

Also add it to the YOLO defaults:
```typescript
answers = {
  model: 'opencode/kimi-k2.5-free',
  workflow: 'yolo',
  aiTool: 'opencode',
  changelog: true,
  extraGates: []
};
```

Write the value to `clifford.json`:
```typescript
const cliffordConfig = {
  model: answers.model,
  aiTool: 'opencode',
  changelog: answers.changelog,
};
```

### 3. Implement the `updateChangelog()` handler function

Create as a standalone exported function in `mcp-server.ts`:

```typescript
export function updateChangelog(
  sprintId: string,
  sprintName: string,
  entries: string[],
): { content: Array<{ type: 'text'; text: string }> } {
  // Check clifford.json config
  const configPath = path.resolve(process.cwd(), 'clifford.json');
  let changelogEnabled = true;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    if (config.changelog === false) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, skipped: true, reason: 'Changelog updates disabled in clifford.json' }),
        }],
      };
    }
  } catch { /* default to enabled if config missing */ }

  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const entriesMarkdown = entries.map(e => `- ${e}`).join('\n');

  const section = `\n## [${sprintId}] ${sprintName} — ${date}\n\n${entriesMarkdown}\n`;

  if (fs.existsSync(changelogPath)) {
    // Read existing, insert new section after the first heading (or at top)
    const existing = fs.readFileSync(changelogPath, 'utf8');
    // Find the first ## heading and insert before it, or append if none
    const firstHeadingIndex = existing.indexOf('\n## ');
    if (firstHeadingIndex > -1) {
      const updated = existing.slice(0, firstHeadingIndex) + section + existing.slice(firstHeadingIndex);
      fs.writeFileSync(changelogPath, updated, 'utf8');
    } else {
      fs.appendFileSync(changelogPath, section, 'utf8');
    }
  } else {
    // Create new CHANGELOG.md
    const header = `# Changelog\n`;
    fs.writeFileSync(changelogPath, header + section, 'utf8');
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ success: true, path: changelogPath }),
    }],
  };
}
```

### 4. Register the `update_changelog` MCP tool

In `registerTools()`:

```typescript
this.mcpServer.registerTool(
  'update_changelog',
  {
    description:
      'Append a summary of the completed sprint to the project CHANGELOG.md. ' +
      'Call this after complete_sprint. Respects the changelog setting in clifford.json. ' +
      'Only include entries for features added, features removed, or breaking changes.',
    inputSchema: {
      sprintId: z.string().describe('The sprint ID (e.g. "sprint-16")'),
      sprintName: z.string().describe('The sprint name'),
      entries: z.array(z.string()).describe('List of changelog entries. Only include entries for features added, features removed, or breaking changes.'),
    },
  },
  async ({ sprintId, sprintName, entries }: {
    sprintId: string;
    sprintName: string;
    entries: string[];
  }) => {
    return updateChangelog(sprintId, sprintName, entries);
  }
);
```

### 5. Update the Developer agent persona

In `templates/.opencode/agent/Developer.md` and `.opencode/agent/Developer.md`:
- Add `update_changelog` to the MCP tools list.
- Document when to call it: after `complete_sprint`, as the final action of the last task.
- Note that it respects `clifford.json` config — if changelog is disabled, the tool returns a skip response.

### 6. Add tests

In `mcp-server.test.ts`:
- Creates `CHANGELOG.md` when it doesn't exist.
- Appends new section before existing entries (newest first).
- Respects `changelog: false` in config (returns skipped).
- Defaults to enabled when config is missing.
- Date format is correct (YYYY-MM-DD).
- Entries are formatted as bullet points.

### 7. Update config tests

In `config.test.ts`, add a test verifying that `changelog` field is parsed from `clifford.json`.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes with new tests.
3. Run `clifford init` (non-yolo) — verify the changelog prompt appears.
4. Check `clifford.json` — verify `changelog` field is present.
5. Manually verify: calling the handler creates/updates `CHANGELOG.md` with correct format.
6. Verify: with `changelog: false`, the tool skips without error.
