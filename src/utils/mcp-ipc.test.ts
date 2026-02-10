import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  writeBlockFile,
  writeResponseFile,
  readBlockFile,
  cleanupMcpFiles,
} from './mcp-ipc';

describe('mcp-ipc', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-ipc-test-'));
    // Create the .clifford directory that IPC functions expect
    fs.mkdirSync(path.join(tempDir, '.clifford'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('writeBlockFile', () => {
    it('should create a block file with correct structure', () => {
      writeBlockFile(tempDir, 'task-1', 'stuck', 'What to do?');

      const filePath = path.join(tempDir, '.clifford', 'mcp-block.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(data.type).toBe('block');
      expect(data.task).toBe('task-1');
      expect(data.reason).toBe('stuck');
      expect(data.question).toBe('What to do?');
      expect(data.timestamp).toBeDefined();
    });

    it('should create .clifford directory if missing', () => {
      const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-ipc-bare-'));
      // No .clifford directory exists

      writeBlockFile(bareDir, 'task-2', 'reason', 'question');

      const filePath = path.join(bareDir, '.clifford', 'mcp-block.json');
      expect(fs.existsSync(filePath)).toBe(true);

      fs.rmSync(bareDir, { recursive: true, force: true });
    });
  });

  describe('readBlockFile', () => {
    it('should return null when no block file exists', () => {
      const result = readBlockFile(tempDir);
      expect(result).toBeNull();
    });

    it('should read an existing block file', () => {
      writeBlockFile(tempDir, 'task-3', 'help needed', 'How to proceed?');

      const result = readBlockFile(tempDir);
      expect(result).not.toBeNull();
      expect(result!.task).toBe('task-3');
      expect(result!.reason).toBe('help needed');
      expect(result!.question).toBe('How to proceed?');
    });

    it('should return null for malformed JSON', () => {
      const filePath = path.join(tempDir, '.clifford', 'mcp-block.json');
      fs.writeFileSync(filePath, 'invalid json {{', 'utf8');

      const result = readBlockFile(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('writeResponseFile', () => {
    it('should create a response file with correct structure', () => {
      writeResponseFile(tempDir, 'Use approach B');

      const filePath = path.join(tempDir, '.clifford', 'mcp-response.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(data.response).toBe('Use approach B');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('cleanupMcpFiles', () => {
    it('should remove both block and response files', () => {
      writeBlockFile(tempDir, 'task-1', 'reason', 'question');
      writeResponseFile(tempDir, 'answer');

      const blockPath = path.join(tempDir, '.clifford', 'mcp-block.json');
      const responsePath = path.join(tempDir, '.clifford', 'mcp-response.json');

      expect(fs.existsSync(blockPath)).toBe(true);
      expect(fs.existsSync(responsePath)).toBe(true);

      cleanupMcpFiles(tempDir);

      expect(fs.existsSync(blockPath)).toBe(false);
      expect(fs.existsSync(responsePath)).toBe(false);
    });

    it('should not throw when files do not exist', () => {
      // Should not throw
      cleanupMcpFiles(tempDir);
    });
  });

  describe('pollForResponse (integration)', () => {
    it('should resolve when response file is written', async () => {
      // Import dynamically to avoid top-level issues
      const { pollForResponse } = await import('./mcp-ipc');

      // Start polling
      const pollPromise = pollForResponse(tempDir);

      // Write the response file after a short delay
      setTimeout(() => {
        writeResponseFile(tempDir, 'The answer is 42');
      }, 100);

      const result = await pollPromise;
      expect(result).toBe('The answer is 42');

      // Both files should be cleaned up
      const blockPath = path.join(tempDir, '.clifford', 'mcp-block.json');
      const responsePath = path.join(tempDir, '.clifford', 'mcp-response.json');
      expect(fs.existsSync(responsePath)).toBe(false);
    });
  });
});
