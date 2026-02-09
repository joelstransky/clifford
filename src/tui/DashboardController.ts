import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { CommsBridge, BlockRequest } from '../utils/bridge.js';
import { SprintRunner, SprintManifest } from '../utils/sprint.js';

// ─── Shared Types ──────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  file: string;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
}

export interface Manifest {
  id: string;
  name: string;
  status: string;
  tasks: Task[];
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// ─── Controller Events ─────────────────────────────────────────────────────────

/**
 * Events emitted by DashboardController to notify the TUI layer:
 *
 *  'state-changed'  – General state mutation; the TUI should re-render.
 *  'log-added'      – A new log entry was appended (param: LogEntry).
 *  'tab-changed'    – The active tab/panel switched (param: activeTab).
 *  'blocker-active' – A blocker appeared (param: BlockRequest).
 *  'blocker-cleared'– The blocker was resolved or dismissed.
 *  'quit-confirmed' – The user double-pressed Q; the TUI should exit.
 */
export type DashboardEvent =
  | 'state-changed'
  | 'log-added'
  | 'tab-changed'
  | 'blocker-active'
  | 'blocker-cleared'
  | 'quit-confirmed';

// ─── Spinner Constants ─────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const MAX_LOGS = 100;
const QUIT_TIMEOUT_MS = 3000;

// ─── Controller ────────────────────────────────────────────────────────────────

export class DashboardController extends EventEmitter {
  // --- Dependencies ---
  private readonly bridge: CommsBridge;
  private readonly runner: SprintRunner;

  // --- Tab / View ---
  public activeTab: 'sprints' | 'activity' = 'sprints';
  public viewMode: 'sprints' | 'tasks' = 'sprints';
  public currentRightView: 'activity' | 'blocker' = 'activity';

  // --- Sprint List ---
  public allSprints: SprintManifest[] = [];
  public selectedIndex: number = 0;
  public currentSprintDir: string;

  // --- Manifest ---
  public manifest: Manifest | null = null;
  private previousManifest: Manifest | null = null;
  private previousStatusSnapshot: Map<string, Task['status']> | null = null;

  // --- Logs ---
  public logs: LogEntry[] = [];

  // --- Blocker ---
  public activeBlocker: BlockRequest | null = null;
  public chatInput: string = '';

  // --- Timer ---
  public sprintStartTime: number | null = null;
  public elapsedSeconds: number = 0;

  // --- Active Task ---
  public activeTaskId: string | null = null;

  // --- Quit Confirmation ---
  public quitPending: boolean = false;
  private quitTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Spinner ---
  public spinnerFrameIndex: number = 0;
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;

  // --- Intervals ---
  private manifestPollInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // --- Status Icon/Label Lookups (exposed for TUI) ---
  public static readonly STATUS_ICONS: Record<Task['status'], string> = {
    completed: '✅',
    active: '🔄',
    pending: '⏳',
    blocked: '🛑',
    pushed: '📤',
  };

  public static readonly STATUS_LABELS: Record<Task['status'], string> = {
    pending: 'Pending',
    active: 'Active',
    blocked: 'Blocked',
    completed: 'Complete',
    pushed: 'Published',
  };

  public static readonly SPINNER_FRAMES = SPINNER_FRAMES;

  // ────────────────────────────────────────────────────────────────────────────
  // Construction
  // ────────────────────────────────────────────────────────────────────────────

  constructor(sprintDir: string, bridge: CommsBridge, runner: SprintRunner) {
    super();
    this.currentSprintDir = sprintDir;
    this.bridge = bridge;
    this.runner = runner;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────────────────

  /** Boot the controller: discover sprints, wire events, start intervals. */
  public init(): void {
    this.discoverSprints();
    this.wireBridgeEvents();
    this.wireRunnerEvents();
    this.startManifestPolling();
    this.startTimerInterval();
    this.loadManifest(); // initial load
    this.addLog('Dashboard initialized', 'info');
  }

  /** Tear down all intervals. Call before exiting. */
  public destroy(): void {
    this.stopSpinner();
    this.stopManifestPolling();
    this.stopTimerInterval();
    this.cancelQuit();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sprint Discovery
  // ────────────────────────────────────────────────────────────────────────────

  private discoverSprints(): void {
    this.allSprints = SprintRunner.discoverSprints();
    const initialIndex = this.allSprints.findIndex(
      s => path.resolve(s.path) === path.resolve(this.currentSprintDir),
    );
    if (initialIndex !== -1) this.selectedIndex = initialIndex;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Bridge Events
  // ────────────────────────────────────────────────────────────────────────────

  private wireBridgeEvents(): void {
    if (!this.bridge) return;

    this.bridge.on('block', (data: BlockRequest) => {
      this.activeBlocker = data;
      this.chatInput = '';
      this.addLog(`🛑 Blocker: ${data.question || data.reason}`, 'error');
      this.switchTab('activity');
      this.emit('blocker-active', data);
    });

    this.bridge.on('resolve', (response: string) => {
      this.activeBlocker = null;
      this.chatInput = '';
      this.addLog(
        `✅ Blocker resolved: ${response.substring(0, 30)}${response.length > 30 ? '...' : ''}`,
        'success',
      );
      this.emit('blocker-cleared');
      this.emitChange();

      // Auto-restart if runner is not running
      setTimeout(() => {
        if (!this.runner.getIsRunning()) {
          this.addLog('🧠 Restarting sprint with guidance...', 'warning');
          this.runner.run().catch(err => this.addLog(`Restart Error: ${err.message}`, 'error'));
        }
      }, 500);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Runner Events
  // ────────────────────────────────────────────────────────────────────────────

  private wireRunnerEvents(): void {
    if (!this.runner) return;

    this.runner.setQuietMode(true);

    this.runner.on('start', () => {
      this.sprintStartTime = Date.now();
      this.elapsedSeconds = 0;
      this.startSpinner();
      if (!this.activeBlocker) {
        this.switchTab('activity');
      }
      this.emitChange();
    });

    this.runner.on('stop', () => {
      this.stopSpinner();
      this.sprintStartTime = null;
      this.activeTaskId = null;
      this.emitChange();
    });

    this.runner.on('task-start', (data: { taskId: string; file: string }) => {
      this.stopSpinner();
      this.activeTaskId = data.taskId;
      this.emitChange();
    });

    this.runner.on('log', (data: { message: string; type: 'info' | 'warning' | 'error' }) => {
      this.addLog(data.message, data.type);
    });

    this.runner.on('output', (data: { data: string; stream: string }) => {
      const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach(line => {
        this.addLog(`> ${line.substring(0, 120)}`, 'info');
      });
    });

    this.runner.on('halt', (data: { task: string; reason: string; question: string }) => {
      this.stopSpinner();
      this.bridge.setBlockerContext(data.task, data.question);
      this.activeBlocker = { task: data.task, reason: data.reason, question: data.question };
      this.chatInput = '';
      this.addLog(`🛑 ${data.reason}: ${data.task}`, 'error');
      this.switchTab('activity');
      this.emit('blocker-active', this.activeBlocker);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Manifest Polling
  // ────────────────────────────────────────────────────────────────────────────

  private startManifestPolling(): void {
    this.manifestPollInterval = setInterval(() => this.loadManifest(), 1000);
  }

  private stopManifestPolling(): void {
    if (this.manifestPollInterval) {
      clearInterval(this.manifestPollInterval);
      this.manifestPollInterval = null;
    }
  }

  /** Build a snapshot map of task ID → status for efficient comparison. */
  private buildStatusSnapshot(m: Manifest): Map<string, Task['status']> {
    const snapshot = new Map<string, Task['status']>();
    m.tasks.forEach(task => snapshot.set(task.id, task.status));
    return snapshot;
  }

  public loadManifest(): void {
    // Skip polling when not viewing tasks and no sprint is running
    if (this.viewMode === 'sprints' && !this.runner.getIsRunning()) return;

    const p = path.resolve(this.currentSprintDir, 'manifest.json');
    try {
      if (fs.existsSync(p)) {
        const m: Manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
        const newSnapshot = this.buildStatusSnapshot(m);

        let hasChanges = false;

        if (this.previousManifest && this.previousManifest.id === m.id && this.previousStatusSnapshot) {
          for (const [taskId, newStatus] of newSnapshot) {
            const prevStatus = this.previousStatusSnapshot.get(taskId);
            if (prevStatus !== undefined && prevStatus !== newStatus) {
              hasChanges = true;
              this.addLog(
                `${DashboardController.STATUS_ICONS[newStatus]} ${taskId}: ${prevStatus} → ${newStatus}`,
                newStatus === 'completed'
                  ? 'success'
                  : newStatus === 'blocked'
                    ? 'error'
                    : newStatus === 'active'
                      ? 'warning'
                      : 'info',
              );
            }
          }
        } else if (!this.previousManifest || this.previousManifest.id !== m.id) {
          hasChanges = true;
        }

        this.manifest = m;
        this.previousManifest = m;
        this.previousStatusSnapshot = newSnapshot;

        if (hasChanges) this.emitChange();
      }
    } catch {
      /* ignore parse errors */
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Timer
  // ────────────────────────────────────────────────────────────────────────────

  private startTimerInterval(): void {
    this.timerInterval = setInterval(() => {
      if (this.sprintStartTime) {
        this.elapsedSeconds = Math.floor((Date.now() - this.sprintStartTime) / 1000);
        this.emitChange();
      }
    }, 1000);
  }

  private stopTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Spinner
  // ────────────────────────────────────────────────────────────────────────────

  public startSpinner(): void {
    if (this.spinnerInterval) return;
    this.spinnerFrameIndex = 0;
    this.spinnerInterval = setInterval(() => {
      this.spinnerFrameIndex = (this.spinnerFrameIndex + 1) % SPINNER_FRAMES.length;
      this.emitChange();
    }, 80);
    this.emitChange();
  }

  public stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  public get isSpinnerActive(): boolean {
    return this.spinnerInterval !== null;
  }

  public get currentSpinnerFrame(): string {
    return SPINNER_FRAMES[this.spinnerFrameIndex];
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Logging
  // ────────────────────────────────────────────────────────────────────────────

  public addLog(message: string, type: LogEntry['type'] = 'info'): void {
    this.logs.push({ timestamp: new Date(), message, type });
    if (this.logs.length > MAX_LOGS) this.logs.shift();
    this.emit('log-added', this.logs[this.logs.length - 1]);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Computed State Helpers
  // ────────────────────────────────────────────────────────────────────────────

  public get completedCount(): number {
    return this.manifest
      ? this.manifest.tasks.filter(t => t.status === 'completed' || t.status === 'pushed').length
      : 0;
  }

  public get totalCount(): number {
    return this.manifest ? this.manifest.tasks.length : 0;
  }

  public get isRunning(): boolean {
    return this.runner.getIsRunning();
  }

  public get isBlocked(): boolean {
    return this.manifest
      ? this.manifest.tasks.some(t => t.status === 'blocked')
      : false;
  }

  public canSprintStart(): boolean {
    if (!this.manifest || this.runner.getIsRunning()) return false;
    const validSprintStatus = this.manifest.status === 'pending' || this.manifest.status === 'active';
    const hasWorkableTasks = this.manifest.tasks.some(t => t.status === 'pending' || t.status === 'active');
    return validSprintStatus && hasWorkableTasks;
  }

  public getRunningSprintName(): string {
    const runningDir = this.runner.getSprintDir();
    const runningSprint = this.allSprints.find(
      s => path.resolve(s.path) === path.resolve(runningDir),
    );
    return runningSprint?.name || 'Unknown';
  }

  public getRunnerStatus(): string {
    return this.runner.getStatus();
  }

  public getRunnerSprintDir(): string {
    return this.runner.getSprintDir();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Navigation Actions
  // ────────────────────────────────────────────────────────────────────────────

  public switchTab(tab: 'sprints' | 'activity'): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.emit('tab-changed', tab);
    this.emitChange();
  }

  public navigateUp(): void {
    if (this.activeTab === 'sprints' && this.viewMode === 'sprints') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.emitChange();
    }
  }

  public navigateDown(): void {
    if (this.activeTab === 'sprints' && this.viewMode === 'sprints') {
      this.selectedIndex = Math.min(this.allSprints.length - 1, this.selectedIndex + 1);
      this.emitChange();
    }
  }

  public drillIntoSprint(): void {
    if (this.activeTab !== 'sprints' || this.viewMode !== 'sprints') return;
    const selected = this.allSprints[this.selectedIndex];
    if (!selected) return;

    this.currentSprintDir = selected.path;
    this.viewMode = 'tasks';
    this.manifest = null;
    this.previousManifest = null;
    this.previousStatusSnapshot = null;
    this.loadManifest();
  }

  public drillBack(): void {
    if (this.activeTab !== 'sprints' || this.viewMode !== 'tasks') return;
    this.viewMode = 'sprints';
    this.manifest = null;
    this.previousManifest = null;
    this.previousStatusSnapshot = null;
    this.emitChange();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sprint Actions
  // ────────────────────────────────────────────────────────────────────────────

  public startSprint(): void {
    if (this.viewMode !== 'tasks' || !this.canSprintStart()) {
      if (this.runner.getIsRunning()) {
        const runningDir = this.runner.getSprintDir();
        const runningSprint = this.allSprints.find(
          s => path.resolve(s.path) === path.resolve(runningDir),
        );
        this.addLog(`Already running: ${runningSprint?.name || 'Another sprint'}`, 'warning');
      }
      return;
    }

    // Clear activity log for fresh user-initiated run
    this.logs = [];
    this.emit('log-added', null); // signal full log clear

    this.runner.setSprintDir(this.currentSprintDir);
    this.addLog(`Starting sprint: ${this.manifest?.name || this.currentSprintDir}`, 'warning');
    this.runner.run().catch(err => {
      this.stopSpinner();
      this.addLog(`Runner Error: ${err.message}`, 'error');
    });
  }

  public stopSprint(): void {
    if (this.runner.getIsRunning()) {
      this.addLog('Stopping sprint...', 'error');
      this.runner.stop();
    }
  }

  public refresh(): void {
    this.addLog('Manual refresh', 'info');
    this.loadManifest();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Quit Confirmation
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Handle the Q key press. Returns true if the user has confirmed quit
   * (second press). Returns false if this was the first press (pending).
   */
  public handleQuitPress(): boolean {
    if (this.activeBlocker) return false; // Q disabled during blocker input

    if (this.quitPending) {
      this.cancelQuit();
      this.emit('quit-confirmed');
      return true;
    }

    this.quitPending = true;
    this.emitChange();
    this.quitTimer = setTimeout(() => {
      this.cancelQuit();
    }, QUIT_TIMEOUT_MS);

    return false;
  }

  public cancelQuit(): void {
    this.quitPending = false;
    if (this.quitTimer) {
      clearTimeout(this.quitTimer);
      this.quitTimer = null;
    }
    this.emitChange();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Blocker Input
  // ────────────────────────────────────────────────────────────────────────────

  public handleBlockerChar(char: string): void {
    if (!this.activeBlocker) return;
    this.chatInput += char;
    this.emitChange();
  }

  public handleBlockerBackspace(): void {
    if (!this.activeBlocker) return;
    this.chatInput = this.chatInput.slice(0, -1);
    this.emitChange();
  }

  public handleBlockerSubmit(): void {
    if (!this.activeBlocker || !this.chatInput.trim()) return;

    const response = this.chatInput.trim();
    const taskId = this.activeBlocker.task || '';
    const isDone = response.toLowerCase() === 'done' || response.toLowerCase() === 'done.';

    // Append user's response to the task file (unless "Done")
    if (!isDone && this.manifest && taskId) {
      const task = this.manifest.tasks.find(t => t.id === taskId);
      if (task) {
        const taskFilePath = path.resolve(this.currentSprintDir, task.file);
        try {
          const existing = fs.readFileSync(taskFilePath, 'utf8');
          const appendix = `\n\n## Supplemental Info\n${response}\n`;
          fs.writeFileSync(taskFilePath, existing + appendix, 'utf8');
          this.addLog(`📝 Appended guidance to ${task.file}`, 'success');
        } catch (err) {
          this.addLog(`❌ Failed to update task file: ${(err as Error).message}`, 'error');
        }
      }
    }

    // Clear blocker state and unpause bridge
    this.activeBlocker = null;
    this.chatInput = '';
    this.bridge.resume();

    if (isDone) {
      this.addLog('✅ Action confirmed. Restarting sprint...', 'success');
    } else {
      this.addLog('✅ Guidance saved. Restarting sprint...', 'success');
    }

    this.emit('blocker-cleared');
    this.emitChange();

    // Restart the sprint
    setTimeout(() => {
      if (!this.runner.getIsRunning()) {
        this.runner.run().catch(err => this.addLog(`Restart Error: ${err.message}`, 'error'));
      }
    }, 500);
  }

  public handleBlockerDismiss(): void {
    if (!this.activeBlocker) return;

    this.activeBlocker = null;
    this.chatInput = '';
    this.bridge.resume();
    if (this.runner.getIsRunning()) this.runner.stop();
    this.addLog('Help dismissed, sprint stopped.', 'warning');
    this.emit('blocker-cleared');
    this.emitChange();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ────────────────────────────────────────────────────────────────────────────

  private emitChange(): void {
    this.emit('state-changed');
  }
}
