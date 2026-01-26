import { execSync } from 'child_process';
import { discoverTools } from './discovery';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('discovery', () => {
  const mockedExecSync = execSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should discover installed tools and handle missing ones', () => {
    mockedExecSync.mockImplementation((cmd: string) => {
      if (cmd.startsWith('command -v')) {
        const tool = cmd.split(' ')[2];
        if (tool === 'opencode' || tool === 'claude') {
          return `/usr/bin/${tool}`;
        }
        throw new Error('Command not found');
      }
      if (cmd.endsWith('--version')) {
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
  });

  it('should handle version check failures gracefully', () => {
    mockedExecSync.mockImplementation((cmd: string) => {
      if (cmd.startsWith('command -v')) {
        return '/usr/bin/opencode';
      }
      if (cmd.endsWith('--version')) {
        throw new Error('Version check failed');
      }
      return '';
    });

    const tools = discoverTools();
    const opencode = tools.find((t) => t.id === 'opencode');

    expect(opencode?.isInstalled).toBe(true);
    expect(opencode?.version).toBeUndefined();
  });
});
