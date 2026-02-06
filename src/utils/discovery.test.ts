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

  it('should return only the OpenCode engine', () => {
    execSyncSpy.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && (cmd.startsWith('command -v') || cmd.startsWith('where'))) {
        const tool = cmd.split(' ')[2] || cmd.split(' ')[1];
        if (tool === 'opencode') {
          return 'path/to/tool';
        }
        throw new Error('Command not found');
      }
      if (typeof cmd === 'string' && cmd.endsWith('--version')) {
        return '1.1.0';
      }
      return '';
    });

    const tools = discoverTools();

    // Only OpenCode should be present
    expect(tools).toHaveLength(1);
    expect(tools[0].id).toBe('opencode');
    expect(tools[0].name).toBe('OpenCode');
    expect(tools[0].isInstalled).toBe(true);
    expect(tools[0].version).toBe('1.1.0');

    // Test getInvokeArgs
    const args = tools[0].getInvokeArgs('test prompt', 'test-model');
    expect(args).toEqual(['run', 'test prompt']);

    const argsNoModel = tools[0].getInvokeArgs('test prompt');
    expect(argsNoModel).toEqual(['run', 'test prompt']);
  });

  it('should report OpenCode as not installed when missing', () => {
    execSyncSpy.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && (cmd.startsWith('command -v') || cmd.startsWith('where'))) {
        throw new Error('Command not found');
      }
      return '';
    });

    const tools = discoverTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].id).toBe('opencode');
    expect(tools[0].isInstalled).toBe(false);
    expect(tools[0].version).toBeUndefined();
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
