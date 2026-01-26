import fs from 'fs-extra';
import path from 'path';

/**
 * Scaffolds the Clifford directory structure and files.
 */
export async function scaffold(targetDir: string, options: {
  workflow: 'yolo' | 'pr';
  aiTool: string;
  extraGates: string[];
}): Promise<void> {
  const templateDir = path.join(__dirname, '../../templates');
  
  // Create directories
  await fs.ensureDir(path.join(targetDir, '.clifford'));
  await fs.ensureDir(path.join(targetDir, '.opencode/agent'));
  await fs.ensureDir(path.join(targetDir, 'sprints'));

  // Copy templates
  await fs.copy(path.join(templateDir, '.clifford'), path.join(targetDir, '.clifford'));
  await fs.copy(path.join(templateDir, '.opencode'), path.join(targetDir, '.opencode'));

  // Customize sprint-verify.sh based on extraGates
  const verifyScriptPath = path.join(targetDir, '.clifford/sprint-verify.sh');
  if (await fs.pathExists(verifyScriptPath)) {
    let verifyContent = await fs.readFile(verifyScriptPath, 'utf8');
    
    let gatesContent = '';
    if (options.extraGates.includes('lint')) {
      gatesContent += '  echo "--- Checking Lint ---"\n  npm run lint || { echo "❌ Linting failed"; exit 1; }\n';
    }
    if (options.extraGates.includes('test')) {
      gatesContent += '  echo "--- Running Tests ---"\n  npm test || { echo "❌ Tests failed"; exit 1; }\n';
    }

    const startMarker = '# GATES_START';
    const endMarker = '# GATES_END';
    const startIndex = verifyContent.indexOf(startMarker);
    const endIndex = verifyContent.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      verifyContent = 
        verifyContent.substring(0, startIndex + startMarker.length) + 
        '\n' + gatesContent + 
        verifyContent.substring(endIndex);
    }
    
    await fs.writeFile(verifyScriptPath, verifyContent);
  }

  // Create initial manifest if it doesn't exist
  const sprintsDir = path.join(targetDir, 'sprints');
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
    '.opencode/node_modules',
    '.clifford/state.json'
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

  // Save configuration
  const config = {
    workflow: options.workflow,
    aiTool: options.aiTool,
    extraGates: options.extraGates,
    initializedAt: new Date().toISOString()
  };
  await fs.writeJson(path.join(targetDir, '.clifford/config.json'), config, { spaces: 2 });
}
