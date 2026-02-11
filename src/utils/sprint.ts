import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { discoverTools } from './discovery.js';
import { getMemory, clearMemory } from './asm-storage.js';
import { loadProjectConfig, loadGlobalConfig, resolveModel } from './config.js';
import { readBlockFile, cleanupMcpFiles } from './mcp-ipc.js';

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
  private sprintDir: string;
  private isRunning: boolean = false;
  private currentTaskId: string | null = null;
  private quietMode: boolean = false;
  private status: string = 'Ready';
  private projectRoot: string;
  private activeChild: ChildProcess | null = null;

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

  constructor(sprintDir: string, quietMode: boolean = false) {
    super();
    this.sprintDir = sprintDir.replace(/\\/g, '/');
    this.quietMode = quietMode;
    this.projectRoot = SprintRunner.findProjectRoot(process.cwd());
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
    if (this.activeChild) {
      this.activeChild.kill();
      this.activeChild = null;
    }
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

    this.projectRoot = SprintRunner.findProjectRoot(path.dirname(manifestPath));

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
      // Clean up any stale MCP IPC files from previous runs
      cleanupMcpFiles(this.projectRoot);

      this.status = 'Starting...';
      this.log(`🚀 Starting sprint in ${this.sprintDir}`);
      this.emit('start', { sprintDir: this.sprintDir });

      while (this.hasPendingTasks(manifestPath) && this.isRunning) {
        const manifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const model = resolveModel(manifest, projectConfig, globalConfig) || 'opencode/kimi-k2.5-free';
        const nextTask = manifest.tasks.find(t => t.status === 'pending');

        if (!nextTask) break;

        this.currentTaskId = nextTask.id;
        this.status = `Running: ${nextTask.id}`;
        this.emit('task-start', { taskId: nextTask.id, file: nextTask.file });
        this.log(`🔍 Next task: ${nextTask.id} (${nextTask.file})`);
        
        const promptPath = path.join(this.projectRoot, '.clifford/prompt.md');
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

        // Build prompt — agent discovers request_help tool via MCP automatically
        const finalPrompt = `CURRENT_SPRINT_DIR: ${this.sprintDir}

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

          this.activeChild = child;

          // Poll for MCP block files during agent execution
          let blockEmitted = false;
          const blockPollInterval = setInterval(() => {
            const blockData = readBlockFile(this.projectRoot);
            if (blockData && !blockEmitted) {
              blockEmitted = true;
              this.status = 'Needs Help';
              this.emit('halt', {
                task: blockData.task,
                reason: blockData.reason,
                question: blockData.question,
              });
            } else if (!blockData && blockEmitted) {
              // Block file was cleaned up (response was written) — reset for next block
              blockEmitted = false;
            }
          }, 1000);

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
            clearInterval(blockPollInterval);
            this.activeChild = null;
            this.log(`Agent process exited with code ${code}`, code === 0 ? 'info' : 'error');
            resolve(code ?? 1);
          });

          child.on('error', (err) => {
            clearInterval(blockPollInterval);
            this.log(`❌ Error invoking agent: ${err.message}`, 'error');
            resolve(1);
          });
        });

        // Clean up any stale MCP IPC files after agent exits
        cleanupMcpFiles(this.projectRoot);

        // Check if progress was made (manifest updated by the agent)
        const updatedManifest: SprintManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const taskInUpdated = updatedManifest.tasks.find(t => t.id === nextTask.id);
        
        if (taskInUpdated?.status === 'completed' || taskInUpdated?.status === 'pushed') {
          this.log(`🧹 Clearing memory for completed task: ${nextTask.id}`);
          clearMemory(nextTask.id);
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
      this.activeChild = null;
      // Final cleanup of MCP IPC files
      cleanupMcpFiles(this.projectRoot);
      this.log('🏁 Sprint loop finished.');
      this.emit('stop');
    }
  }

  private checkForPrompts(output: string, taskId: string) {
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
        this.emit('halt', {
          task: taskId,
          reason: 'Interactive prompt detected',
          question: output.trim(),
        });
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
          const content = fs.readFileSync(mPath, 'utf8');
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
