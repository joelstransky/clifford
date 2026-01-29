import fs from 'fs';
import { AFKManager } from './afk';

jest.mock('fs');

describe('AFKManager', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;
  let afk: AFKManager;

  beforeEach(() => {
    jest.clearAllMocks();
    afk = new AFKManager();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('should be configured if telegram_config.json exists', () => {
    mockedFs.existsSync.mockReturnValue(true);
    expect(afk.isConfigured()).toBe(true);
  });

  it('should send notification via Telegram', async () => {
    const config = { botToken: 'token', chatId: '123' };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(config));
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true, result: [] })
    });

    const result = await afk.notifyBlocker('task', 'reason', 'question');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('bottoken/sendMessage'),
      expect.any(Object)
    );
  });

  it('should poll for responses', async () => {
    const config = { botToken: 'token', chatId: '123' };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(config));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
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
    });

    const response = await afk.pollForResponse();
    expect(response).toBe('Resolve this');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('bottoken/getUpdates?offset=1')
    );
  });
});
