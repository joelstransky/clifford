import fs from 'fs';
import path from 'path';
import { CommsBridge } from './bridge';

export interface SprintManifest {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  tasks: Array<{
    id: string;
    file: string;
    status: 'pending' | 'active' | 'completed';
  }>;
}

export class SprintRunner {
  private bridge: CommsBridge;
  private sprintDir: string;

  constructor(sprintDir: string) {
    this.sprintDir = sprintDir;
    this.bridge = new CommsBridge();
  }

  async run() {
    const manifestPath = path.resolve(this.sprintDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}`);
    }

    this.syncSprintStates(manifestPath);

    try {
      await this.bridge.start();

      console.log(`🚀 Starting sprint in ${this.sprintDir}`);

      while (this.hasPendingTasks(manifestPath)) {
        if (this.bridge.checkPaused()) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const manifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const nextTask = manifest.tasks.find(t => t.status === 'pending');

        if (!nextTask) break;

        console.log(`🔍 Next task: ${nextTask.id} (${nextTask.file})`);
        
        const promptPath = path.resolve('.clifford/prompt.md');
        const promptContent = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf8') : '';
        
        if (promptContent) {
          console.log('📝 Using prompt from .clifford/prompt.md');
        }

        // In future tasks, we will implement agent invocation here.
        // For now, we simulate work to allow bridge testing.
        console.log('⏳ Agent working... (Press Ctrl+C to stop or use bridge to block)');
        
        // We'll wait here, but we should check for pause frequently
        for (let i = 0; i < 10; i++) {
          if (this.bridge.checkPaused()) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (this.bridge.checkPaused()) {
          console.log('\n⏸️ Sprint loop paused due to blocker.');
          continue;
        }

        // To prevent infinite loop in this stage of development:
        console.log('Task processing simulation ended. Breaking loop.');
        break; 
      }
    } finally {
      console.log('🏁 Sprint loop finished.');
      this.bridge.stop();
    }
  }

  private hasPendingTasks(manifestPath: string): boolean {
    try {
      const manifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.tasks.some(t => t.status === 'pending');
    } catch {
      return false;
    }
  }

  private syncSprintStates(targetManifestPath: string) {
    const sprintsBaseDir = path.dirname(path.dirname(targetManifestPath));
    if (!fs.existsSync(sprintsBaseDir)) return;
    
    const sprintDirs = fs.readdirSync(sprintsBaseDir);

    for (const dir of sprintDirs) {
      const mPath = path.join(sprintsBaseDir, dir, 'manifest.json');
      if (fs.existsSync(mPath)) {
        let content = fs.readFileSync(mPath, 'utf8');
        if (path.resolve(mPath) === path.resolve(targetManifestPath)) {
          // Force target to active
          content = content.replace(/"status":\s*"[^"]*"/, '"status": "active"');
        } else {
          // Set other active sprints to pending
          content = content.replace(/"status":\s*"active"/, '"status": "pending"');
        }
        fs.writeFileSync(mPath, content, 'utf8');
      }
    }
  }
}
