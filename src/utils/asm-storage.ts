import fs from 'fs';
import path from 'path';

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

function getAsmFilePath() {
  return process.env.CLIFFORD_ASM_PATH || path.resolve('.clifford/asm.json');
}

function ensureAsmFile() {
  const filePath = getAsmFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Ignore
    }
  }
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify({ tasks: {} }, null, 2), 'utf8');
    } catch {
      // Ignore
    }
  }
}

/**
 * Saves a memory for a specific task.
 */
export function saveMemory(taskId: string, question: string, answer: string) {
  ensureAsmFile();
  const filePath = getAsmFilePath();
  let data: ASMStorage;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(content || '{"tasks":{}}');
    if (!data || typeof data !== 'object' || !data.tasks) {
      data = { tasks: {} };
    }
  } catch {
    data = { tasks: {} };
  }
  
  data.tasks[taskId] = {
    question,
    answer,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Retrieves a memory for a specific task.
 */
export function getMemory(taskId: string): ASMMemory | null {
  const filePath = getAsmFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data: ASMStorage = JSON.parse(content);
    return (data && data.tasks && data.tasks[taskId]) || null;
  } catch {
    return null;
  }
}

/**
 * Clears memory for a specific task.
 */
export function clearMemory(taskId: string) {
  const filePath = getAsmFilePath();
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data: ASMStorage = JSON.parse(content);
    if (data && data.tasks && data.tasks[taskId]) {
      delete data.tasks[taskId];
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch {
    // Ignore
  }
}
