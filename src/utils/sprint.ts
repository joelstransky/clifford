import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { CommsBridge } from './bridge';
import { discoverTools } from './discovery';

export interface SprintManifest {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  tasks: Array<{
    id: string;
    file: string;
    status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
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
    if (this.sprintDir === '.') {
      this.sprintDir = this.findActiveSprintDir();
    }

    const manifestPath = path.resolve(this.sprintDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}`);
    }

    const projectRoot = path.dirname(path.dirname(manifestPath));

    this.syncSprintStates(manifestPath);

    const configPath = path.join(projectRoot, '.clifford/config.json');
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    const aiToolId = config.aiTool || 'opencode';
    const model = config.model || 'google/gemini-3-flash-preview';

    const tools = discoverTools();
    const engine = tools.find(t => t.id === aiToolId) || tools.find(t => t.id === 'opencode');

    if (!engine) {
      throw new Error(`AI engine ${aiToolId} not found.`);
    }

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
        
        const promptPath = path.join(projectRoot, '.clifford/prompt.md');
        let promptContent = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf8') : '';
        
        if (promptContent) {
          console.log('📝 Using prompt from .clifford/prompt.md');
        }

        // Inject current sprint directory into prompt
        promptContent = `CURRENT_SPRINT_DIR: ${this.sprintDir}\n\n${promptContent}`;

        console.log('🤖 Invoking Agent...');
        
        const args = engine.getInvokeArgs(promptContent, model);
        
        const result = spawnSync(engine.command, args, {
          stdio: 'inherit',
          shell: true
        });

        if (result.error) {
          console.error(`❌ Error invoking agent: ${result.error.message}`);
          break;
        }

        if (this.bridge.checkPaused()) {
          console.log('\n⏸️ Sprint loop paused due to blocker.');
          continue;
        }

        // Check if progress was made (manifest updated)
        const updatedManifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const stillPending = updatedManifest.tasks.find(t => t.id === nextTask.id && t.status === 'pending');
        
        if (stillPending) {
          console.log('⚠️ No progress detected on the current task. Breaking loop to prevent infinite recursion.');
          break;
        }

        console.log('✅ Task completed. Moving to next...');
      }
    } finally {
      console.log('🏁 Sprint loop finished.');
      this.bridge.stop();
    }
  }

  private findActiveSprintDir(): string {
    const sprintsDir = path.resolve('sprints');
    if (fs.existsSync(sprintsDir)) {
      const sprintDirs = fs.readdirSync(sprintsDir);
      for (const dir of sprintDirs) {
        const mPath = path.join(sprintsDir, dir, 'manifest.json');
        if (fs.existsSync(mPath)) {
          try {
            const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
            if (m.status === 'active') {
              return path.join('sprints', dir);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    return 'sprints/sprint-01'; // Fallback
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
        try {
          let content = fs.readFileSync(mPath, 'utf8');
          const m = JSON.parse(content);
          if (path.resolve(mPath) === path.resolve(targetManifestPath)) {
            // Force target to active if not already
            if (m.status !== 'active') {
              m.status = 'active';
              fs.writeFileSync(mPath, JSON.stringify(m, null, 2), 'utf8');
            }
          } else {
            // Set other active sprints to pending
            if (m.status === 'active') {
              m.status = 'pending';
              fs.writeFileSync(mPath, JSON.stringify(m, null, 2), 'utf8');
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  }
}
