import fs from 'fs';
import path from 'path';

// ─── File-Based IPC Types ──────────────────────────────────────────────────────

export interface McpBlockFile {
  type: 'block';
  task: string;
  reason: string;
  question: string;
  timestamp: string;
}

export interface McpResponseFile {
  response: string;
  timestamp: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_FILENAME = 'mcp-block.json';
const RESPONSE_FILENAME = 'mcp-response.json';
const POLL_INTERVAL_MS = 500;

// ─── Path Helpers ──────────────────────────────────────────────────────────────

/** Resolve the `.clifford/` directory from a project root. */
function resolveCliffordDir(projectRoot: string): string {
  return path.join(projectRoot, '.clifford');
}

function blockFilePath(projectRoot: string): string {
  return path.join(resolveCliffordDir(projectRoot), BLOCK_FILENAME);
}

function responseFilePath(projectRoot: string): string {
  return path.join(resolveCliffordDir(projectRoot), RESPONSE_FILENAME);
}

// ─── Write Helpers (MCP Server Side) ───────────────────────────────────────────

/**
 * Write a block notification file so the SprintRunner/TUI can detect it.
 * Called by the MCP server when `request_help` is invoked.
 */
export function writeBlockFile(projectRoot: string, task: string, reason: string, question: string): void {
  const filePath = blockFilePath(projectRoot);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data: McpBlockFile = {
    type: 'block',
    task,
    reason,
    question,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Poll for a response file written by the TUI/SprintRunner.
 * Returns a Promise that resolves with the human's response string.
 * Cleans up both block and response files once the response is read.
 */
export function pollForResponse(projectRoot: string): Promise<string> {
  const respPath = responseFilePath(projectRoot);
  const blkPath = blockFilePath(projectRoot);

  return new Promise<string>((resolve) => {
    const interval = setInterval(() => {
      try {
        if (fs.existsSync(respPath)) {
          const raw = fs.readFileSync(respPath, 'utf8');
          const data: McpResponseFile = JSON.parse(raw);

          // Always clean up both files
          try { fs.unlinkSync(respPath); } catch { /* ignore */ }
          try { fs.unlinkSync(blkPath); } catch { /* ignore */ }

          clearInterval(interval);
          resolve(data.response);
        }
      } catch {
        // Ignore partial reads / parse errors — retry on next tick
      }
    }, POLL_INTERVAL_MS);
  });
}

// ─── Write Helpers (TUI / SprintRunner Side) ───────────────────────────────────

/**
 * Write a response file that the MCP server will pick up.
 * Called by the TUI when the human submits their answer.
 */
export function writeResponseFile(projectRoot: string, response: string): void {
  const filePath = responseFilePath(projectRoot);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data: McpResponseFile = {
    response,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Read Helpers (SprintRunner Side) ──────────────────────────────────────────

/**
 * Read the current block file, if it exists.
 * Returns `null` if no block is active.
 */
export function readBlockFile(projectRoot: string): McpBlockFile | null {
  const filePath = blockFilePath(projectRoot);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw) as McpBlockFile;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// ─── Cleanup ───────────────────────────────────────────────────────────────────

/**
 * Remove any stale MCP IPC files. Called on process exit or sprint end.
 */
export function cleanupMcpFiles(projectRoot: string): void {
  const blkPath = blockFilePath(projectRoot);
  const respPath = responseFilePath(projectRoot);
  try { if (fs.existsSync(blkPath)) fs.unlinkSync(blkPath); } catch { /* ignore */ }
  try { if (fs.existsSync(respPath)) fs.unlinkSync(respPath); } catch { /* ignore */ }
}
