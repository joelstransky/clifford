import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { saveMemory, getMemory, clearMemory } from './asm-storage';
import fs from 'fs';
import path from 'path';

describe('ASM Storage', () => {
  const TEST_ID = Math.random().toString(36).substring(7);
  const ASM_FILE_PATH = path.resolve(`.clifford/asm-test-${TEST_ID}.json`);

  // Set the environment variable before any tests run
  process.env.CLIFFORD_ASM_PATH = ASM_FILE_PATH;

  beforeEach(() => {
    if (fs.existsSync(ASM_FILE_PATH)) {
      try {
        fs.rmSync(ASM_FILE_PATH, { force: true });
      } catch {
        // Ignore
      }
    }
  });

  afterAll(() => {
    if (fs.existsSync(ASM_FILE_PATH)) {
      try {
        fs.rmSync(ASM_FILE_PATH, { force: true });
      } catch {
        // Ignore
      }
    }
  });

  it('should save and retrieve memory', () => {
    const taskId = 'test-task';
    const question = 'What is the passcode?';
    const answer = 'SUCCESS';

    saveMemory(taskId, question, answer);
    const memory = getMemory(taskId);

    expect(memory).not.toBeNull();
    expect(memory?.question).toBe(question);
    expect(memory?.answer).toBe(answer);
    expect(memory?.timestamp).toBeDefined();
  });

  it('should return null for non-existent task', () => {
    const memory = getMemory('non-existent');
    expect(memory).toBeNull();
  });

  it('should overwrite memory for the same task', () => {
    const taskId = 'test-task';
    saveMemory(taskId, 'Q1', 'A1');
    saveMemory(taskId, 'Q2', 'A2');

    const memory = getMemory(taskId);
    expect(memory?.question).toBe('Q2');
    expect(memory?.answer).toBe('A2');
  });

  it('should clear memory for a task', () => {
    const taskId = 'test-task';
    saveMemory(taskId, 'Q1', 'A1');
    expect(getMemory(taskId)).not.toBeNull();

    clearMemory(taskId);
    expect(getMemory(taskId)).toBeNull();
  });
});
