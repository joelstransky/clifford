import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import fs from 'fs';
import { analyzeSprintRequirements, checkMissingSkills, fetchSkillDefinition } from './skills';
import * as discovery from './discovery';

describe('skills', () => {
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readdirSyncSpy: ReturnType<typeof spyOn>;
  let readFileSyncSpy: ReturnType<typeof spyOn>;
  let isCommandAvailableSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    existsSyncSpy = spyOn(fs, 'existsSync');
    readdirSyncSpy = spyOn(fs, 'readdirSync');
    readFileSyncSpy = spyOn(fs, 'readFileSync');
    isCommandAvailableSpy = spyOn(discovery, 'isCommandAvailable');
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    readdirSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
    isCommandAvailableSpy.mockRestore();
  });

  describe('analyzeSprintRequirements', () => {
    it('should extract skills from tasks files', () => {
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue(['task1.md', 'task2.md'] as unknown as fs.Dirent[]);
      readFileSyncSpy.mockImplementation((filePath: string | Buffer | number | URL) => {
        if (typeof filePath === 'string' && filePath.endsWith('task1.md')) {
          return `
# Task 1
## Required Skills
- git
- npm
`;
        }
        if (typeof filePath === 'string' && filePath.endsWith('task2.md')) {
          return `
# Task 2
## Required Skills
* docker
`;
        }
        return '';
      });

      const skills = analyzeSprintRequirements('/mock/sprint');
      expect(skills).toContain('git');
      expect(skills).toContain('npm');
      expect(skills).toContain('docker');
      expect(skills.length).toBe(3);
    });

    it('should return empty if tasks directory does not exist', () => {
      existsSyncSpy.mockReturnValue(false);
      const skills = analyzeSprintRequirements('/mock/sprint');
      expect(skills).toEqual([]);
    });
  });

  describe('fetchSkillDefinition', () => {
    it('should return mock definition for known skills', async () => {
      const git = await fetchSkillDefinition('git');
      expect(git.name).toBe('git');
      expect(git.installCommand).toBe('sudo apt-get install git');
    });

    it('should return generic message for unknown skills', async () => {
      const unknown = await fetchSkillDefinition('unknown-skill');
      expect(unknown.installCommand).toContain('manually');
    });
  });

  describe('checkMissingSkills', () => {
    it('should return missing skills', async () => {
      isCommandAvailableSpy.mockImplementation((cmd: string) => {
        return cmd === 'git'; // only git is installed
      });

      const missing = await checkMissingSkills(['git', 'npm', 'docker']);
      expect(missing.map((m) => m.name)).toEqual(['npm', 'docker']);
      expect(missing[0].installCommand).toBe('curl -L https://www.npmjs.com/install.sh | sh');
    });
  });
});
