#!/usr/bin/env bun
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { discoverTools } from './utils/discovery.js';
import { SprintRunner } from './utils/sprint.js';
import { scaffold } from './utils/scaffolder.js';

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
  .option('-y, --yolo', 'Skip prompts and use default settings')
  .action(async (options) => {
    const configPath = path.join(process.cwd(), 'clifford.json');

    if (fs.existsSync(configPath) && !options.yolo) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'clifford.json already exists. Overwrite?',
          default: false
        }
      ]);
      if (!overwrite) {
        console.log('🚀 Initialization aborted.');
        return;
      }
    }

    let answers;
    if (options.yolo) {
      answers = {
        model: 'opencode/kimi-k2-5-free',
        workflow: 'yolo',
        aiTool: 'opencode',
        extraGates: []
      };
      console.log('🚀 Initializing with default YOLO settings...');
    } else {
      console.log('🔍 Discovering compatible AI agents...');
      const tools = discoverTools();
      const installedTools = tools.filter(t => t.isInstalled);
      
      if (installedTools.length === 0) {
        console.log('⚠️ No compatible AI agents (OpenCode, Claude Code, etc.) were found on your system.');
      } else {
        console.log(`✅ Found ${installedTools.length} compatible agent(s): ${installedTools.map(t => t.name).join(', ')}`);
      }

      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'model',
          message: 'Preferred Default Model:',
          default: 'opencode/kimi-k2-5-free'
        },
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
    }

    try {
      // Write clifford.json
      const cliffordConfig = {
        model: answers.model
      };
      fs.writeFileSync(configPath, JSON.stringify(cliffordConfig, null, 2));
      console.log('✅ Created clifford.json');

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
  .command('resolve <response>')
  .description('Resolve a blocker by sending a response to the active agent')
  .action(async (response) => {
    try {
      const http = await import('http');
      const postData = JSON.stringify({ answer: response });
      
      const req = http.request({
        hostname: 'localhost',
        port: 4096,
        path: '/resolve',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ Sent resolution: ${response}`);
        } else {
          console.error(`❌ Failed to resolve blocker. Status: ${res.statusCode}`);
        }
      });

      req.on('error', (e) => {
        console.error(`❌ Connection error: ${e.message}`);
        console.log('Is the sprint loop running?');
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
    }
  });

function findActiveSprintDir(): string {
  try {
    const sprints = SprintRunner.discoverSprints();
    const active = sprints.find((s) => s.status === 'active');
    if (active && active.path) return active.path;
    
    // Fallback to the first available sprint if none are active
    if (sprints.length > 0 && sprints[0].path) return sprints[0].path;
  } catch {
    // Ignore and fallback
  }
  return '.clifford/sprints/sprint-01';
}

program
  .action(async () => {
    const configPath = path.join(process.cwd(), 'clifford.json');
    if (!fs.existsSync(configPath)) {
      console.log("⚠️  Clifford is not initialized. Run `npx clifford init` to get started.");
      process.exit(1);
    }

    let dir = findActiveSprintDir();
    dir = dir.replace(/\\/g, '/');
    if (dir.startsWith('./')) dir = dir.substring(2);
    
    const { CommsBridge } = await import('./utils/bridge.js');
    const bridge = new CommsBridge();
    const runner = new SprintRunner(dir, bridge);

    const { launchDashboard } = await import('./tui/Dashboard.js');
    await launchDashboard(dir, bridge, runner);
  });

program.parse();
