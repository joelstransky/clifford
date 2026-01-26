import { execSync } from 'child_process';

export interface AIEngine {
  id: string;
  name: string;
  command: string;
  isInstalled: boolean;
  version?: string;
  getInvokeArgs: (prompt: string) => string[];
}

const ENGINE_CONFIGS: Omit<AIEngine, 'isInstalled' | 'version'>[] = [
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    getInvokeArgs: (prompt: string) => [prompt],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    getInvokeArgs: (prompt: string) => [prompt],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    getInvokeArgs: (prompt: string) => [prompt],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    getInvokeArgs: (prompt: string) => ['run', '--agent', 'developer', prompt],
  },
];

/**
 * Discovers available AI CLI engines on the system.
 */
export function discoverTools(): AIEngine[] {
  return ENGINE_CONFIGS.map((config) => {
    let isInstalled = false;
    let version: string | undefined;

    try {
      // Check if command exists
      execSync(`command -v ${config.command}`, { stdio: 'ignore' });
      isInstalled = true;

      // Try to get version
      try {
        version = execSync(`${config.command} --version`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 2000,
        }).trim();
      } catch {
        // Version check failed or timed out, but command exists
      }
    } catch {
      // Command does not exist
    }

    return {
      ...config,
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
