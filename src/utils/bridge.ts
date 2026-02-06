import http from 'http';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { AFKManager } from './afk.js';
import { saveMemory } from './asm-storage.js';

export interface BlockRequest {
  task?: string;
  reason?: string;
  question?: string;
}

export class CommsBridge extends EventEmitter {
  private server: http.Server;
  private port: number = 8686; // Moved away from OpenCode's range
  private isPaused: boolean = false;
  private afk: AFKManager;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeChild: ChildProcess | null = null;
  private currentTaskId: string | null = null;
  private currentQuestion: string | null = null;

  constructor() {
    super();
    this.afk = new AFKManager();
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (req.url === '/block') {
              this.triggerBlock(data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'paused' }));
            } else if (req.url === '/resolve' || req.url === '/respond') {
              const answer = data.answer || data.response;
              this.resolveBlocker(answer);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'resumed', answer }));
            } else {
              res.writeHead(404);
              res.end();
            }
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
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

  killActiveChild() {
    if (this.activeChild) {
      this.activeChild.kill();
      this.activeChild = null;
    }
  }

  resolveBlocker(response: string) {
    console.log(`\n✅ BLOCKER RESOLVED: ${response}`);
    
    if (this.currentTaskId && this.currentQuestion) {
      saveMemory(this.currentTaskId, this.currentQuestion, response);
    }

    if (this.activeChild) {
      this.activeChild.kill();
    }
    
    this.emit('resolve', response);
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

  /**
   * Sets the blocker context for halt scenarios where the agent has already exited.
   * Unlike triggerBlock(), this does not pause the bridge or emit events — the
   * Dashboard handles that via the runner's 'halt' event.
   */
  setBlockerContext(taskId: string, question: string) {
    this.currentTaskId = taskId;
    this.currentQuestion = question;
  }

  async triggerBlock(data: BlockRequest) {
    // Only log to console if NOT in TUI mode (no listeners on 'block' event)
    if (this.listenerCount('block') === 0) {
      console.log('\n' + '!'.repeat(50));
      console.log('🛑 BLOCKER TRIGGERED - ACTION REQUIRED');
      console.log('!'.repeat(50));
      console.log(`Task: ${data.task || 'Unknown'}`);
      console.log(`Reason: ${data.reason || 'Unknown'}`);
      console.log(`Question: ${data.question || 'None'}`);
      console.log('-'.repeat(50));
      console.log(`👉 Send your response to: POST http://localhost:${this.port}/resolve`);
      console.log(`   JSON Body: { "response": "your answer" }`);
      console.log('-'.repeat(50) + '\n');
    }
    
    this.currentTaskId = data.task || null;
    this.currentQuestion = data.question || null;
    this.isPaused = true;

    this.emit('block', data);

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

  getPort(): number {
    return this.port;
  }
}
