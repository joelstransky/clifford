import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { CommsBridge } from './bridge.js';
import { discoverTools } from './discovery.js';
import { getMemory, clearMemory } from './asm-storage.js';
import { loadProjectConfig, loadGlobalConfig, resolveModel } from './config.js';

export interface SprintManifest {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  path: string;
  model?: string;
  tasks: Array<{
    id: string;
    file: string;
    status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
  }>;
}

export class SprintRunner extends EventEmitter {
  private bridge: CommsBridge;
  private sprintDir: string;
  private isRunning: boolean = false;
  private currentTaskId: string | null = null;
  private quietMode: boolean = false;
  private status: string = 'Ready';

  private log(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.emit('log', { message, type });
    if (!this.quietMode) {
      if (type === 'error') console.error(message);
      else console.log(message);
    }
  }

  static discoverSprints(): SprintManifest[] {
    const projectRoot = this.findProjectRoot(process.cwd());
    const sprintsDir = fs.existsSync(path.join(projectRoot, 'sprints')) 
      ? path.join(projectRoot, 'sprints')
      : path.join(projectRoot, '.clifford/sprints');

    if (!fs.existsSync(sprintsDir)) {
      return [];
    }

    const entries = fs.readdirSync(sprintsDir, { withFileTypes: true });
    const manifests: SprintManifest[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(sprintsDir, entry.name, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(content) as SprintManifest;
            const relativeSprintsDir = sprintsDir.includes('.clifford') ? '.clifford/sprints' : 'sprints';
            manifest.path = path.join(relativeSprintsDir, entry.name);
            manifests.push(manifest);
          } catch (e) {
            console.error(`Failed to parse manifest at ${manifestPath}:`, e);
          }
        }
      }
    }

    return manifests;
  }

  private static findProjectRoot(startDir: string): string {
    let current = path.resolve(startDir);
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, '.clifford'))) {
        return current;
      }
      current = path.dirname(current);
    }
    return startDir;
  }

  constructor(sprintDir: string, bridge?: CommsBridge, quietMode: boolean = false) {
    super();
    this.sprintDir = sprintDir.replace(/\\/g, '/');
    this.bridge = bridge || new CommsBridge();
    this.quietMode = quietMode;
  }

  public setQuietMode(quiet: boolean) {
    this.quietMode = quiet;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  public getStatus(): string {
    return this.status;
  }

  public setSprintDir(dir: string) {
    if (this.isRunning) return;
    this.sprintDir = dir.replace(/\\/g, '/');
  }

  public getSprintDir(): string {
    return this.sprintDir;
  }

  public stop() {
    if (!this.isRunning) return;
    this.log('🛑 Stopping sprint...', 'warning');
    this.isRunning = false;
    this.bridge.resume();
    this.bridge.killActiveChild();
    this.emit('stop');
  }

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.sprintDir === '.') {
      this.sprintDir = this.findActiveSprintDir();
    }

    const manifestPath = path.resolve(process.cwd(), this.sprintDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}. Current working directory: ${process.cwd()}, sprintDir: ${this.sprintDir}`);
    }

    const projectRoot = SprintRunner.findProjectRoot(path.dirname(manifestPath));

    this.syncSprintStates(manifestPath);

    const projectConfig = loadProjectConfig();
    const globalConfig = loadGlobalConfig();
    const aiToolId = projectConfig.aiTool || 'opencode';

    const tools = discoverTools();
    const engine = tools.find(t => t.id === aiToolId) || tools.find(t => t.id === 'opencode');

    if (!engine) {
      throw new Error(`AI engine ${aiToolId} not found.`);
    }

    try {
      await this.bridge.start();

      this.status = 'Starting...';
      this.log(`🚀 Starting sprint in ${this.sprintDir}`);
      this.emit('start', { sprintDir: this.sprintDir });

      while (this.hasPendingTasks(manifestPath) && this.isRunning) {
        if (this.bridge.checkPaused()) {
          this.status = 'Needs Help';
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const manifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const model = resolveModel(manifest, projectConfig, globalConfig) || 'opencode/kimi-k2.5-free';
        const nextTask = manifest.tasks.find(t => t.status === 'pending');

        if (!nextTask) break;

        this.currentTaskId = nextTask.id;
        this.status = `Running: ${nextTask.id}`;
        this.emit('task-start', { taskId: nextTask.id, file: nextTask.file });
        this.log(`🔍 Next task: ${nextTask.id} (${nextTask.file})`);
        
        const promptPath = path.join(projectRoot, '.clifford/prompt.md');
        let promptContent = '';
        
        try {
          if (fs.existsSync(promptPath)) {
            promptContent = fs.readFileSync(promptPath, 'utf8');
            this.log(`📝 Loaded instructions from ${promptPath}`);
          } else {
            this.log(`⚠️ Warning: ${promptPath} not found. Running with basic context.`, 'warning');
          }
        } catch (err) {
          this.log(`❌ Error reading prompt file: ${(err as Error).message}`, 'error');
        }

        // Inject human guidance from ASM if available
        let humanGuidance = '';
        const memory = getMemory(nextTask.id);
        if (memory) {
          humanGuidance = `[HUMAN_GUIDANCE]
On a previous attempt, you hit a blocker: "${memory.question}"
The human has provided the following guidance: "${memory.answer}"
Proceed with this information.

`;
          this.log(`🧠 Injected human guidance for task ${nextTask.id}`);
        }

        // Ensure we always have the context at the top
        const finalPrompt = `CURRENT_SPRINT_DIR: ${this.sprintDir}
CLIFFORD_BRIDGE_PORT: ${this.bridge.getPort()}

${humanGuidance}${promptContent}`;

        this.log('🤖 Invoking Agent...');
        this.status = 'Building Task';
        
        const args = engine.getInvokeArgs(finalPrompt, model);
        this.log(`🛠️ Executing: ${engine.command} ${args.slice(0, -1).join(' ')} [prompt...]`);
        
        const exitCode = await new Promise<number>((resolve) => {
          // Spawn with args array directly (no shell) to avoid quoting/escaping issues
          const child = spawn(engine.command, args, {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: false,
          });

          this.bridge.setActiveChild(child);

          child.stdout?.on('data', (data) => {
            const output = data.toString();
            if (!this.quietMode) process.stdout.write(output);
            this.emit('output', { data: output, stream: 'stdout' });
            this.checkForPrompts(output, nextTask.id);
          });

          child.stderr?.on('data', (data) => {
            const output = data.toString();
            if (!this.quietMode) process.stderr.write(output);
            this.emit('output', { data: output, stream: 'stderr' });
            this.checkForPrompts(output, nextTask.id);
          });

          child.on('close', (code) => {
            this.bridge.setActiveChild(null);
            this.log(`Agent process exited with code ${code}`, code === 0 ? 'info' : 'error');
            resolve(code ?? 1);
          });

          child.on('error', (err) => {
            this.log(`❌ Error invoking agent: ${err.message}`, 'error');
            resolve(1);
          });
        });

        // Check if progress was made (manifest updated by the agent)
        const updatedManifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const taskInUpdated = updatedManifest.tasks.find(t => t.id === nextTask.id);
        
        if (taskInUpdated?.status === 'completed' || taskInUpdated?.status === 'pushed') {
          this.log(`🧹 Clearing memory for completed task: ${nextTask.id}`);
          clearMemory(nextTask.id);
        }

        if (this.bridge.checkPaused()) {
          this.log('⏸️ Sprint loop paused due to blocker.', 'warning');
          continue;
        }

        // Detect if we should stop the loop due to failure or lack of progress
        if (exitCode !== 0) {
          this.log(`🛑 Agent failed with exit code ${exitCode} on ${nextTask.id}`, 'error');
          break;
        }

        if (taskInUpdated?.status === 'pending') {
          this.log(`⚠️ Agent exited without completing ${nextTask.id}. Stopping runner.`, 'warning');
          break;
        }

        this.log('✅ Task completed. Moving to next...', 'info');
      }
    } finally {
      this.isRunning = false;
      this.currentTaskId = null;
      this.status = 'Ready';
      this.log('🏁 Sprint loop finished.');
      this.emit('stop');
      this.bridge.stop();
    }
  }

  private checkForPrompts(output: string, taskId: string) {
    if (this.bridge.checkPaused()) return;

    const promptPatterns = [
      /Permission required:/i,
      /Confirm\? \(y\/n\)/i,
      /\(y\/n\):? ?$/i,
      /\[y\/N\]:? ?$/i,
      /Input: ?$/i,
      /Identify yourself: ?$/i,
      /Enter .*: ?$/i,
      /\? $/
    ];

    for (const pattern of promptPatterns) {
      if (pattern.test(output)) {
        this.status = 'Needs Help';
        this.bridge.triggerBlock({
          task: taskId,
          reason: 'Interactive prompt detected',
          question: output.trim()
        }).catch(err => console.error('Error triggering block:', err));
        
        break;
      }
    }
  }

  private findActiveSprintDir(): string {
    const sprintsDir = path.resolve('.clifford/sprints');
    if (fs.existsSync(sprintsDir)) {
      const sprintDirs = fs.readdirSync(sprintsDir);
      for (const dir of sprintDirs) {
        const mPath = path.join(sprintsDir, dir, 'manifest.json');
        if (fs.existsSync(mPath)) {
          try {
            const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
            if (m.status === 'active') {
              return path.join('.clifford/sprints', dir);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    return '.clifford/sprints/sprint-01'; // Fallback
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
            // Set other active sprints to planning
            if (m.status === 'active') {
              m.status = 'planning';
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
