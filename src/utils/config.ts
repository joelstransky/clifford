import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { SprintManifest } from './sprint.js';

export interface AfkAdapterConfig {
  provider: string;
  enabled: boolean;
  token?: string;
  chatId?: string;
  [key: string]: unknown;
}

export interface CliffordConfig {
  model?: string;
  agentName?: string;
  aiTool?: string;
  changelog?: boolean;
  afk?: AfkAdapterConfig[];
}

/**
 * Detects the available Python command (python3 or python).
 */
export function getPythonCommand(): string {
  try {
    const check3 = spawnSync('python3', ['--version']);
    if (check3.status === 0) return 'python3';
  } catch { /* ignore */ }

  try {
    const check = spawnSync('python', ['--version']);
    if (check.status === 0) return 'python';
  } catch { /* ignore */ }

  return 'python3'; // Fallback
}

/**
 * Loads project-specific configuration from clifford.json in the CWD.
 */
export function loadProjectConfig(): CliffordConfig {
  const configPath = path.join(process.cwd(), 'clifford.json');
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch {
      console.warn('🚀 Warning: Failed to parse clifford.json. Using defaults.');
      return {};
    }
  }
  return {};
}

/**
 * Loads global configuration from ~/.cliffordrc.json.
 */
export function loadGlobalConfig(): CliffordConfig {
  const configPath = path.join(os.homedir(), '.cliffordrc.json');
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch {
      console.warn('🚀 Warning: Failed to parse ~/.cliffordrc.json. Using defaults.');
      return {};
    }
  }
  return {};
}

/**
 * Resolves the effective model based on the hierarchy: Manifest > Project > Global.
 */
export function resolveModel(
  manifest: SprintManifest,
  projectConfig: CliffordConfig,
  globalConfig: CliffordConfig
): string | undefined {
  return manifest.model || projectConfig.model || globalConfig.model;
}

/**
 * Returns a list of AFK adapters that are enabled and have a token.
 */
export function getEnabledAfkAdapters(config: CliffordConfig): AfkAdapterConfig[] {
  return (config.afk || []).filter(adapter => adapter.enabled && adapter.token);
}
