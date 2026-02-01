import fs from 'fs';
import path from 'path';
import { isCommandAvailable } from './discovery.js';

export interface Skill {
  name: string;
  installCommand: string;
}

/**
 * Reads all .md files in the tasks/ subdirectory of the sprint and extracts required skills.
 * Extracts skills from a `## Required Skills` section.
 */
export function analyzeSprintRequirements(sprintPath: string): string[] {
  const tasksDir = path.join(sprintPath, 'tasks');
  if (!fs.existsSync(tasksDir)) return [];

  const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.md'));
  const skills = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    const lines = content.split('\n');
    let inSkillsSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('## Required Skills')) {
        inSkillsSection = true;
        continue;
      }
      if (inSkillsSection) {
        if (trimmedLine.startsWith('##')) {
          inSkillsSection = false;
          continue;
        }
        // Match bullet points: - git or * npm
        const match = trimmedLine.match(/^[-*]\s+(.+)$/);
        if (match) {
          skills.add(match[1].trim());
        }
      }
    }
  }

  return Array.from(skills);
}

/**
 * Fetches the definition for a skill, including its installation command.
 * Queries a mock API for now.
 */
export async function fetchSkillDefinition(skillName: string): Promise<Skill> {
  // In a real scenario, this would query https://skills.sh/api/skills/[name]
  // For now, we use a mock database.
  const mockDatabase: Record<string, string> = {
    git: 'sudo apt-get install git',
    npm: 'curl -L https://www.npmjs.com/install.sh | sh',
    docker: 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh',
  };

  return {
    name: skillName,
    installCommand: mockDatabase[skillName.toLowerCase()] || `echo "Please install ${skillName} manually."`,
  };
}

/**
 * Checks which of the required skills are missing from the system.
 */
export async function checkMissingSkills(required: string[]): Promise<Skill[]> {
  const missing: Skill[] = [];

  for (const skillName of required) {
    if (!isCommandAvailable(skillName)) {
      const definition = await fetchSkillDefinition(skillName);
      missing.push(definition);
    }
  }

  return missing;
}
