# Task 7: Clean Process Output for TUI Rendering

## Title
Minimally sanitize process output so it renders cleanly in the OpenTUI pane

## Context
OpenCode emits styled output with ANSI escape codes (colored backgrounds, bold, etc.) and special Unicode characters (emoji glyphs embedded in tool call names like `cl🔧ford_update_task_status`). When rendered in the OpenTUI process output pane, this produces garbled formatting — colored blocks, weird glyphs mid-word, and broken layout.

The goal is **minimal intervention** — only strip what actually breaks rendering in OpenTUI. We're not trying to produce perfectly clean plain text, just enough to pipe the output cleanly to our console.

## Step-by-Step

### 1. Investigate what's actually breaking

Before writing any stripping code, load the OpenTUI skill and check whether OpenTUI's `TextRenderable` supports ANSI escape codes natively. If it does, the problem may only be specific sequences (like OSC hyperlinks or 24-bit color) that OpenTUI doesn't handle.

Check the screenshot context: the visible issues are:
- Colored background blocks behind tool call text (SGR background color sequences)
- Emoji/glyph characters embedded in tool names (Unicode, not ANSI)

### 2. Add a minimal sanitizer to `src/utils/text.ts`

Only strip what's needed. Start with ANSI SGR sequences (the `\x1b[...m` pattern that controls colors/bold/background) since those are what's causing the colored blocks:

```typescript
/**
 * Strip ANSI SGR (Select Graphic Rendition) sequences from a string.
 * These control text color, background, bold, etc. and cause rendering
 * issues when piped into OpenTUI's text renderables.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
```

This is deliberately minimal — it only targets SGR sequences (`\x1b[...m`). If other escape sequences cause problems later, expand the regex then.

If testing reveals that the emoji glyphs in tool names are also a problem (they may render fine — they're just Unicode), leave them alone unless they break layout.

### 3. Apply in the output handler in `DashboardController.ts`

```typescript
import { stripAnsi } from '../utils/text.js';

// In the output handler:
this.addLog(stripAnsi(line), streamType, 'process');
```

### 4. Add a few tests in `text.test.ts`

Keep tests minimal and focused on what we're actually stripping:
- Plain text passes through unchanged.
- SGR color codes removed: `\x1b[31mred\x1b[0m` → `red`.
- SGR background codes removed: `\x1b[41mhighlighted\x1b[0m` → `highlighted`.
- Multiple SGR sequences in one string.
- Empty string returns empty.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Run a sprint and observe process output. The colored background blocks should be gone. Text content should be readable.
