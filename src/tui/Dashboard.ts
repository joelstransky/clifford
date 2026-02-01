import { 
  createCliRenderer, 
  Box, 
  Text, 
  TextAttributes,
  bold,
  fg,
  t 
} from '@opentui/core';
import fs from 'fs';
import path from 'path';
import { CommsBridge, BlockRequest } from '../utils/bridge.js';

interface Task {
  id: string;
  file: string;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
}

interface Manifest {
  id: string;
  name: string;
  status: string;
  tasks: Task[];
}

interface CliRenderer {
  root: { add: (child: unknown) => void };
  on: (event: string, handler: (key: string) => void) => void;
  start: () => Promise<void> | void;
}

export async function launchDashboard(sprintDir: string, bridge?: CommsBridge) {
  let renderer: CliRenderer;
  
  try {
    renderer = await createCliRenderer();
  } catch (err) {
    console.error(`⚠️  OpenTUI initialization failed: ${(err as Error).message}`);
    console.log('Falling back to basic CLI monitoring mode...');
    
    // Simple fallback monitoring loop
    const manifestPath = path.resolve(sprintDir, 'manifest.json');
    const renderFallback = () => {
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`\n--- Sprint: ${manifest.name} ---`);
          if (manifest.tasks && manifest.tasks.length > 0) {
            manifest.tasks.forEach((t: { id: string; file: string; status: string }) => {
              console.log(`${t.status === 'completed' ? '✅' : '⏳'} ${t.id}: ${t.file}`);
            });
          } else {
            console.log('(No tasks found)');
          }
          console.log('\nMonitoring agent... Press Ctrl+C to exit.');
        } catch {
          // Ignore parse errors
        }
      } else {
        console.log(`Searching for manifest at ${manifestPath}...`);
      }
    };
    
    renderFallback();
    setInterval(renderFallback, 5000);
    
    await new Promise(() => {}); // Keep alive
    return;
  }
  
  // State management
  let manifest: Manifest | null = null;
  let activeBlock: BlockRequest | null = null;
  let userInput = '';
  let selectedTaskIndex = 0;
  
  // Create main container
  const container = Box({
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    gap: 1,
    borderStyle: 'rounded'
  });
  
  // Left panel - Sprint Plan
  const leftPanel = Box({
    flexGrow: 1,
    flexDirection: 'column',
    borderStyle: 'single',
    padding: 1,
    backgroundColor: '#1a1b26'
  });
  
  const titleText = Text({
    content: t`${bold(fg('#7aa2f7')('Sprint Plan: Loading...'))}`,
    id: 'title'
  });
  
  const tasksContainer = Box({
    flexDirection: 'column',
    marginTop: 1,
    id: 'tasks-container'
  });
  
  leftPanel.add(titleText);
  leftPanel.add(tasksContainer);
  
  // Right panel - Logs & Blockers
  const rightPanel = Box({
    flexGrow: 1,
    flexDirection: 'column',
    borderStyle: 'single',
    padding: 1,
    backgroundColor: '#24283b'
  });
  
  const logsTitle = Text({
    content: t`${bold(fg('#bb9af7')('Logs & Blockers'))}`
  });
  
  const logsContainer = Box({
    flexDirection: 'column',
    marginTop: 1,
    id: 'logs-container'
  });
  
  rightPanel.add(logsTitle);
  rightPanel.add(logsContainer);
  
  container.add(leftPanel);
  container.add(rightPanel);
  renderer.root.add(container);
  
  // Update display function
  const updateDisplay = () => {
    // Update title
    if (manifest) {
      titleText.content = t`${bold(fg('#7aa2f7')(`Sprint Plan: ${manifest.name}`))}`;
    }
    
    // Update tasks list - rebuild children
    const tasksChildren = tasksContainer.children;
    if (tasksChildren) {
      while (tasksChildren.length > 0) {
        const child = tasksChildren[0];
        if (child && typeof child === 'object' && 'id' in child) {
          tasksContainer.remove(child.id as string);
        }
      }
    }
    
    if (manifest) {
      manifest.tasks.forEach((task, index) => {
        const isSelected = index === selectedTaskIndex;
        const statusIcon = 
          task.status === 'completed' ? '✅' :
          task.status === 'active' ? '🔄' :
          task.status === 'blocked' ? '🛑' : '⏳';
        
        const statusColor = 
          task.status === 'completed' ? '#9ece6a' :
          task.status === 'active' ? '#e0af68' :
          task.status === 'blocked' ? '#f7768e' : '#565f89';
        
        const prefix = isSelected ? '> ' : '  ';
        const taskContent = `${prefix}${statusIcon} ${task.id}: ${task.file}`;
        
        const taskText = Text({
          content: isSelected ? t`${bold(taskContent)}` : t`${fg(statusColor)(taskContent)}`
        });
        tasksContainer.add(taskText);
      });
    }
    
    // Update logs/blockers - rebuild children
    const logsChildren = logsContainer.children;
    if (logsChildren) {
      while (logsChildren.length > 0) {
        const child = logsChildren[0];
        if (child && typeof child === 'object' && 'id' in child) {
          logsContainer.remove(child.id as string);
        }
      }
    }
    
    if (activeBlock) {
      const blockerTitle = Text({
        content: t`${bold(fg('#f7768e')(`🛑 BLOCKER: ${activeBlock.reason}`))}`
      });
      
      const questionText = Text({
        content: t`${fg('#e0af68')(`Question: ${activeBlock.question}`)}`
      });
      
      const inputBox = Box({
        marginTop: 1,
        flexDirection: 'row'
      });
      
      const guidanceLabel = Text({
        content: 'Guidance: '
      });
      
      const inputText = Text({
        content: t`${fg('#9ece6a')(userInput)}`
      });
      
      const cursor = Text({
        content: '█',
        attributes: TextAttributes.DIM
      });
      
      inputBox.add(guidanceLabel);
      inputBox.add(inputText);
      inputBox.add(cursor);
      
      const helpText = Text({
        content: t`${fg('#565f89')('Press Enter to resolve and restart agent.')}`,
        attributes: TextAttributes.DIM,
        marginTop: 1
      });
      
      logsContainer.add(blockerTitle);
      logsContainer.add(questionText);
      logsContainer.add(inputBox);
      logsContainer.add(helpText);
    } else {
      const monitoringText = Text({
        content: t`${fg('#565f89')('Monitoring agent activity...')}`
      });
      
      const noBlockerText = Text({
        content: t`${fg('#e0af68')('No active blockers.')}`,
        marginTop: 1
      });
      
      logsContainer.add(monitoringText);
      logsContainer.add(noBlockerText);
    }
  };
  
  // Load manifest
  const loadManifest = () => {
    const manifestPath = path.resolve(sprintDir, 'manifest.json');
    try {
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const newManifest = JSON.parse(content);
        if (JSON.stringify(newManifest) !== JSON.stringify(manifest)) {
          manifest = newManifest;
          updateDisplay();
        }
      }
    } catch {
      // Ignore parse errors during writes
    }
  };
  
  // Initial load
  loadManifest();
  
  // Poll for manifest changes
  setInterval(loadManifest, 1000);
  
  // Set up bridge listeners
  if (bridge) {
    bridge.on('block', (data: BlockRequest) => {
      activeBlock = data;
      userInput = '';
      updateDisplay();
    });
    
    bridge.on('resolve', () => {
      activeBlock = null;
      userInput = '';
      updateDisplay();
    });
  }
  
  // Handle keyboard input
  renderer.on('input', (key: string) => {
    if (activeBlock) {
      // Input mode for blocker resolution
      if (key === '\r' || key === '\n') {
        // Enter pressed - resolve blocker
        if (bridge && userInput.trim()) {
          bridge.resolveBlocker(userInput.trim());
        }
      } else if (key === '\x7f' || key === '\b') {
        // Backspace
        userInput = userInput.slice(0, -1);
        updateDisplay();
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        // Regular character
        userInput += key;
        updateDisplay();
      }
    } else {
      // Navigation mode
      if (manifest) {
        if (key === '\x1b[A') { // Up arrow
          selectedTaskIndex = Math.max(0, selectedTaskIndex - 1);
          updateDisplay();
        } else if (key === '\x1b[B') { // Down arrow
          selectedTaskIndex = Math.min(manifest.tasks.length - 1, selectedTaskIndex + 1);
          updateDisplay();
        } else if (key === '\r' || key === '\n') {
          // Enter - could trigger sprint start
          const selectedTask = manifest.tasks[selectedTaskIndex];
          console.log(`Selected task: ${selectedTask.id}`);
        }
      }
    }
  });
  
  // Initial render
  updateDisplay();
  
  // Start rendering
  try {
    await renderer.start();
    // If renderer.start() resolves (e.g. stubbed renderer), keep the process alive
    await new Promise(() => {});
  } catch (error) {
    console.error(`Failed to start TUI: ${(error as Error).message}`);
  }
}
