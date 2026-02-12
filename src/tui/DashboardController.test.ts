import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import fs from 'fs';
import { EventEmitter } from 'events';
import { DashboardController, type Manifest, type LogEntry, type BlockRequest } from './DashboardController';
import type { SprintRunner, SprintManifest } from '../utils/sprint';

// ─── Mock Types ─────────────────────────────────────────────────────────────

/** Extended mock runner with test-only helpers. */
interface MockRunner extends EventEmitter {
  setQuietMode: (quiet: boolean) => void;
  getIsRunning: () => boolean;
  setIsRunning: (v: boolean) => void;
  getStatus: () => string;
  setStatus: (s: string) => void;
  setSprintDir: (dir: string) => void;
  getSprintDir: () => string;
  run: () => Promise<void>;
  stop: () => void;
  getCurrentTaskId: () => string | null;
}

// ─── Mock Factories ─────────────────────────────────────────────────────────

/** Minimal mock that satisfies SprintRunner's interface as used by DashboardController. */
function createMockRunner(): MockRunner {
  const emitter = new EventEmitter();
  let running = false;
  let sprintDir = 'sprints/test-sprint';
  let status = 'Ready';
  return Object.assign(emitter, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setQuietMode: (_quiet: boolean) => {},
    getIsRunning: () => running,
    setIsRunning: (v: boolean) => { running = v; },
    getStatus: () => status,
    setStatus: (s: string) => { status = s; },
    setSprintDir: (dir: string) => { sprintDir = dir; },
    getSprintDir: () => sprintDir,
    run: () => { running = true; return Promise.resolve(); },
    stop: () => { running = false; },
    getCurrentTaskId: () => null,
  }) as MockRunner;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SAMPLE_MANIFEST: Manifest = {
  id: 'sprint-test',
  name: 'Test Sprint',
  status: 'active',
  tasks: [
    { id: 'task-1', file: 'tasks/01-first.md', status: 'pending' },
    { id: 'task-2', file: 'tasks/02-second.md', status: 'pending' },
    { id: 'task-3', file: 'tasks/03-third.md', status: 'completed' },
  ],
};

function createController(
  overrides?: Partial<{ sprintDir: string; runner: MockRunner }>,
): { ctrl: DashboardController; runner: MockRunner } {
  const runner = overrides?.runner ?? createMockRunner();
  const sprintDir = overrides?.sprintDir ?? 'sprints/test-sprint';
  const ctrl = new DashboardController(sprintDir, runner as unknown as SprintRunner);
  return { ctrl, runner };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DashboardController', () => {
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readFileSyncSpy: ReturnType<typeof spyOn>;
  let discoverSprintsSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    existsSyncSpy = spyOn(fs, 'existsSync').mockReturnValue(false);
    readFileSyncSpy = spyOn(fs, 'readFileSync').mockReturnValue('{}');
    // Mock static discoverSprints to avoid filesystem access
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SprintRunner: SR } = require('../utils/sprint');
    discoverSprintsSpy = spyOn(SR, 'discoverSprints').mockReturnValue([]);
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
    discoverSprintsSpy.mockRestore();
  });

  // ────────────────────────────────────────────────────────────────────────
  // State Transitions (Runner Events)
  // ────────────────────────────────────────────────────────────────────────

  describe('state transitions via runner events', () => {
    it('should set sprintStartTime and start spinner on runner "start" event', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      expect(ctrl.sprintStartTime).toBeNull();
      expect(ctrl.isSpinnerActive).toBe(false);

      runner.emit('start');

      expect(ctrl.sprintStartTime).toBeNumber();
      expect(ctrl.elapsedSeconds).toBe(0);
      expect(ctrl.isSpinnerActive).toBe(true);

      ctrl.destroy();
    });

    it('should switch to activity tab on runner "start" when no blocker is active', () => {
      const { ctrl, runner } = createController();
      ctrl.init();
      ctrl.activeTab = 'sprints';

      runner.emit('start');

      expect(ctrl.activeTab as string).toBe('activity');

      ctrl.destroy();
    });

    it('should NOT switch to activity tab on runner "start" when blocker is active', () => {
      const { ctrl, runner } = createController();
      ctrl.init();
      ctrl.activeTab = 'sprints';
      ctrl.activeBlocker = { task: 'task-1', reason: 'test', question: 'help?' };

      runner.emit('start');

      expect(ctrl.activeTab as string).toBe('sprints');

      ctrl.destroy();
    });

    it('should stop spinner and clear state on runner "stop" event', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      // Simulate start then stop
      runner.emit('start');
      expect(ctrl.isSpinnerActive).toBe(true);
      expect(ctrl.sprintStartTime).toBeNumber();

      runner.emit('stop');

      expect(ctrl.isSpinnerActive).toBe(false);
      expect(ctrl.sprintStartTime).toBeNull();
      expect(ctrl.activeTaskId).toBeNull();

      ctrl.destroy();
    });

    it('should set activeTaskId on runner "task-start" event', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      expect(ctrl.activeTaskId).toBeNull();

      runner.emit('task-start', { taskId: 'task-2', file: 'tasks/02-second.md' });

      expect(ctrl.activeTaskId).toBe('task-2');

      ctrl.destroy();
    });

    it('should stop spinner on "task-start" (agent took over)', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('start');
      expect(ctrl.isSpinnerActive).toBe(true);

      runner.emit('task-start', { taskId: 'task-1', file: 'tasks/01-first.md' });

      expect(ctrl.isSpinnerActive).toBe(false);

      ctrl.destroy();
    });

    it('should emit "state-changed" on runner start/stop/task-start', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      const stateChanges: number[] = [];
      ctrl.on('state-changed', () => stateChanges.push(Date.now()));

      runner.emit('start');
      runner.emit('task-start', { taskId: 'task-1', file: 'tasks/01.md' });
      runner.emit('stop');

      // start emits (spinner start + emitChange), task-start emits, stop emits
      expect(stateChanges.length).toBeGreaterThanOrEqual(3);

      ctrl.destroy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Buffer Separation (Log vs Output channels)
  // ────────────────────────────────────────────────────────────────────────

  describe('buffer separation for log and output events', () => {
    it('should route runner "log" events to activityLogs', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('log', { message: 'Activity log message', type: 'info' });

      expect(ctrl.activityLogs.length).toBe(2); // "Dashboard initialized" + our log
      const lastLog = ctrl.activityLogs[ctrl.activityLogs.length - 1];
      expect(lastLog.message).toBe('Activity log message');
      expect(lastLog.channel).toBe('activity');

      // Should NOT appear in processLogs
      expect(ctrl.processLogs.length).toBe(0);

      ctrl.destroy();
    });

    it('should route runner "output" events to processLogs', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('output', { data: 'Process output line\n', stream: 'stdout' });

      expect(ctrl.processLogs.length).toBe(1);
      expect(ctrl.processLogs[0].message).toContain('Process output line');
      expect(ctrl.processLogs[0].channel).toBe('process');

      // Should NOT appear in activityLogs (except the init log)
      const activityMessagesExcludingInit = ctrl.activityLogs.filter(
        l => l.message !== 'Dashboard initialized',
      );
      expect(activityMessagesExcludingInit.length).toBe(0);

      ctrl.destroy();
    });

    it('should split multi-line output into separate processLog entries', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('output', { data: 'line one\nline two\nline three\n', stream: 'stdout' });

      expect(ctrl.processLogs.length).toBe(3);
      expect(ctrl.processLogs[0].message).toContain('line one');
      expect(ctrl.processLogs[1].message).toContain('line two');
      expect(ctrl.processLogs[2].message).toContain('line three');

      ctrl.destroy();
    });

    it('should mark stderr output as "error" type', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('output', { data: 'error output\n', stream: 'stderr' });

      expect(ctrl.processLogs.length).toBe(1);
      expect(ctrl.processLogs[0].type).toBe('error');

      ctrl.destroy();
    });

    it('should mark stdout output as "info" type', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      runner.emit('output', { data: 'normal output\n', stream: 'stdout' });

      expect(ctrl.processLogs.length).toBe(1);
      expect(ctrl.processLogs[0].type).toBe('info');

      ctrl.destroy();
    });

    it('should emit "log-added" for every log entry', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      const logEvents: LogEntry[] = [];
      ctrl.on('log-added', (entry: LogEntry) => {
        if (entry) logEvents.push(entry);
      });

      runner.emit('log', { message: 'test', type: 'warning' });
      runner.emit('output', { data: 'output line\n', stream: 'stdout' });

      expect(logEvents.length).toBe(2);
      expect(logEvents[0].channel).toBe('activity');
      expect(logEvents[1].channel).toBe('process');

      ctrl.destroy();
    });

    it('should cap each buffer at MAX_LOGS (100) entries', () => {
      const { ctrl } = createController();
      ctrl.init();

      // Fill activityLogs past the limit
      for (let i = 0; i < 105; i++) {
        ctrl.addLog(`activity-${i}`, 'info', 'activity');
      }
      expect(ctrl.activityLogs.length).toBeLessThanOrEqual(100);
      expect(ctrl.logs.length).toBeLessThanOrEqual(100);

      // Fill processLogs past the limit
      for (let i = 0; i < 105; i++) {
        ctrl.addLog(`process-${i}`, 'info', 'process');
      }
      expect(ctrl.processLogs.length).toBeLessThanOrEqual(100);

      ctrl.destroy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Manifest Polling
  // ────────────────────────────────────────────────────────────────────────

  describe('manifest polling and change detection', () => {
    it('should load manifest from filesystem on loadManifest()', () => {
      const { ctrl } = createController();
      ctrl.init();
      // Must be in tasks viewMode or runner running for loadManifest to proceed
      ctrl.viewMode = 'tasks';

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(SAMPLE_MANIFEST));

      ctrl.loadManifest();

      expect(ctrl.manifest).not.toBeNull();
      expect(ctrl.manifest!.id).toBe('sprint-test');
      expect(ctrl.manifest!.tasks.length).toBe(3);

      ctrl.destroy();
    });

    it('should skip polling when viewMode is "sprints" and runner is not running', () => {
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'sprints';
      // runner is not running by default

      ctrl.loadManifest();

      // manifest should remain null because polling was skipped
      expect(ctrl.manifest).toBeNull();

      ctrl.destroy();
    });

    it('should poll when runner is running even in sprints viewMode', () => {
      const { ctrl, runner } = createController();
      ctrl.init();
      ctrl.viewMode = 'sprints';
      (runner as ReturnType<typeof createMockRunner>).setIsRunning(true);

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(SAMPLE_MANIFEST));

      ctrl.loadManifest();

      expect(ctrl.manifest).not.toBeNull();
      expect(ctrl.manifest!.id).toBe('sprint-test');

      ctrl.destroy();
    });

    it('should detect task status changes between manifest loads', () => {
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';

      const initialManifest = { ...SAMPLE_MANIFEST };
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(initialManifest));

      ctrl.loadManifest();

      // Now update a task status
      const updatedManifest: Manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01-first.md', status: 'active' },
          { id: 'task-2', file: 'tasks/02-second.md', status: 'pending' },
          { id: 'task-3', file: 'tasks/03-third.md', status: 'completed' },
        ],
      };
      readFileSyncSpy.mockReturnValue(JSON.stringify(updatedManifest));

      const stateChanges: string[] = [];
      ctrl.on('state-changed', () => stateChanges.push('changed'));

      ctrl.loadManifest();

      // Should have detected the pending → active transition
      expect(stateChanges.length).toBeGreaterThanOrEqual(1);

      // Should have logged the transition
      const transitionLog = ctrl.activityLogs.find(l => l.message.includes('task-1') && l.message.includes('→'));
      expect(transitionLog).toBeDefined();
      expect(transitionLog!.message).toContain('pending → active');

      ctrl.destroy();
    });

    it('should log status transitions with correct severity levels', () => {
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(SAMPLE_MANIFEST));
      ctrl.loadManifest();

      // task-1: pending → completed
      const completedManifest: Manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02-second.md', status: 'blocked' },
          { id: 'task-3', file: 'tasks/03-third.md', status: 'completed' },
        ],
      };
      readFileSyncSpy.mockReturnValue(JSON.stringify(completedManifest));
      ctrl.loadManifest();

      const completedLog = ctrl.activityLogs.find(
        l => l.message.includes('task-1') && l.message.includes('→ completed'),
      );
      expect(completedLog).toBeDefined();
      expect(completedLog!.type).toBe('success');

      const blockedLog = ctrl.activityLogs.find(
        l => l.message.includes('task-2') && l.message.includes('→ blocked'),
      );
      expect(blockedLog).toBeDefined();
      expect(blockedLog!.type).toBe('error');

      ctrl.destroy();
    });

    it('should handle missing manifest file gracefully', () => {
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';

      existsSyncSpy.mockReturnValue(false);

      // Should not throw
      ctrl.loadManifest();
      expect(ctrl.manifest).toBeNull();

      ctrl.destroy();
    });

    it('should handle malformed manifest JSON gracefully', () => {
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';

      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue('invalid json {{');

      // Should not throw
      ctrl.loadManifest();
      expect(ctrl.manifest).toBeNull();

      ctrl.destroy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Computed State
  // ────────────────────────────────────────────────────────────────────────

  describe('computed state helpers', () => {
    it('should compute completedCount correctly', () => {
      const { ctrl } = createController();
      ctrl.manifest = SAMPLE_MANIFEST;

      // 1 completed out of 3
      expect(ctrl.completedCount).toBe(1);
    });

    it('should count "pushed" as completed', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'pushed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
          { id: 'task-3', file: 'tasks/03.md', status: 'pending' },
        ],
      };

      expect(ctrl.completedCount).toBe(2);
    });

    it('should compute totalCount correctly', () => {
      const { ctrl } = createController();
      ctrl.manifest = SAMPLE_MANIFEST;
      expect(ctrl.totalCount).toBe(3);
    });

    it('should return 0 for completedCount and totalCount when manifest is null', () => {
      const { ctrl } = createController();
      expect(ctrl.completedCount).toBe(0);
      expect(ctrl.totalCount).toBe(0);
    });

    it('should report isBlocked when any task is blocked', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'blocked' },
          { id: 'task-2', file: 'tasks/02.md', status: 'pending' },
        ],
      };

      expect(ctrl.isBlocked).toBe(true);
    });

    it('should report not blocked when no task is blocked', () => {
      const { ctrl } = createController();
      ctrl.manifest = SAMPLE_MANIFEST;
      expect(ctrl.isBlocked).toBe(false);
    });

    it('should delegate isRunning to runner', () => {
      const { ctrl, runner } = createController();
      expect(ctrl.isRunning).toBe(false);

      runner.setIsRunning(true);
      expect(ctrl.isRunning).toBe(true);
    });

    it('should correctly determine canSprintStart()', () => {
      const { ctrl, runner } = createController();
      ctrl.manifest = SAMPLE_MANIFEST;

      // Sprint has pending tasks and runner is not running → can start
      expect(ctrl.canSprintStart()).toBe(true);

      // Runner is running → cannot start
      runner.setIsRunning(true);
      expect(ctrl.canSprintStart()).toBe(false);

      // No manifest → cannot start
      runner.setIsRunning(false);
      ctrl.manifest = null;
      expect(ctrl.canSprintStart()).toBe(false);
    });

    it('should not allow canSprintStart when no workable tasks', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
        ],
      };

      expect(ctrl.canSprintStart()).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Halt Event (Runner)
  // ────────────────────────────────────────────────────────────────────────

  describe('halt event handling', () => {
    it('should set blocker and stop spinner on runner "halt" event', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      // Start spinner first
      runner.emit('start');
      expect(ctrl.isSpinnerActive).toBe(true);

      runner.emit('halt', { task: 'task-1', reason: 'Agent blocked', question: 'Need guidance' });

      expect(ctrl.isSpinnerActive).toBe(false);
      expect(ctrl.activeBlocker).toEqual({
        task: 'task-1',
        reason: 'Agent blocked',
        question: 'Need guidance',
      });
      expect(ctrl.chatInput).toBe('');
      expect(ctrl.activeTab as string).toBe('activity');

      ctrl.destroy();
    });

    it('should emit "blocker-active" on halt event', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      const events: BlockRequest[] = [];
      ctrl.on('blocker-active', (data: BlockRequest) => events.push(data));

      runner.emit('halt', { task: 'task-1', reason: 'stuck', question: 'help?' });

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ task: 'task-1', reason: 'stuck', question: 'help?' });

      ctrl.destroy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Navigation
  // ────────────────────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('should switch tabs and emit tab-changed', () => {
      const { ctrl } = createController();
      const tabEvents: string[] = [];
      ctrl.on('tab-changed', (tab: string) => tabEvents.push(tab));

      ctrl.switchTab('activity');
      expect(ctrl.activeTab as string).toBe('activity');
      expect(tabEvents).toEqual(['activity']);

      // Switching to same tab is a no-op
      ctrl.switchTab('activity');
      expect(tabEvents.length).toBe(1);
    });

    it('should navigate up/down within sprint list bounds', () => {
      const { ctrl } = createController();
      ctrl.activeTab = 'sprints';
      ctrl.viewMode = 'sprints';
      ctrl.allSprints = [
        { id: 's1', name: 'Sprint 1', status: 'active', path: 'sprints/s1', tasks: [] },
        { id: 's2', name: 'Sprint 2', status: 'active', path: 'sprints/s2', tasks: [] },
        { id: 's3', name: 'Sprint 3', status: 'active', path: 'sprints/s3', tasks: [] },
      ] as SprintManifest[];
      ctrl.selectedIndex = 1;

      ctrl.navigateUp();
      expect(ctrl.selectedIndex).toBe(0);

      // Can't go below 0
      ctrl.navigateUp();
      expect(ctrl.selectedIndex).toBe(0);

      ctrl.navigateDown();
      expect(ctrl.selectedIndex).toBe(1);

      ctrl.navigateDown();
      expect(ctrl.selectedIndex).toBe(2);

      // Can't exceed list length
      ctrl.navigateDown();
      expect(ctrl.selectedIndex).toBe(2);
    });

    it('should not navigate when not on sprints tab', () => {
      const { ctrl } = createController();
      ctrl.activeTab = 'activity';
      ctrl.selectedIndex = 1;

      ctrl.navigateUp();
      expect(ctrl.selectedIndex).toBe(1);

      ctrl.navigateDown();
      expect(ctrl.selectedIndex).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Quit Confirmation
  // ────────────────────────────────────────────────────────────────────────

  describe('quit confirmation', () => {
    it('should set quitPending on first Q press', () => {
      const { ctrl } = createController();

      const result = ctrl.handleQuitPress();

      expect(result).toBe(false);
      expect(ctrl.quitPending).toBe(true);
    });

    it('should emit quit-confirmed on second Q press', () => {
      const { ctrl } = createController();

      const quitEvents: string[] = [];
      ctrl.on('quit-confirmed', () => quitEvents.push('quit'));

      ctrl.handleQuitPress(); // first
      const result = ctrl.handleQuitPress(); // second

      expect(result).toBe(true);
      expect(quitEvents.length).toBe(1);
    });

    it('should ignore Q press when blocker is active', () => {
      const { ctrl } = createController();
      ctrl.activeBlocker = { task: 'task-1', reason: 'stuck', question: 'help?' };

      const result = ctrl.handleQuitPress();

      expect(result).toBe(false);
      expect(ctrl.quitPending).toBe(false);
    });

    it('should cancel quit pending state', () => {
      const { ctrl } = createController();
      ctrl.handleQuitPress();
      expect(ctrl.quitPending).toBe(true);

      ctrl.cancelQuit();
      expect(ctrl.quitPending).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Blocker Input
  // ────────────────────────────────────────────────────────────────────────

  describe('blocker input handling', () => {
    it('should accumulate characters when blocker is active', () => {
      const { ctrl } = createController();
      ctrl.activeBlocker = { task: 'task-1', reason: 'stuck', question: 'help?' };

      ctrl.handleBlockerChar('h');
      ctrl.handleBlockerChar('i');

      expect(ctrl.chatInput).toBe('hi');
    });

    it('should ignore char input when no blocker', () => {
      const { ctrl } = createController();
      ctrl.handleBlockerChar('h');
      expect(ctrl.chatInput).toBe('');
    });

    it('should handle backspace', () => {
      const { ctrl } = createController();
      ctrl.activeBlocker = { task: 'task-1', reason: 'test', question: 'help?' };
      ctrl.chatInput = 'hello';

      ctrl.handleBlockerBackspace();
      expect(ctrl.chatInput).toBe('hell');
    });

    it('should not submit empty input', () => {
      const { ctrl } = createController();
      ctrl.activeBlocker = { task: 'task-1', reason: 'test', question: 'help?' };
      ctrl.chatInput = '   ';

      ctrl.handleBlockerSubmit();

      // Should still have blocker active because input was empty
      expect(ctrl.activeBlocker).not.toBeNull();
    });

    it('should dismiss blocker and stop runner on handleBlockerDismiss', () => {
      const { ctrl, runner } = createController();
      ctrl.activeBlocker = { task: 'task-1', reason: 'test', question: 'help?' };
      runner.setIsRunning(true);

      const stopSpy = spyOn(runner, 'stop');

      const events: string[] = [];
      ctrl.on('blocker-cleared', () => events.push('cleared'));

      ctrl.handleBlockerDismiss();

      expect(ctrl.activeBlocker).toBeNull();
      expect(ctrl.chatInput).toBe('');
      expect(stopSpy).toHaveBeenCalled();
      expect(events.length).toBe(1);

      stopSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Spinner
  // ────────────────────────────────────────────────────────────────────────

  describe('spinner', () => {
    it('should report correct spinner frame', () => {
      const { ctrl } = createController();
      ctrl.spinnerFrameIndex = 0;
      expect(ctrl.currentSpinnerFrame).toBe('⠋');

      ctrl.spinnerFrameIndex = 3;
      expect(ctrl.currentSpinnerFrame).toBe('⠸');
    });

    it('should not double-start spinner', () => {
      const { ctrl } = createController();
      ctrl.startSpinner();
      expect(ctrl.isSpinnerActive).toBe(true);

      // Second call should be a no-op
      ctrl.startSpinner();
      expect(ctrl.isSpinnerActive).toBe(true);

      ctrl.stopSpinner();
      expect(ctrl.isSpinnerActive).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Static Lookups
  // ────────────────────────────────────────────────────────────────────────

  describe('static lookups', () => {
    it('should provide correct STATUS_ICONS', () => {
      expect(DashboardController.STATUS_ICONS.completed).toBe('✅');
      expect(DashboardController.STATUS_ICONS.active).toBe('🔄');
      expect(DashboardController.STATUS_ICONS.pending).toBe('⏳');
      expect(DashboardController.STATUS_ICONS.blocked).toBe('🛑');
      expect(DashboardController.STATUS_ICONS.pushed).toBe('📤');
    });

    it('should provide correct STATUS_LABELS', () => {
      expect(DashboardController.STATUS_LABELS.completed).toBe('Complete');
      expect(DashboardController.STATUS_LABELS.pending).toBe('Pending');
      expect(DashboardController.STATUS_LABELS.active).toBe('Active');
      expect(DashboardController.STATUS_LABELS.blocked).toBe('Blocked');
      expect(DashboardController.STATUS_LABELS.pushed).toBe('Published');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Sprint Approval
  // ────────────────────────────────────────────────────────────────────────

  describe('sprint approval', () => {
    it('canSprintApprove() returns false when no manifest', () => {
      const { ctrl } = createController();
      ctrl.manifest = null;
      expect(ctrl.canSprintApprove()).toBe(false);
    });

    it('canSprintApprove() returns false when running', () => {
      const { ctrl, runner } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
        ],
      };
      runner.setIsRunning(true);
      expect(ctrl.canSprintApprove()).toBe(false);
    });

    it('canSprintApprove() returns false when tasks are pending', () => {
      const { ctrl } = createController();
      ctrl.manifest = SAMPLE_MANIFEST; // has pending tasks
      expect(ctrl.canSprintApprove()).toBe(false);
    });

    it('canSprintApprove() returns true when all tasks completed', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
          { id: 'task-3', file: 'tasks/03.md', status: 'pushed' },
        ],
      };
      expect(ctrl.canSprintApprove()).toBe(true);
    });

    it('canSprintApprove() returns false when sprint already completed', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        status: 'completed',
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
        ],
      };
      expect(ctrl.canSprintApprove()).toBe(false);
    });

    it('canSprintApprove() returns false when tasks array is empty', () => {
      const { ctrl } = createController();
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [],
      };
      expect(ctrl.canSprintApprove()).toBe(false);
    });

    it('approveSprint() writes manifest and logs success', () => {
      const writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';
      ctrl.manifest = {
        id: 'sprint-test',
        name: 'Test Sprint',
        status: 'active',
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
          { id: 'task-2', file: 'tasks/02.md', status: 'completed' },
        ],
      };

      // Mock loadManifest to prevent it from overwriting our test manifest
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify({
        ...ctrl.manifest,
        status: 'completed',
      }));

      ctrl.approveSprint();

      expect(writeFileSyncSpy).toHaveBeenCalled();
      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string) as Manifest;
      expect(writtenData.status).toBe('completed');

      const approvalLog = ctrl.activityLogs.find(l => l.message.includes('Sprint approved'));
      expect(approvalLog).toBeDefined();
      expect(approvalLog!.type).toBe('success');

      writeFileSyncSpy.mockRestore();
      ctrl.destroy();
    });

    it('approveSprint() does nothing when viewMode is sprints', () => {
      const writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const { ctrl } = createController();
      ctrl.viewMode = 'sprints';
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
        ],
      };

      ctrl.approveSprint();

      expect(writeFileSyncSpy).not.toHaveBeenCalled();

      writeFileSyncSpy.mockRestore();
    });

    it('approveSprint() does nothing when runner is running', () => {
      const writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const { ctrl, runner } = createController();
      ctrl.viewMode = 'tasks';
      ctrl.manifest = {
        ...SAMPLE_MANIFEST,
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
        ],
      };
      runner.setIsRunning(true);

      ctrl.approveSprint();

      expect(writeFileSyncSpy).not.toHaveBeenCalled();

      writeFileSyncSpy.mockRestore();
    });

    it('approveSprint() logs error on filesystem failure', () => {
      const writeFileSyncSpy = spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const { ctrl } = createController();
      ctrl.init();
      ctrl.viewMode = 'tasks';
      ctrl.manifest = {
        id: 'sprint-test',
        name: 'Test Sprint',
        status: 'active',
        tasks: [
          { id: 'task-1', file: 'tasks/01.md', status: 'completed' },
        ],
      };

      ctrl.approveSprint();

      const errorLog = ctrl.activityLogs.find(l => l.message.includes('Failed to approve sprint'));
      expect(errorLog).toBeDefined();
      expect(errorLog!.type).toBe('error');

      writeFileSyncSpy.mockRestore();
      ctrl.destroy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Lifecycle (init/destroy)
  // ────────────────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should add init log on init()', () => {
      const { ctrl } = createController();
      ctrl.init();

      expect(ctrl.activityLogs.length).toBeGreaterThanOrEqual(1);
      const initLog = ctrl.activityLogs.find(l => l.message === 'Dashboard initialized');
      expect(initLog).toBeDefined();
      expect(initLog!.type).toBe('info');

      ctrl.destroy();
    });

    it('should clean up all intervals on destroy()', () => {
      const { ctrl, runner } = createController();
      ctrl.init();

      // Start spinner
      runner.emit('start');
      expect(ctrl.isSpinnerActive).toBe(true);

      ctrl.destroy();

      expect(ctrl.isSpinnerActive).toBe(false);
    });
  });
});
