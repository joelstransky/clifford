import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadProjectConfig, loadGlobalConfig, resolveModel, type CliffordConfig } from './config';
import type { SprintManifest } from './sprint';

describe('config', () => {
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readFileSyncSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    existsSyncSpy = spyOn(fs, 'existsSync');
    readFileSyncSpy = spyOn(fs, 'readFileSync');
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('loadProjectConfig', () => {
    it('should return empty object if clifford.json does not exist', () => {
      existsSyncSpy.mockReturnValue(false);
      const config = loadProjectConfig();
      expect(config).toEqual({});
    });

    it('should load and parse clifford.json if it exists', () => {
      existsSyncSpy.mockImplementation((p: string) => (p as string).endsWith('clifford.json'));
      readFileSyncSpy.mockImplementation((p: string) => {
        if ((p as string).endsWith('clifford.json')) {
          return JSON.stringify({ model: 'gpt-4o' });
        }
        return '';
      });

      const config = loadProjectConfig();
      expect(config).toEqual({ model: 'gpt-4o' });
    });

    it('should handle malformed JSON gracefully', () => {
      existsSyncSpy.mockImplementation((p: string) => (p as string).endsWith('clifford.json'));
      readFileSyncSpy.mockImplementation((p: string) => {
        if ((p as string).endsWith('clifford.json')) {
          return 'invalid json';
        }
        return '';
      });

      const config = loadProjectConfig();
      expect(config).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('loadGlobalConfig', () => {
    it('should return empty object if .cliffordrc.json does not exist', () => {
      existsSyncSpy.mockReturnValue(false);
      const config = loadGlobalConfig();
      expect(config).toEqual({});
    });

    it('should load and parse .cliffordrc.json if it exists', () => {
      const homeDir = os.homedir();
      const globalPath = path.join(homeDir, '.cliffordrc.json');

      existsSyncSpy.mockImplementation((p: string) => p === globalPath);
      readFileSyncSpy.mockImplementation((p: string) => {
        if (p === globalPath) {
          return JSON.stringify({ agentName: 'Clifford-Global' });
        }
        return '';
      });

      const config = loadGlobalConfig();
      expect(config).toEqual({ agentName: 'Clifford-Global' });
    });

    it('should handle malformed JSON in global config gracefully', () => {
      const homeDir = os.homedir();
      const globalPath = path.join(homeDir, '.cliffordrc.json');

      existsSyncSpy.mockImplementation((p: string) => p === globalPath);
      readFileSyncSpy.mockImplementation((p: string) => {
        if (p === globalPath) {
          return 'invalid json';
        }
        return '';
      });

      const config = loadGlobalConfig();
      expect(config).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('resolveModel', () => {
    it('should prioritize manifest model', () => {
      const manifest = { model: 'manifest-model' } as unknown as SprintManifest;
      const project: CliffordConfig = { model: 'project-model' };
      const global: CliffordConfig = { model: 'global-model' };
      expect(resolveModel(manifest, project, global)).toBe('manifest-model');
    });

    it('should fall back to project model', () => {
      const manifest = {} as unknown as SprintManifest;
      const project: CliffordConfig = { model: 'project-model' };
      const global: CliffordConfig = { model: 'global-model' };
      expect(resolveModel(manifest, project, global)).toBe('project-model');
    });

    it('should fall back to global model', () => {
      const manifest = {} as unknown as SprintManifest;
      const project: CliffordConfig = {};
      const global: CliffordConfig = { model: 'global-model' };
      expect(resolveModel(manifest, project, global)).toBe('global-model');
    });

    it('should return undefined if no model is defined anywhere', () => {
      const manifest = {} as unknown as SprintManifest;
      const project: CliffordConfig = {};
      const global: CliffordConfig = {};
      expect(resolveModel(manifest, project, global)).toBeUndefined();
    });
  });
});
