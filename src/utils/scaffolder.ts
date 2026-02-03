import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Scaffolds the Clifford directory structure and files.
 */
export async function scaffold(targetDir: string, options: {
  workflow: 'yolo' | 'pr';
  aiTool: string;
  extraGates: string[];
}): Promise<void> {
  // When bundled, __dirname is the dist folder. 
  // In dev, it is src/utils.
  // We want to find the 'templates' folder in the project root.
  let templateDir = path.join(__dirname, '../../templates');
  
  if (!await fs.pathExists(templateDir)) {
    // Fallback for bundled version where __dirname is 'dist'
    templateDir = path.join(__dirname, '../templates');
  }
  
  if (!await fs.pathExists(templateDir)) {
    // Last resort: check current working directory (might be running from source root)
    templateDir = path.join(process.cwd(), 'templates');
  }

  if (!await fs.pathExists(templateDir)) {
     throw new Error(`Templates directory not found. Looked in: ${path.join(__dirname, '../../templates')}, ${path.join(__dirname, '../templates')}, ${path.join(process.cwd(), 'templates')}`);
  }
  await fs.ensureDir(path.join(targetDir, '.clifford'));
  await fs.ensureDir(path.join(targetDir, '.clifford/sprints'));

  // Copy only prompt.md to .clifford
  const promptSrc = path.join(templateDir, '.clifford/prompt.md');
  if (await fs.pathExists(promptSrc)) {
      await fs.copy(promptSrc, path.join(targetDir, '.clifford/prompt.md'));
  }

  // Create initial manifest if it doesn't exist
  const sprintsDir = path.join(targetDir, '.clifford/sprints');
  const entries = await fs.readdir(sprintsDir);
  if (entries.length === 0) {
    const firstSprintDir = path.join(sprintsDir, 'sprint-01');
    await fs.ensureDir(firstSprintDir);
    await fs.ensureDir(path.join(firstSprintDir, 'tasks'));
    const initialManifest = {
      id: 'sprint-01',
      name: 'Initial Sprint',
      status: 'active',
      tasks: []
    };
    await fs.writeJson(path.join(firstSprintDir, 'manifest.json'), initialManifest, { spaces: 2 });
  }

  // Update .gitignore
  const gitignorePath = path.join(targetDir, '.gitignore');
  const gitignoreEntries = [
    '\n# Clifford',
    '.clifford/state.json',
    '.clifford/asm.json'
  ];

  if (await fs.pathExists(gitignorePath)) {
    let content = await fs.readFile(gitignorePath, 'utf8');
    for (const entry of gitignoreEntries) {
      if (!content.includes(entry.trim())) {
        content += entry + '\n';
      }
    }
    await fs.writeFile(gitignorePath, content);
  } else {
    await fs.writeFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
  }

  // Configuration is now handled by the caller writing to clifford.json in root
  // We no longer write .clifford/config.json
}
