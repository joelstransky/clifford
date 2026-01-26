import http from 'http';

interface BlockRequest {
  reason?: string;
  question?: string;
}

export class CommsBridge {
  private server: http.Server;
  private port: number = 4096;
  private isPaused: boolean = false;

  constructor() {
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/block') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data: BlockRequest = JSON.parse(body);
            console.log('\n🛑 BLOCKER RECEIVED:');
            console.log(`Reason: ${data.reason || data.question}`);
            this.isPaused = true;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'paused' }));
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

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Comms Bridge listening on port ${this.port}`);
    });
  }

  stop() {
    this.server.close();
  }

  checkPaused(): boolean {
    return this.isPaused;
  }

  resume() {
    this.isPaused = false;
  }
}
