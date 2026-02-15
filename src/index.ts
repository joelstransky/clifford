#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { discoverTools } from './utils/discovery.js';
import { SprintRunner } from './utils/sprint.js';
import { scaffold } from './utils/scaffolder.js';
import { loadProjectConfig, CliffordConfig, AfkAdapterConfig } from './utils/config.js';

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
        model: 'opencode/kimi-k2.5-free',
        workflow: 'yolo',
        aiTool: 'opencode',
        changelog: true,
        extraGates: []
      };
      console.log('🚀 Initializing with default YOLO settings...');
    } else {
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'model',
          message: 'Preferred Default Model:',
          default: 'opencode/kimi-k2.5-free'
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
          type: 'checkbox',
          name: 'extraGates',
          message: 'Select extra verification gates:',
          choices: [
            { name: 'Linting', value: 'lint' },
            { name: 'Tests', value: 'test' }
          ]
        },
        {
          type: 'confirm',
          name: 'changelog',
          message: 'Auto-update CHANGELOG.md at the end of each sprint?',
          default: true
        }
      ]);
      // OpenCode is the only supported engine
      answers.aiTool = 'opencode';
    }

    try {
      // Write clifford.json — OpenCode is the only supported engine
      const cliffordConfig = {
        model: answers.model,
        aiTool: 'opencode',
        changelog: answers.changelog
      };
      fs.writeFileSync(configPath, JSON.stringify(cliffordConfig, null, 2));
      console.log('✅ Created clifford.json');

      await scaffold(process.cwd(), {
        workflow: answers.workflow,
        aiTool: answers.aiTool,
        extraGates: answers.extraGates
      });

      console.log('');
      console.log('✅ Clifford initialized successfully!');
      console.log('');

      // Display OpenCode installation status
      const engines = discoverTools();
      const opencode = engines.find(e => e.id === 'opencode');

      if (opencode?.isInstalled) {
        const versionLabel = opencode.version ? ` (${opencode.version})` : '';
        console.log(`🟢 OpenCode: installed${versionLabel}`);
      } else {
        console.log('🔴 OpenCode: not found');
      console.log('   Install it with: npm install -g opencode');
      }

      console.log('');
      console.log('👉 Next step: Open (or restart) OpenCode and switch to the');
      console.log('   Architect agent to begin sprint planning.');
    } catch (error) {
      console.error(`❌ Error during initialization: ${(error as Error).message}`);
    }
  });

program
  .command('afk')
  .description('Configure Clifford AFK (Remote Guidance)')
  .option('--test', 'Send a test message to all enabled AFK adapters')
  .option('--listen', 'Wait for a response during the test (requires --test)')
  .action(async (options) => {
    // 1. Scaffold the Adapter Directory
    const afkDir = path.join(process.cwd(), '.clifford', 'afk');
    if (!fs.existsSync(afkDir)) {
      fs.mkdirSync(afkDir, { recursive: true });
      console.log('✅ Created .clifford/afk/ directory');
    }

    if (options.test) {
      const config = loadProjectConfig();
      const adapters = config.afk?.filter(a => a.enabled && a.token) || [];

      if (adapters.length === 0) {
        console.log('⚠️ No enabled AFK adapters with tokens found in clifford.json.');
        console.log('Run `npx clifford afk` to configure one.');
        return;
      }

      for (const adapter of adapters) {
        const scriptName = `${adapter.provider}.py`;
        const localScriptPath = path.join(afkDir, scriptName);
        const templateScriptPath = path.join(process.cwd(), 'templates', '.clifford', 'afk', scriptName);

        if (!fs.existsSync(localScriptPath)) {
          if (fs.existsSync(templateScriptPath)) {
            fs.copyFileSync(templateScriptPath, localScriptPath);
          } else {
            console.error(`❌ Adapter script not found: ${localScriptPath}`);
            continue;
          }
        }

        if (options.listen) {
          console.log(`📡 [${adapter.provider}] Waiting for handshake... Send a message to your bot.`);
          const args = [localScriptPath, '--token', adapter.token!];
          if (adapter.chatId) {
            args.push('--chat_id', adapter.chatId);
          }
          args.push('--listen');

          try {
            const child = spawnSync('python3', args, { encoding: 'utf8', timeout: 60000 });
            
            if (child.status !== 0) {
              console.error(`❌ [${adapter.provider}] Listen failed: ${child.stderr || 'Timeout'}`);
              continue;
            }

            const output = child.stdout.trim();
            // If output is purely numeric and we don't have a chatId, it's auto-detection
            if (!adapter.chatId && /^-?\d+$/.test(output)) {
              adapter.chatId = output;
              const configPath = path.join(process.cwd(), 'clifford.json');
              const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CliffordConfig;
              const idx = fullConfig.afk?.findIndex(a => a.provider === adapter.provider) ?? -1;
              if (idx > -1 && fullConfig.afk) {
                fullConfig.afk[idx].chatId = output;
                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                console.log(`✅ [${adapter.provider}] Auto-detected Chat ID: ${output} (Saved to clifford.json)`);
              }
              console.log(`✅ [${adapter.provider}] Found you! Setup complete.`);
            } else {
              console.log(`✅ [${adapter.provider}] Found you! Setup complete. Received: ${output}`);
            }
          } catch (err) {
            console.error(`❌ [${adapter.provider}] Failed to execute python3: ${(err as Error).message}`);
          }
        } else {
          if (!adapter.chatId) {
            console.log(`⚠️ [${adapter.provider}] No chatId found. Run with --test --listen first to auto-detect.`);
            continue;
          }

          console.log(`🚀 [${adapter.provider}] Sending test message...`);
          const child = spawnSync('python3', [localScriptPath, '--token', adapter.token!, '--chat_id', adapter.chatId, '--test'], { encoding: 'utf8' });
          
          if (child.status === 0) {
            console.log(`✅ [${adapter.provider}] ${child.stdout.trim()}`);
          } else {
            console.error(`❌ [${adapter.provider}] Test failed: ${child.stderr}`);
          }
        }
      }
      return;
    }

    // 2. Implement the Interview Wizard
    console.log('\n--- Clifford AFK Setup ---');
    console.log('Tip: Message @BotFather the message "/help" to create a bot and get a token.');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'telegramToken',
        message: 'If you have a Telegram Bot Token, paste it here:',
      },
      {
        type: 'input',
        name: 'telegramChatId',
        message: 'Enter your Chat ID (or leave blank to auto-detect on first message):',
        when: (answers) => answers.telegramToken.length > 0
      }
    ]);

    if (answers.telegramToken) {
      // Update clifford.json
      const configPath = path.join(process.cwd(), 'clifford.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CliffordConfig;
          if (!Array.isArray(config.afk)) {
            config.afk = [];
          }
          const telegramIndex = config.afk.findIndex(a => a.provider === 'telegram');
          const telegramConfig: AfkAdapterConfig = {
            provider: 'telegram',
            enabled: true,
            token: answers.telegramToken,
            chatId: answers.telegramChatId || undefined
          };
          
          if (telegramIndex > -1) {
            config.afk[telegramIndex] = telegramConfig;
          } else {
            config.afk.push(telegramConfig);
          }
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log('✅ Updated clifford.json with Telegram configuration.');
        } catch (err) {
          console.error(`❌ Error updating clifford.json: ${(err as Error).message}`);
        }
      } else {
        console.log('⚠️ clifford.json not found. Configuration not saved.');
      }
    } else {
      console.log('\nNo token provided. You can add it later to clifford.json.');
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
    
    const runner = new SprintRunner(dir);

    const { launchDashboard } = await import('./tui/Dashboard.js');
    await launchDashboard(dir, runner);
  });

program.parse();
