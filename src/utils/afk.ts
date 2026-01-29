import fs from 'fs';
import path from 'path';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class AFKManager {
  private configPath: string;
  private lastUpdateId: number = 0;

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'telegram_config.json');
  }

  isConfigured(): boolean {
    return fs.existsSync(this.configPath) || this.isPackageInstalled();
  }

  private isPackageInstalled(): boolean {
    try {
      require.resolve('clifford-afk');
      return true;
    } catch {
      return false;
    }
  }

  private getConfig(): TelegramConfig | null {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  async notifyBlocker(task: string, reason: string, question: string): Promise<boolean> {
    const config = this.getConfig();
    if (!config) return false;

    const message = `🚨 *Clifford Blocker*\n\n*Task:* ${task}\n*Reason:* ${reason}\n*Question:* ${question}\n\n_Reply to this message to resolve._`;

    try {
      const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (response.ok) {
        await this.initLastUpdateId(config.botToken);
      }

      return response.ok;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  private async initLastUpdateId(token: string) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`;
      const response = await fetch(url);
      const data = await response.json() as { ok: boolean; result: Array<{ update_id: number }> };
      if (data.ok && data.result.length > 0) {
        this.lastUpdateId = data.result[0].update_id;
      }
    } catch {
      // Ignore
    }
  }

  async pollForResponse(): Promise<string | null> {
    const config = this.getConfig();
    if (!config) return null;

    try {
      const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${this.lastUpdateId + 1}`;
      const response = await fetch(url);
      const data = await response.json() as { 
        ok: boolean; 
        result: Array<{ 
          update_id: number; 
          message?: { 
            text?: string; 
            chat: { id: number | string } 
          } 
        }> 
      };
      
      if (data.ok && data.result.length > 0) {
        let lastText: string | null = null;
        for (const update of data.result) {
          this.lastUpdateId = update.update_id;
          if (update.message && update.message.chat.id.toString() === config.chatId.toString()) {
             lastText = update.message.text || null;
          }
        }
        return lastText;
      }
    } catch (error) {
      console.error('Failed to poll Telegram updates:', error);
    }
    return null;
  }
}
