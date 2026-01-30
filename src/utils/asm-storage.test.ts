import { saveMemory, getMemory } from './asm-storage';
import fs from 'fs';
import path from 'path';

describe('ASM Storage', () => {
  const ASM_FILE_PATH = path.resolve('.clifford/asm.json');

  beforeEach(() => {
    if (fs.existsSync(ASM_FILE_PATH)) {
      fs.unlinkSync(ASM_FILE_PATH);
    }
  });

  afterAll(() => {
    if (fs.existsSync(ASM_FILE_PATH)) {
      fs.unlinkSync(ASM_FILE_PATH);
    }
  });

  it('should save and retrieve memory', () => {
    const taskId = 'test-task';
    const question = 'What is the passcode?';
    const answer = 'SUCCESS';

    saveMemory(taskId, question, answer);
    const memory = getMemory(taskId);

    expect(memory).toBeDefined();
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
});
