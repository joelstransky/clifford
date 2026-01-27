#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { discoverTools } from './utils/discovery';
import { SprintRunner } from './utils/sprint';
import { scaffold } from './utils/scaffolder';

const program = new Command();

program
  .name('clifford')
  .description('Recursive Implementation Agent for agile sprint planning')
  .version('1.0.0');

program
  .command('hello')
  .description('Say hello')
  .action(() => {
    console.log('Hello from Clifford!');
  });

program
  .command('discover')
  .description('Discover available AI CLI engines')
  .action(() => {
    const tools = discoverTools();
    console.log('Discovered Tools:');
    tools.forEach((tool) => {
      console.log(
        `- ${tool.name} (${tool.command}): ${
          tool.isInstalled ? 'Installed' : 'Not found'
        }${tool.version ? ` (v${tool.version})` : ''}`
      );
    });
  });

program
  .command('init')
  .description('Initialize a new Clifford project')
  .action(async () => {
    console.log('🔍 Discovering compatible AI agents...');
    const tools = discoverTools();
    const installedTools = tools.filter(t => t.isInstalled);
    
    if (installedTools.length === 0) {
      console.log('⚠️ No compatible AI agents (OpenCode, Claude Code, etc.) were found on your system.');
    } else {
      console.log(`✅ Found ${installedTools.length} compatible agent(s): ${installedTools.map(t => t.name).join(', ')}`);
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'workflow',
        message: 'Choose your workflow:',
        choices: [
          { name: 'YOLO (Direct commits to main)', value: 'yolo' },
          { name: 'PR (Create pull requests)', value: 'pr' }
        ]
      },
      {
        type: 'list',
        name: 'aiTool',
        message: 'Select your preferred AI tool:',
        choices: installedTools.map(t => ({ name: `${t.name} (${t.command})`, value: t.id })),
        when: installedTools.length > 0
      },
      {
        type: 'input',
        name: 'customAiTool',
        message: 'Enter the command for your custom AI tool:',
        when: () => installedTools.length === 0
      },
      {
        type: 'checkbox',
        name: 'extraGates',
        message: 'Select extra verification gates:',
        choices: [
          { name: 'Linting', value: 'lint' },
          { name: 'Tests', value: 'test' }
        ]
      }
    ]);

    try {
      await scaffold(process.cwd(), {
        workflow: answers.workflow,
        aiTool: answers.aiTool || answers.customAiTool,
        extraGates: answers.extraGates
      });
      console.log('✅ Clifford initialized successfully!');
    } catch (error) {
      console.error(`❌ Error during initialization: ${(error as Error).message}`);
    }
  });

program
  .command('sprint <sprint-dir>')
  .description('Execute a sprint loop')
  .action(async (sprintDir) => {
    try {
      const runner = new SprintRunner(sprintDir);
      await runner.run();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
