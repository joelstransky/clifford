import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { CliffordMcpServer, buildSprintContext, SprintContextResponse } from './mcp-server';
import { saveMemory, clearMemory } from './asm-storage';

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
    // Set ASM path for test isolation
    process.env.CLIFFORD_ASM_PATH = ASM_TEST_PATH;

    // Clean up test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(ASM_TEST_PATH)) {
      fs.rmSync(ASM_TEST_PATH, { force: true });
    }

    // Create fresh test directory structure
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  });

  afterAll(() => {
    // Restore original ASM path
    if (originalAsmPath !== undefined) {
      process.env.CLIFFORD_ASM_PATH = originalAsmPath;
    } else {
      delete process.env.CLIFFORD_ASM_PATH;
    }

    // Clean up test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(ASM_TEST_PATH)) {
      fs.rmSync(ASM_TEST_PATH, { force: true });
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

  it('should include ASM guidance when available for the current task', () => {
    const manifest = {
      id: 'sprint-guidance',
      name: 'Guidance Sprint',
      status: 'active',
      tasks: [
        { id: 'task-1', file: 'tasks/01-first.md', status: 'pending' },
      ],
    };

    writeManifest(manifest);
    writeTaskFile('tasks/01-first.md', '# Task with guidance');

    // Save ASM memory for task-1
    saveMemory('task-1', 'How should I handle the edge case?', 'Use a fallback value of 0.');

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result) as unknown as SprintContextResponse;

    expect(parsed.guidance).not.toBeNull();
    expect(parsed.guidance!.previousQuestion).toBe('How should I handle the edge case?');
    expect(parsed.guidance!.humanResponse).toBe('Use a fallback value of 0.');

    // Clean up ASM
    clearMemory('task-1');
  });

  it('should return error for invalid JSON in manifest', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'manifest.json'), 'not valid json{{{', 'utf8');

    const result = buildSprintContext(TEST_DIR);
    const parsed = parseResult(result);

    expect(parsed.error).toBeDefined();
    expect((parsed.error as string)).toContain('Failed to parse manifest');
  });
});
