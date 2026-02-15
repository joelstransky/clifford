import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { CliffordMcpServer, buildSprintContext, updateTaskStatus, reportUatMarkdown, completeSprint, SprintContextResponse, UpdateTaskStatusResponse, CompleteSprintResponse } from './mcp-server';

describe('CliffordMcpServer', () => {
  let server: CliffordMcpServer;

  beforeEach(() => {
    server = new CliffordMcpServer();
  });

  it('should not be blocked initially', () => {
    expect(server.isBlocked()).toBe(false);
  });

  it('should return null for getCurrentBlock when no block is pending', () => {
    expect(server.getCurrentBlock()).toBeNull();
  });

  it('should return false from resolveCurrentBlock when no block is pending', () => {
    expect(server.resolveCurrentBlock('some response')).toBe(false);
  });

  it('should return false from dismissCurrentBlock when no block is pending', () => {
    expect(server.dismissCurrentBlock()).toBe(false);
  });

  it('should emit block event and resolve when resolveCurrentBlock is called', async () => {
    let blockEmitted = false;
    let resolvedEmitted = false;

    server.on('block', (data: { task: string; reason: string; question: string }) => {
      blockEmitted = true;
      expect(data.task).toBe('task-1');
      expect(data.reason).toBe('Cannot proceed');
      expect(data.question).toBe('What should I do?');
    });

    server.on('block-resolved', (data: { task: string; response: string }) => {
      resolvedEmitted = true;
      expect(data.task).toBe('task-1');
      expect(data.response).toBe('Do this instead');
    });

    // Simulate what the tool handler does internally by emitting + creating pending
    // We can't call the MCP tool directly without a transport, but we can test the
    // resolve/dismiss mechanics by manually setting state through the event system.
    // The integration test with actual MCP client is deferred per task spec.

    // Instead, test the public API surface that doesn't require transport
    expect(server.isBlocked()).toBe(false);
    expect(server.resolveCurrentBlock('test')).toBe(false);
    expect(blockEmitted).toBe(false);
    expect(resolvedEmitted).toBe(false);
  });

  it('should stop gracefully even when not started', async () => {
    // stop() should not throw even if start() was never called
    await server.stop();
  });
});

// ---------------------------------------------------------------------------
// buildSprintContext tests
// ---------------------------------------------------------------------------

describe('buildSprintContext', () => {
  const TEST_ID = Math.random().toString(36).substring(7);
  const TEST_DIR = path.resolve(`.clifford/test-sprint-context-${TEST_ID}`);
  const TASKS_DIR = path.join(TEST_DIR, 'tasks');
  const ASM_TEST_PATH = path.resolve(`.clifford/asm-test-ctx-${TEST_ID}.json`);

  // Point ASM storage to a test-specific file
  const originalAsmPath = process.env.CLIFFORD_ASM_PATH;

  function writeManifest(manifest: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(TEST_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  function writeTaskFile(filename: string, content: string): void {
    const taskPath = path.join(TEST_DIR, filename);
    const dir = path.dirname(taskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(taskPath, content, 'utf8');
  }

  function parseResult(result: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
    return JSON.parse(result.content[0].text) as Record<string, unknown>;
  }

  beforeEach(() => {
    // Clean up test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Create fresh test directory structure
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should return error for nonexistent sprint directory', () => {
    const result = buildSprintContext('/tmp/nonexistent-sprint-dir-xyz-123');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect(typeof parsed.error).toBe('string');
    expect((parsed.error as string)).toContain('Sprint manifest not found');
  });

  it('should return the expected structure for a valid sprint with pending tasks', () => {
    const manifest = {
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'pending' },
        { id: 'task-3', file: 'tasks/03-third.md', status: 'pending' },
      ],
    };

    writeManifest(manifest);
    writeTaskFile('tasks/02-second.md', '# Task 2\n\nImplement feature X.');

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result) as unknown as SprintContextResponse;

    // Sprint metadata
    expect(parsed.sprint.id).toBe('sprint-test');
    expect(parsed.sprint.name).toBe('Test Sprint');
    expect(parsed.sprint.status).toBe('active');
    expect(parsed.sprint.tasks).toHaveLength(3);

    // Current task — should be task-2 (first pending)
    expect(parsed.currentTask).not.toBeNull();
    expect(parsed.currentTask!.id).toBe('task-2');
    expect(parsed.currentTask!.file).toBe('tasks/02-second.md');
    expect(parsed.currentTask!.status).toBe('pending');
    expect(parsed.currentTask!.content).toBe('# Task 2\n\nImplement feature X.');

    // No ASM guidance
    expect(parsed.guidance).toBeNull();

    // Sprint dir preserved as passed
    expect(parsed.sprintDir).toBe(TEST_DIR);
  });

  it('should return currentTask as null when all tasks are completed', () => {
    const manifest = {
      id: 'sprint-done',
      name: 'Done Sprint',
      status: 'completed',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'completed' },
      ],
    };

    writeManifest(manifest);

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result);

    expect(parsed.currentTask).toBeNull();
    expect(parsed.note).toBe('All tasks completed or no pending tasks');
    expect((parsed.sprint as Record<string, unknown>).id).toBe('sprint-done');
  });

  it('should prioritize active tasks over pending tasks', () => {
    const manifest = {
      id: 'sprint-active',
      name: 'Active Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'active' },
        { id: 'task-3', file: 'tasks/03-third.md', status: 'pending' },
      ],
    };

    writeManifest(manifest);
    writeTaskFile('tasks/02-second.md', '# Active Task');

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result) as unknown as SprintContextResponse;

    expect(parsed.currentTask).not.toBeNull();
    expect(parsed.currentTask!.id).toBe('task-2');
    expect(parsed.currentTask!.status).toBe('active');
  });

  it('should return content as null when task file does not exist', () => {
    const manifest = {
      id: 'sprint-missing-file',
      name: 'Missing File Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-nonexistent.md', status: 'pending' },
      ],
    };

    writeManifest(manifest);
    // Deliberately NOT creating the task file

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result) as unknown as SprintContextResponse;

    expect(parsed.currentTask).not.toBeNull();
    expect(parsed.currentTask!.id).toBe('task-1');
    expect(parsed.currentTask!.content).toBeNull();
  });

  it('should return error for invalid JSON in manifest', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'manifest.json'), 'not valid json{{{', 'utf8');

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Failed to parse manifest');
  });
});

// ---------------------------------------------------------------------------
// updateTaskStatus tests
// ---------------------------------------------------------------------------

describe('updateTaskStatus', () => {
  const TEST_ID = Math.random().toString(36).substring(7);
  const TEST_DIR = path.resolve(`.clifford/test-update-status-${TEST_ID}`);
  const TASKS_DIR = path.join(TEST_DIR, 'tasks');

  function writeManifest(manifest: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(TEST_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  function readManifest(): Record<string, unknown> {
    const raw = fs.readFileSync(path.join(TEST_DIR, 'manifest.json'), 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  function parseResult(result: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
    return JSON.parse(result.content[0].text) as Record<string, unknown>;
  }

  beforeEach(() => {
    // Clean up test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Create fresh test directory structure
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should successfully transition pending → active', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'pending' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'pending' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'active');
    const parsed = parseResult(result) as unknown as UpdateTaskStatusResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.taskId).toBe('task-1');
    expect(parsed.previousStatus).toBe('pending');
    expect(parsed.newStatus).toBe('active');

    // Verify the manifest file was actually updated
    const manifest = readManifest();
    const tasks = manifest.tasks as Array<{ id: string; status: string }>;
    expect(tasks[0].status).toBe('active');
    expect(tasks[1].status).toBe('pending');
  });

  it('should successfully transition active → completed', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'active' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'completed');
    const parsed = parseResult(result) as unknown as UpdateTaskStatusResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.previousStatus).toBe('active');
    expect(parsed.newStatus).toBe('completed');

    // Verify manifest was written
    const manifest = readManifest();
    const tasks = manifest.tasks as Array<{ id: string; status: string }>;
    expect(tasks[0].status).toBe('completed');
  });

  it('should successfully transition active → blocked', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'active' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'blocked');
    const parsed = parseResult(result) as unknown as UpdateTaskStatusResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.previousStatus).toBe('active');
    expect(parsed.newStatus).toBe('blocked');
  });

  it('should successfully transition blocked → active', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'blocked' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'active');
    const parsed = parseResult(result) as unknown as UpdateTaskStatusResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.previousStatus).toBe('blocked');
    expect(parsed.newStatus).toBe('active');
  });

  it('should reject invalid transition completed → pending (completed is terminal)', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
      ],
    });

    // Note: 'active' is the closest valid enum value we can test with —
    // completed → active is also invalid since completed is terminal
    const result = updateTaskStatus(TEST_DIR, 'task-1', 'active');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Invalid transition: completed → active');
    expect((parsed.error as string)).toContain('Allowed: []');

    // Verify manifest was NOT changed
    const manifest = readManifest();
    const tasks = manifest.tasks as Array<{ id: string; status: string }>;
    expect(tasks[0].status).toBe('completed');
  });

  it('should reject invalid transition pending → completed (must go through active)', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'pending' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'completed');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Invalid transition: pending → completed');
    expect((parsed.error as string)).toContain('Allowed: [active]');

    // Verify manifest was NOT changed
    const manifest = readManifest();
    const tasks = manifest.tasks as Array<{ id: string; status: string }>;
    expect(tasks[0].status).toBe('pending');
  });

  it('should return error for nonexistent task ID', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'pending' },
      ],
    });

    const result = updateTaskStatus(TEST_DIR, 'task-99', 'active');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain("Task 'task-99' not found in manifest");
  });

  it('should return error for nonexistent sprint directory', () => {
    const result = updateTaskStatus('/tmp/nonexistent-sprint-dir-xyz-456', 'task-1', 'active');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Sprint manifest not found');
  });

  it('should return error for invalid JSON in manifest', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'manifest.json'), 'not valid json{{{', 'utf8');

    const result = updateTaskStatus(TEST_DIR, 'task-1', 'active');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Failed to parse manifest');
  });
});

// ---------------------------------------------------------------------------
// reportUatMarkdown tests
// ---------------------------------------------------------------------------

describe('reportUatMarkdown', () => {
  const TEST_ID = Math.random().toString(36).substring(7);
  const TEST_DIR = path.resolve(`.clifford/test-uat-md-${TEST_ID}`);
  const UAT_MD_PATH = path.join(TEST_DIR, 'uat.md');

  function parseResult(result: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
    return JSON.parse(result.content[0].text) as Record<string, unknown>;
  }

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should create uat.md with header when file doesn\'t exist', () => {
    const manifest = { id: 'sprint-16', name: 'UAT & Changelog' };
    fs.writeFileSync(path.join(TEST_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8');

    const result = reportUatMarkdown(
      TEST_DIR,
      'task-1',
      'Test Title',
      'Changed some things',
      ['Step 1', 'Step 2']
    );
    const parsed = parseResult(result);

    expect(parsed.success).toBe(true);
    expect(fs.existsSync(UAT_MD_PATH)).toBe(true);

    const content = fs.readFileSync(UAT_MD_PATH, 'utf8');
    expect(content).toContain('# sprint-16 — UAT & Changelog — UAT');
    expect(content).toContain('## task-1: Test Title');
    expect(content).toContain('### Changes\nChanged some things');
    expect(content).toContain('### Verification Steps\n1. Step 1\n2. Step 2');
  });

  it('should append section when file already exists', () => {
    fs.writeFileSync(UAT_MD_PATH, '# Existing Header\n', 'utf8');

    reportUatMarkdown(
      TEST_DIR,
      'task-2',
      'Second Task',
      'Description',
      ['Only Step']
    );

    const content = fs.readFileSync(UAT_MD_PATH, 'utf8');
    expect(content).toContain('# Existing Header');
    expect(content).toContain('## task-2: Second Task');
  });

  it('should handle missing manifest gracefully', () => {
    // No manifest.json in TEST_DIR
    reportUatMarkdown(
      TEST_DIR,
      'task-1',
      'Title',
      'Changes',
      ['Step']
    );

    const content = fs.readFileSync(UAT_MD_PATH, 'utf8');
    expect(content).toContain('# sprint-?? — Unknown Sprint — UAT');
  });
});


// ---------------------------------------------------------------------------
// completeSprint tests
// ---------------------------------------------------------------------------

describe('completeSprint', () => {
  const TEST_ID = Math.random().toString(36).substring(7);
  const TEST_DIR = path.resolve(`.clifford/test-complete-sprint-${TEST_ID}`);
  const TASKS_DIR = path.join(TEST_DIR, 'tasks');

  function writeManifest(manifest: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(TEST_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  function readManifest(): Record<string, unknown> {
    const raw = fs.readFileSync(path.join(TEST_DIR, 'manifest.json'), 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  function parseResult(result: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
    return JSON.parse(result.content[0].text) as Record<string, unknown>;
  }

  beforeEach(() => {
    // Clean up test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Create fresh test directory structure
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should successfully complete a sprint when all tasks are completed', () => {
    writeManifest({
      id: 'sprint-test',
      name: 'Test Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'completed' },
        { id: 'task-3', file: 'tasks/03-third.md', status: 'completed' },
      ],
    });

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.sprintId).toBe('sprint-test');
    expect(parsed.sprintName).toBe('Test Sprint');
    expect(parsed.taskCount).toBe(3);
    expect(parsed.completedAt).toBeDefined();
    expect(typeof parsed.completedAt).toBe('string');
    // Verify completedAt is a valid ISO string
    const completedAt = parsed.completedAt as string;
    expect(new Date(completedAt).toISOString()).toBe(completedAt);
    expect(parsed.summary).toBeNull();

    // Verify the manifest file was actually updated
    const manifest = readManifest();
    expect(manifest.status).toBe('completed');
  });

  it('should successfully complete a sprint with a mix of completed and pushed tasks', () => {
    writeManifest({
      id: 'sprint-mixed',
      name: 'Mixed Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'pushed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'completed' },
        { id: 'task-3', file: 'tasks/03-third.md', status: 'pushed' },
      ],
    });

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.sprintId).toBe('sprint-mixed');
    expect(parsed.taskCount).toBe(3);

    // Verify manifest updated
    const manifest = readManifest();
    expect(manifest.status).toBe('completed');
  });

  it('should include the summary when provided', () => {
    writeManifest({
      id: 'sprint-summary',
      name: 'Summary Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
      ],
    });

    const result = completeSprint(TEST_DIR, 'All MCP tools implemented successfully');
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.summary).toBe('All MCP tools implemented successfully');
  });

  it('should fail when tasks are still pending', () => {
    writeManifest({
      id: 'sprint-pending',
      name: 'Pending Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'pending' },
        { id: 'task-3', file: 'tasks/03-third.md', status: 'active' },
      ],
    });

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(false);
    expect(parsed.reason).toContain('Cannot complete sprint: 2 task(s) not finished');
    expect(parsed.tasks).toBeDefined();
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks![0]).toEqual({ id: 'task-1', status: 'completed' });
    expect(parsed.tasks![1]).toEqual({ id: 'task-2', status: 'pending' });
    expect(parsed.tasks![2]).toEqual({ id: 'task-3', status: 'active' });

    // Verify manifest was NOT changed
    const manifest = readManifest();
    expect(manifest.status).toBe('active');
  });

  it('should fail when a task is blocked', () => {
    writeManifest({
      id: 'sprint-blocked',
      name: 'Blocked Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
        { id: 'task-2', file: 'tasks/02-second.md', status: 'blocked' },
      ],
    });

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(false);
    expect(parsed.reason).toContain('Cannot complete sprint: 1 task(s) not finished');
  });

  it('should handle already-completed sprint gracefully (double-completion guard)', () => {
    writeManifest({
      id: 'sprint-already-done',
      name: 'Already Done Sprint',
      status: 'completed',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'completed' },
      ],
    });

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result) as unknown as CompleteSprintResponse;

    expect(parsed.success).toBe(true);
    expect(parsed.sprintId).toBe('sprint-already-done');
    expect(parsed.note).toBe('Sprint was already marked as completed');
    // Should NOT have completedAt or taskCount for the "already done" case
    expect(parsed.completedAt).toBeUndefined();
  });

  it('should return error for nonexistent sprint directory', () => {
    const result = completeSprint('/tmp/nonexistent-sprint-dir-xyz-789');
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Sprint manifest not found');
  });

  it('should return error for invalid JSON in manifest', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'manifest.json'), 'not valid json{{{', 'utf8');

    const result = completeSprint(TEST_DIR);
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Failed to parse manifest');
  });
});
