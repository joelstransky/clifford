# Task 5: Raw Process Output

## Title
Remove prefix and truncation from process output — pass lines through unmodified

## Context
The process output pane currently modifies agent stdout/stderr by prepending `> ` and truncating to 120 characters. This obscures the actual output. We should pass it through as-is.

## Step-by-Step

### 1. Update the output handler in `DashboardController.ts`

In the `runner.on('output', ...)` handler (around line 212), the current code is:

```typescript
this.runner.on('output', (data: { data: string; stream: string }) => {
  const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
  const streamType: LogEntry['type'] = data.stream === 'stderr' ? 'error' : 'info';
  lines.forEach(line => {
    this.addLog(`> ${line.substring(0, 120)}`, streamType, 'process');
  });
});
```

Change to:

```typescript
this.runner.on('output', (data: { data: string; stream: string }) => {
  const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
  const streamType: LogEntry['type'] = data.stream === 'stderr' ? 'error' : 'info';
  lines.forEach(line => {
    this.addLog(line, streamType, 'process');
  });
});
```

Remove the `> ` prefix and the `.substring(0, 120)` truncation.

### 2. Update tests in `DashboardController.test.ts`

Find tests that assert on process log message content. They likely check for the `> ` prefix:

```typescript
expect(ctrl.processLogs[0].message).toContain('Process output line');
```

If any test asserts `> Process output line`, update it to assert `Process output line` without the prefix.

Search for `.toContain('> ')` or similar patterns in the test file.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes — update any tests that expected the `> ` prefix.
3. Launch TUI, start a sprint, and observe the process output pane. Lines should appear exactly as the agent outputs them — no `> ` prefix, no truncation.
