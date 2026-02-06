import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as childProcess from 'child_process';
import fs from 'fs';
import { discoverTools } from './discovery';

describe('discovery', () => {
  let execSyncSpy: ReturnType<typeof spyOn>;
  let existsSyncSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    execSyncSpy = spyOn(childProcess, 'execSync');
    existsSyncSpy = spyOn(fs, 'existsSync');
    existsSyncSpy.mockReturnValue(false);
  });

  afterEach(() => {
    execSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
  });

  it('should discover installed tools and handle missing ones', () => {
    execSyncSpy.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && (cmd.startsWith('command -v') || cmd.startsWith('where'))) {
        const tool = cmd.split(' ')[2] || cmd.split(' ')[1];
        if (tool === 'opencode' || tool === 'claude') {
          return 'path/to/tool';
        }
        throw new Error('Command not found');
      }
      if (typeof cmd === 'string' && cmd.endsWith('--version')) {
        const tool = cmd.split(' ')[0];
        if (tool === 'opencode') return '1.1.0';
        if (tool === 'claude') return '2.0.0';
        return '';
      }
      return '';
    });

    const tools = discoverTools();
    
    const opencode = tools.find((t) => t.id === 'opencode');
    const claude = tools.find((t) => t.id === 'claude');
    const gemini = tools.find((t) => t.id === 'gemini');
    const codex = tools.find((t) => t.id === 'codex');

    expect(opencode?.isInstalled).toBe(true);
    expect(opencode?.version).toBe('1.1.0');
    
    expect(claude?.isInstalled).toBe(true);
    expect(claude?.version).toBe('2.0.0');
    
    expect(gemini?.isInstalled).toBe(false);
    expect(codex?.isInstalled).toBe(false);

    // Test getInvokeArgs
    const opencodeArgs = opencode?.getInvokeArgs('test prompt', 'test-model');
    expect(opencodeArgs).toEqual(['run', 'test prompt']);

    const opencodeArgsNoModel = opencode?.getInvokeArgs('test prompt');
    expect(opencodeArgsNoModel).toEqual(['run', 'test prompt']);
  });

  it('should handle version check failures gracefully', () => {
    execSyncSpy.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.startsWith('command -v')) {
        return Buffer.from('/usr/bin/opencode');
      }
      if (typeof cmd === 'string' && cmd.endsWith('--version')) {
        throw new Error('Version check failed');
      }
      return Buffer.from('');
    });

    const tools = discoverTools();
    const opencode = tools.find((t) => t.id === 'opencode');

    expect(opencode?.isInstalled).toBe(true);
    expect(opencode?.version).toBeUndefined();
  });
});
