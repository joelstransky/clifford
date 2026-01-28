import { execSync } from 'child_process';
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
    getInvokeArgs: (prompt: string, model?: string) => {
      const args = ['run', '--agent', 'developer'];
      if (model) {
        args.push('--model', model);
      }
      args.push(prompt);
      return args;
    },
    configPaths: ['.config/opencode', '.claude/skills'],
  },
];

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
      try {
        // command -v works on Unix, where -v is the standard way to check for command existence
        // On Windows, we might need 'where' but for now we follow the task's lead.
        // The task says "Keep the fallback logic to check if the command itself is executable"
        const checkCmd = process.platform === 'win32' ? `where ${config.command}` : `command -v ${config.command}`;
        execSync(checkCmd, { stdio: 'ignore' });
        isInstalled = true;
      } catch {
        // Command does not exist
      }
    }

    if (isInstalled) {
      // Try to get version
      try {
        version = execSync(`${config.command} --version`, {
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
