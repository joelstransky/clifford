import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import fs from 'fs';
import { AFKManager } from './afk';

describe('AFKManager', () => {
  let afk: AFKManager;
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readFileSyncSpy: ReturnType<typeof spyOn>;
  let fetchMock: ReturnType<typeof mock>;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    existsSyncSpy = spyOn(fs, 'existsSync');
    readFileSyncSpy = spyOn(fs, 'readFileSync');
    fetchMock = mock(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: [] })
    }));
    originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    afk = new AFKManager();
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  it('should be configured if telegram_config.json exists', () => {
    existsSyncSpy.mockReturnValue(true);
    expect(afk.isConfigured()).toBe(true);
  });

  it('should send notification via Telegram', async () => {
    const config = { botToken: 'token', chatId: '123' };
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue(JSON.stringify(config));
    
    fetchMock.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: [] })
    }));

    const result = await afk.notifyBlocker('task', 'reason', 'question');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('should poll for responses', async () => {
    const config = { botToken: 'token', chatId: '123' };
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue(JSON.stringify(config));

    fetchMock.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        result: [
          {
            update_id: 100,
            message: {
              text: 'Resolve this',
              chat: { id: '123' }
            }
          }
        ]
      })
    }));

    const response = await afk.pollForResponse();
    expect(response).toBe('Resolve this');
    expect(fetchMock).toHaveBeenCalled();
  });
});
