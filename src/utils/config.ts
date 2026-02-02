import fs from 'fs';
import path from 'path';
import os from 'os';
import { SprintManifest } from './sprint.js';

export interface CliffordConfig {
  model?: string;
  agentName?: string;
  aiTool?: string;
  // future-proofing for more settings
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
