import fs from 'fs';
import path from 'path';

const ASM_FILE_PATH = path.resolve('.clifford/asm.json');

export interface ASMMemory {
  question: string;
  answer: string;
  timestamp: string;
}

export interface ASMStorage {
  tasks: {
    [taskId: string]: ASMMemory;
  };
}

function ensureAsmFile() {
  const dir = path.dirname(ASM_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ASM_FILE_PATH)) {
    fs.writeFileSync(ASM_FILE_PATH, JSON.stringify({ tasks: {} }, null, 2), 'utf8');
  }
}

/**
 * Saves a memory for a specific task.
 * @param taskId The ID of the task.
 * @param question The question asked.
 * @param answer The answer provided.
 */
export function saveMemory(taskId: string, question: string, answer: string) {
  ensureAsmFile();
  const content = fs.readFileSync(ASM_FILE_PATH, 'utf8');
  const data: ASMStorage = JSON.parse(content);
  
  data.tasks[taskId] = {
    question,
    answer,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(ASM_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Retrieves a memory for a specific task.
 * @param taskId The ID of the task.
 * @returns The memory or null if not found.
 */
export function getMemory(taskId: string): ASMMemory | null {
  ensureAsmFile();
  const content = fs.readFileSync(ASM_FILE_PATH, 'utf8');
  const data: ASMStorage = JSON.parse(content);
  
  return data.tasks[taskId] || null;
}

/**
 * Clears memory for a specific task.
 * @param taskId The ID of the task.
 */
export function clearMemory(taskId: string) {
  ensureAsmFile();
  const content = fs.readFileSync(ASM_FILE_PATH, 'utf8');
  const data: ASMStorage = JSON.parse(content);
  
  if (data.tasks[taskId]) {
    delete data.tasks[taskId];
    fs.writeFileSync(ASM_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  }
}
