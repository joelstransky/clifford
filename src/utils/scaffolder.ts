import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Path resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the Clifford package root directory.
 *
 * In dev mode `__dirname` is `src/utils/`, so root is `../../`.
 * In dist mode (bundled) `__dirname` is `dist/`, so root is `../`.
 * Falls back to `process.cwd()` when neither contains `templates/`.
 */
async function resolveCliffordRoot(): Promise<string> {
  // Dev: src/utils -> ../../
  const devRoot = path.resolve(__dirname, '../..');
  if (await fs.pathExists(path.join(devRoot, 'templates'))) {
    return devRoot;
  }

  // Dist: dist/ -> ../
  const distRoot = path.resolve(__dirname, '..');
  if (await fs.pathExists(path.join(distRoot, 'templates'))) {
    return distRoot;
  }

  // Last resort: CWD
  if (await fs.pathExists(path.join(process.cwd(), 'templates'))) {
    return process.cwd();
  }

  throw new Error(
    `Clifford package root not found. Looked in: ${devRoot}, ${distRoot}, ${process.cwd()}`
  );
}

/**
 * Returns the absolute path to the `templates/` directory.
 */
async function resolveTemplateDir(): Promise<string> {
  const root = await resolveCliffordRoot();
  return path.join(root, 'templates');
}

// ---------------------------------------------------------------------------
// OpenCode config (opencode.json) management
// ---------------------------------------------------------------------------

interface OpenCodeConfig {
  mcp?: Record<string, McpServerEntry>;
  [key: string]: unknown;
}

interface McpServerEntry {
  type: string;
  command: string[];
  environment?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Resolves the MCP entry point path and the command to run it.
 *
 * - Production: `<cliffordRoot>/dist/mcp-entry.js` → `node`
 * - Development: `<cliffordRoot>/src/mcp-entry.ts` → `bun`
 */
async function resolveMcpEntry(cliffordRoot: string): Promise<{ command: string; entryPath: string }> {
  const distEntry = path.join(cliffordRoot, 'dist', 'mcp-entry.js');

  if (await fs.pathExists(distEntry)) {
    return { command: 'node', entryPath: distEntry };
  }

  // Dev mode — use the TypeScript source directly via bun
  const srcEntry = path.join(cliffordRoot, 'src', 'mcp-entry.ts');
  return { command: 'bun', entryPath: srcEntry };
}

/**
  * Ensures `opencode.json` at `projectRoot` contains a `mcp.clifford` entry
  * pointing to the Clifford MCP server entry point.
  *
  * OpenCode uses `"mcp": { "<name>": { "type": "local", "command": [...] } }`
  * (NOT the Claude Desktop `mcpServers` format).
  *
  * - If the file already exists, existing keys are preserved (deep-merge).
  * - If `mcp.clifford` already exists, it is updated in-place.
  */
export async function ensureOpenCodeConfig(projectRoot: string): Promise<void> {
  const cliffordRoot = await resolveCliffordRoot();
  const { command, entryPath } = await resolveMcpEntry(cliffordRoot);

  const configPath = path.join(projectRoot, 'opencode.json');

  let config: OpenCodeConfig = {};

  if (await fs.pathExists(configPath)) {
    try {
      config = (await fs.readJson(configPath)) as OpenCodeConfig;
    } catch {
      // If the file is malformed, start fresh but warn
      console.error('⚠️  Existing opencode.json was not valid JSON — starting fresh.');
    }
  }

  // Deep-merge: preserve other mcp server entries
  if (!config.mcp) {
    config.mcp = {};
  }

  config.mcp['clifford'] = {
    type: 'local',
    command: [command, entryPath],
  };

  await fs.writeJson(configPath, config, { spaces: 2 });
}

// ---------------------------------------------------------------------------
// Agent template scaffolding
// ---------------------------------------------------------------------------

/**
 * Copies `.opencode/agent/` persona templates into the target project.
 *
 * Only copies files that do NOT already exist at the destination — the user
 * may have customised them.
 */
export async function copyAgentTemplates(
  projectRoot: string,
  templateDir: string,
): Promise<void> {
  const agentTemplateSrc = path.join(templateDir, '.opencode', 'agent');

  if (!(await fs.pathExists(agentTemplateSrc))) {
    return; // No agent templates shipped — nothing to do
  }

  const agentDestDir = path.join(projectRoot, '.opencode', 'agent');
  await fs.ensureDir(agentDestDir);

  const files = await fs.readdir(agentTemplateSrc);

  for (const file of files) {
    const destPath = path.join(agentDestDir, file);

    // Only copy if the destination file doesn't already exist
    if (!(await fs.pathExists(destPath))) {
      await fs.copy(path.join(agentTemplateSrc, file), destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Main scaffold function
// ---------------------------------------------------------------------------

/**
 * Scaffolds the Clifford directory structure and files.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function scaffold(targetDir: string, options: {
  workflow: 'yolo' | 'pr';
  aiTool: string;
  extraGates: string[];
}): Promise<void> {
  const templateDir = await resolveTemplateDir();

  await fs.ensureDir(path.join(targetDir, '.clifford'));
  await fs.ensureDir(path.join(targetDir, '.clifford/sprints'));

  // Copy only prompt.md to .clifford
  const promptSrc = path.join(templateDir, '.clifford/prompt.md');
  if (await fs.pathExists(promptSrc)) {
      await fs.copy(promptSrc, path.join(targetDir, '.clifford/prompt.md'));
  }

  // Create initial manifest if it doesn't exist
  const sprintsDir = path.join(targetDir, '.clifford/sprints');
  const entries = await fs.readdir(sprintsDir);
  if (entries.length === 0) {
    const firstSprintDir = path.join(sprintsDir, 'sprint-01');
    await fs.ensureDir(firstSprintDir);
    await fs.ensureDir(path.join(firstSprintDir, 'tasks'));
    const initialManifest = {
      id: 'sprint-01',
      name: 'Initial Sprint',
      status: 'active',
      tasks: []
    };
    await fs.writeJson(path.join(firstSprintDir, 'manifest.json'), initialManifest, { spaces: 2 });
  }

  // Update .gitignore
  const gitignorePath = path.join(targetDir, '.gitignore');
  const gitignoreEntries = [
    '\n# Clifford',
    '.clifford/state.json',
    '.clifford/asm.json',
    '.clifford/uat.json'
  ];

  if (await fs.pathExists(gitignorePath)) {
    let content = await fs.readFile(gitignorePath, 'utf8');
    for (const entry of gitignoreEntries) {
      if (!content.includes(entry.trim())) {
        content += entry + '\n';
      }
    }
    await fs.writeFile(gitignorePath, content);
  } else {
    await fs.writeFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
  }

  // Write opencode.json with Clifford MCP server config
  await ensureOpenCodeConfig(targetDir);

  // Copy .opencode/agent/ persona templates (non-destructive)
  await copyAgentTemplates(targetDir, templateDir);

  // Configuration is now handled by the caller writing to clifford.json in root
  // We no longer write .clifford/config.json
}
