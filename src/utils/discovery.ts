import * as child_process from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

export interface AIEngine {
  id: string;
  name: string;
  command: string;
  isInstalled: boolean;
  version?: string;
  getInvokeArgs: (prompt: string, model?: string) => string[];
}

interface EngineConfig extends Omit<AIEngine, 'isInstalled' | 'version'> {
  configPaths: string[];
}

const ENGINE_CONFIGS: EngineConfig[] = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    getInvokeArgs: (prompt: string) => [prompt],
    configPaths: ['.codex'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    getInvokeArgs: (prompt: string) => [prompt],
    configPaths: ['.gemini'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    getInvokeArgs: (prompt: string) => [prompt],
    configPaths: ['.claude'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    getInvokeArgs: (prompt: string) => ['run', prompt],
    configPaths: ['.config/opencode', '.opencode'],
  },
];

/**
 * Checks if a command is available in the system PATH.
 */
export function isCommandAvailable(command: string): boolean {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
    child_process.execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Discovers available AI CLI engines on the system.
 */
export function discoverTools(): AIEngine[] {
  const homeDir = os.homedir();

  return ENGINE_CONFIGS.map((config) => {
    let isInstalled = false;
    let version: string | undefined;

    // 1. Check filesystem for config directories (prioritized for reliability)
    for (const relPath of config.configPaths) {
      const fullPath = path.join(homeDir, relPath);
      if (fs.existsSync(fullPath)) {
        isInstalled = true;
        break;
      }
    }

    // 2. Fallback: Check if command exists in PATH
    if (!isInstalled) {
      isInstalled = isCommandAvailable(config.command);
    }

    if (isInstalled) {
      // Try to get version
      try {
        version = child_process.execSync(`${config.command} --version`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 2000,
        }).trim();
      } catch {
        // Version check failed or timed out, but tool is considered installed
      }
    }

    return {
      id: config.id,
      name: config.name,
      command: config.command,
      getInvokeArgs: config.getInvokeArgs,
      isInstalled,
      version,
    };
  });
}

/**
 * Gets the preferred engine from the list of discovered tools.
 * For now, it just picks the first installed one.
 */
export function getPreferredEngine(engines: AIEngine[]): AIEngine | undefined {
  return engines.find((e) => e.isInstalled);
}
