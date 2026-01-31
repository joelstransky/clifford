import fs from 'fs';
import { analyzeSprintRequirements, checkMissingSkills, fetchSkillDefinition } from './skills';
import { isCommandAvailable } from './discovery';

jest.mock('fs');
jest.mock('./discovery');

describe('skills', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const mockedIsCommandAvailable = isCommandAvailable as jest.MockedFunction<typeof isCommandAvailable>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSprintRequirements', () => {
    it('should extract skills from tasks files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      // Use a more specific mock to avoid type issues with overloads
      (mockedFs.readdirSync as jest.Mock).mockReturnValue(['task1.md', 'task2.md']);
      (mockedFs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('task1.md')) {
          return `
# Task 1
## Required Skills
- git
- npm
`;
        }
        if (filePath.endsWith('task2.md')) {
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
      mockedFs.existsSync.mockReturnValue(false);
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
      mockedIsCommandAvailable.mockImplementation((cmd: string) => {
        return cmd === 'git'; // only git is installed
      });

      const missing = await checkMissingSkills(['git', 'npm', 'docker']);
      expect(missing.map((m) => m.name)).toEqual(['npm', 'docker']);
      expect(missing[0].installCommand).toBe('curl -L https://www.npmjs.com/install.sh | sh');
    });
  });
});
