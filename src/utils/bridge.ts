import http from 'http';
import { ChildProcess } from 'child_process';
import { AFKManager } from './afk';

interface BlockRequest {
  task?: string;
  reason?: string;
  question?: string;
}

export class CommsBridge {
  private server: http.Server;
  private port: number = 4096;
  private isPaused: boolean = false;
  private afk: AFKManager;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeChild: ChildProcess | null = null;

  constructor() {
    this.afk = new AFKManager();
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/block') {
        // ... (existing code for /block)
      } else if (req.method === 'POST' && req.url === '/resolve') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const answer = data.answer || data.response; // Accept either
            this.resolveBlocker(answer);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'resumed', answer }));
          } catch {
            res.writeHead(400);
            res.end('Invalid JSON');
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }

  setActiveChild(child: ChildProcess | null) {
    this.activeChild = child;
  }

  resolveBlocker(response: string) {
    console.log(`\n✅ BLOCKER RESOLVED: ${response}`);
    if (this.activeChild && this.activeChild.stdin) {
      this.activeChild.stdin.write(response + '\n');
    }
    this.resume();
  }

  private startAFKPolling() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      if (!this.isPaused) {
        this.stopAFKPolling();
        return;
      }
      const response = await this.afk.pollForResponse();
      if (response) {
        console.log(`\n📱 Telegram response received: ${response}`);
        this.resolveBlocker(response);
      }
    }, 5000);
  }

  private stopAFKPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async triggerBlock(data: BlockRequest) {
    console.log('\n🛑 BLOCKER TRIGGERED:');
    console.log(`Task: ${data.task || 'Unknown'}`);
    console.log(`Reason: ${data.reason || 'Unknown'}`);
    console.log(`Question: ${data.question || 'None'}`);
    
    this.isPaused = true;

    if (this.afk.isConfigured()) {
      console.log('📱 Sending Telegram notification...');
      const sent = await this.afk.notifyBlocker(
        data.task || 'Unknown', 
        data.reason || 'Unknown', 
        data.question || 'No question provided'
      );
      if (sent) {
        this.startAFKPolling();
      }
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tryListen = (portToTry: number) => {
        const tempServer = http.createServer();
        tempServer.on('error', (e: NodeJS.ErrnoException) => {
          if (e.code === 'EADDRINUSE') {
            tryListen(portToTry + 1);
          } else {
            reject(e);
          }
        });

        tempServer.listen(portToTry, () => {
          tempServer.close(() => {
            this.port = portToTry;
            this.server.listen(this.port, () => {
              console.log(`🚀 Comms Bridge listening on port ${this.port}`);
              resolve();
            });
          });
        });
      };

      tryListen(this.port);
    });
  }

  stop() {
    this.stopAFKPolling();
    this.server.close();
  }

  checkPaused(): boolean {
    return this.isPaused;
  }

  resume() {
    this.isPaused = false;
    this.stopAFKPolling();
  }
}
