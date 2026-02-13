# Task 1: UAT Markdown MCP Tool

## Title
Replace `report_uat` JSON behavior with a tool that appends to the sprint's `uat.md`

## Context
Currently `report_uat` writes structured JSON to `.clifford/uat.json`. The actual useful artifact is the sprint's `uat.md` file — a human-readable markdown document with step-by-step verification instructions per task. The agent should write directly to that file via MCP, matching the format that bigred produces (see any existing `uat.md` in `sprints/` for reference).

The last step of every task should be updating that sprint's `uat.md` with what changed and how to verify it.

## Step-by-Step

### 1. Study the existing `uat.md` format

Look at `sprints/sprint-15-publish-polish/uat.md` or `sprints/sprint-13-mcp-api-expansion/uat.md` for the target format:

```markdown
# Sprint N — Sprint Name — UAT

## Task X: Task Title

### Changes
- Brief description of what changed in each file.

### Verification Steps
1. Step one a human can follow.
2. Step two.
3. ...
```

### 2. Redesign the `report_uat` MCP tool

The tool should:
- Accept `sprintDir`, `taskId`, `title`, `changes` (string — markdown description of what changed), and `verificationSteps` (array of strings).
- Resolve the `uat.md` path inside the sprint directory: `<sprintDir>/uat.md`.
- If the file doesn't exist, create it with a header: `# Sprint <id> — <name> — UAT\n\n`.
- Append a new section for the task in the established format.
- Read the manifest to get the sprint name for the header.

New input schema:
```typescript
{
  sprintDir: z.string().describe('The sprint directory'),
  taskId: z.string().describe('The task ID (e.g. "task-1")'),
  title: z.string().describe('Task title for the section header'),
  changes: z.string().describe('Markdown description of what was changed'),
  verificationSteps: z.array(z.string()).describe('Step-by-step verification instructions'),
}
```

### 3. Implement the handler function

Create `reportUatMarkdown()` as a standalone exported function (for testability):

```typescript
export function reportUatMarkdown(
  sprintDir: string,
  taskId: string,
  title: string,
  changes: string,
  verificationSteps: string[],
): { content: Array<{ type: 'text'; text: string }> } {
  const resolvedDir = path.resolve(process.cwd(), sprintDir);
  const uatPath = path.join(resolvedDir, 'uat.md');
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  // Read manifest for sprint name (best-effort)
  let sprintName = 'Unknown Sprint';
  let sprintId = 'sprint-??';
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    sprintName = manifest.name || sprintName;
    sprintId = manifest.id || sprintId;
  } catch { /* use defaults */ }

  // Build the section
  const stepsMarkdown = verificationSteps
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n');

  const section = `\n## ${taskId}: ${title}\n\n### Changes\n${changes}\n\n### Verification Steps\n${stepsMarkdown}\n`;

  // Create or append
  if (!fs.existsSync(uatPath)) {
    const header = `# ${sprintId} — ${sprintName} — UAT\n`;
    fs.writeFileSync(uatPath, header + section, 'utf8');
  } else {
    fs.appendFileSync(uatPath, section, 'utf8');
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, taskId, path: uatPath }) }] };
}
```

### 4. Replace the existing `report_uat` tool registration

In `registerTools()`, replace the current `report_uat` registration with the new schema and handler. Keep the tool name `report_uat` — no need to rename it.

### 5. Remove the old `reportUat()` function and `UatEntry` interface

Delete the old function that writes to `.clifford/uat.json`. Delete the `UatEntry` interface if it's no longer used.

### 6. Remove `.clifford/uat.json` references

- Remove `uat.json` from the `.gitignore` entries in `scaffolder.ts`.
- Check if anything reads `.clifford/uat.json` and remove those references.

### 7. Update the Developer agent persona

In `templates/.opencode/agent/Developer.md`, update the `report_uat` documentation to reflect the new input schema (sprintDir, taskId, title, changes, verificationSteps). Make it clear that this is the last step of every task — write to the sprint's `uat.md`.

Also update `.opencode/agent/Developer.md` (Clifford's own).

### 8. Update tests

Replace the existing `report_uat` tests in `mcp-server.test.ts` with tests for `reportUatMarkdown()`:
- Creates `uat.md` with header when file doesn't exist.
- Appends section when file already exists.
- Section format matches expected markdown structure.
- Reads sprint name from manifest for the header.
- Handles missing manifest gracefully (uses defaults).
- Steps are numbered correctly.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes with updated tests.
3. Review the registered `report_uat` tool — it should accept `sprintDir`, `taskId`, `title`, `changes`, `verificationSteps`.
4. Manually verify: calling the handler creates a well-formatted `uat.md` in the sprint directory.
