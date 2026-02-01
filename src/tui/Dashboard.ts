import { 
  createCliRenderer, 
  BoxRenderable, 
  TextRenderable,
  ScrollBoxRenderable,
  bold,
  fg,
  dim,
  t,
  type KeyEvent
} from '@opentui/core';
import fs from 'fs';
import path from 'path';
import { CommsBridge, BlockRequest } from '../utils/bridge.js';

// Version constant
const VERSION = '1.0.0';

// Colors
const COLORS = {
  bg: '#1a1b26',
  panelBg: '#24283b',
  primary: '#7aa2f7',
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  text: '#c0caf5',
  dim: '#565f89',
  purple: '#bb9af7',
};

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

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

type OpenTUIRenderer = Awaited<ReturnType<typeof createCliRenderer>>;

const STATUS_ICONS: Record<Task['status'], string> = {
  completed: '✅',
  active: '🔄',
  pending: '⏳',
  blocked: '🛑',
  pushed: '📤',
};

const STATUS_COLORS: Record<Task['status'], string> = {
  completed: COLORS.success,
  active: COLORS.warning,
  pending: COLORS.dim,
  blocked: COLORS.error,
  pushed: COLORS.primary,
};

function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0];
}

function generateProgressBar(completed: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? completed / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(percentage * 100);
  return `${bar} ${percent}%`;
}

export async function launchDashboard(sprintDir: string, bridge?: CommsBridge): Promise<void> {
  const renderer: OpenTUIRenderer = await createCliRenderer({
    exitOnCtrlC: false, // We'll handle it ourselves
  });

  // --- State ---
  let manifest: Manifest | null = null;
  let previousManifest: Manifest | null = null;
  let logs: LogEntry[] = [];
  let activeBlocker: BlockRequest | null = null;
  let blockerInput: string = '';
  let currentRightView: 'activity' | 'blocker' = 'activity';

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    logs.push({ timestamp: new Date(), message, type });
    if (logs.length > 100) logs.shift();
    if (!activeBlocker) updateActivityLog();
  };

  if (bridge) {
    bridge.on('block', (data: BlockRequest) => {
      activeBlocker = data;
      blockerInput = '';
      updateDisplay();
    });
    bridge.on('resolve', (response: string) => {
      activeBlocker = null;
      addLog(`Blocker resolved: ${response.substring(0, 30)}${response.length > 30 ? '...' : ''}`, 'success');
      updateDisplay();
    });
  }

  // --- Root ---
  const root = new BoxRenderable(renderer, {
    id: 'root', width: '100%', height: '100%', flexDirection: 'column',
  });
  renderer.root.add(root);

  // --- Header ---
  const header = new BoxRenderable(renderer, {
    id: 'header', width: '100%', height: 3, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    border: true, borderStyle: 'rounded', paddingLeft: 2, paddingRight: 2,
    backgroundColor: COLORS.bg,
  });
  
  const titleText = new TextRenderable(renderer, {
    id: 'title', content: t`${bold(fg(COLORS.primary)(`CLIFFORD v${VERSION}`))}`,
  });
  
  const sprintStatusText = new TextRenderable(renderer, {
    id: 'sprint-status', content: t`${dim('[Sprint: Loading...]')}`,
  });
  
  header.add(titleText);
  header.add(sprintStatusText);
  root.add(header);

  // --- Main Content ---
  const main = new BoxRenderable(renderer, {
    id: 'main', width: '100%', flexGrow: 1, flexDirection: 'row',
  });
  root.add(main);

  // --- Left Panel (Sprint Plan) ---
  const leftPanel = new BoxRenderable(renderer, {
    id: 'left-panel', width: '40%', height: '100%', flexDirection: 'column',
    border: true, borderStyle: 'single', padding: 1, backgroundColor: COLORS.bg,
  });
  
  leftPanel.add(new TextRenderable(renderer, {
    id: 'sprint-plan-header', content: t`${bold(fg(COLORS.primary)('SPRINT PLAN'))}`,
  }));
  
  const sprintNameText = new TextRenderable(renderer, {
    id: 'sprint-name', content: t`${dim('Loading...')}`,
  });
  const sprintDescText = new TextRenderable(renderer, {
    id: 'sprint-desc', content: '',
  });
  
  leftPanel.add(sprintNameText);
  leftPanel.add(sprintDescText);
  
  const taskListBox = new BoxRenderable(renderer, {
    id: 'task-list-box', width: '100%', flexGrow: 1, flexDirection: 'column',
    border: true, borderStyle: 'rounded', marginTop: 1, padding: 1,
  });
  const taskListContainer = new BoxRenderable(renderer, {
    id: 'task-list', width: '100%', flexDirection: 'column',
  });
  taskListBox.add(taskListContainer);
  leftPanel.add(taskListBox);

  const progressText = new TextRenderable(renderer, {
    id: 'progress', content: t`${dim('Progress: ')}${fg(COLORS.dim)('░░░░░░░░░░░░░░░░░░░░ 0%')}`,
  });
  leftPanel.add(new BoxRenderable(renderer, { id: 'prog-wrap', marginTop: 1 }).add(progressText));
  
  main.add(leftPanel);

  // --- Right Panel ---
  const rightPanel = new BoxRenderable(renderer, {
    id: 'right-panel', flexGrow: 1, height: '100%', flexDirection: 'column',
    border: true, borderStyle: 'single', padding: 1, backgroundColor: COLORS.panelBg,
  });
  
  // Activity Log Components
  const activityHeader = new TextRenderable(renderer, {
    id: 'activity-header', content: t`${bold(fg(COLORS.purple)('ACTIVITY LOG'))}`,
  });
  
  const activityScroll = new ScrollBoxRenderable(renderer, {
    id: 'activity-scroll', width: '100%', flexGrow: 1, marginTop: 1,
  });
  const activityLogContainer = new BoxRenderable(renderer, {
    id: 'activity-log', width: '100%', flexDirection: 'column',
  });
  activityScroll.add(activityLogContainer);
  
  // Blocker UI Components
  const blockerContainer = new BoxRenderable(renderer, {
    id: 'blocker-container', width: '100%', height: '100%', flexDirection: 'column',
  });
  
  const blockerHeader = new TextRenderable(renderer, {
    id: 'blocker-header', content: t`${bold(fg(COLORS.error)('🛑 BLOCKER DETECTED'))}`,
  });
  const blockerDivider = new TextRenderable(renderer, {
    id: 'blocker-divider', content: t`${dim('─'.repeat(40))}`,
  });
  const blockerTask = new TextRenderable(renderer, {
    id: 'blocker-task', content: '',
  });
  const blockerReason = new TextRenderable(renderer, {
    id: 'blocker-reason', content: '',
  });
  const blockerQuestionLabel = new TextRenderable(renderer, {
    id: 'blocker-question-label', content: t`\n${bold('Question:')}`,
  });
  const blockerQuestion = new TextRenderable(renderer, {
    id: 'blocker-question', content: '',
  });
  
  const blockerInputBox = new BoxRenderable(renderer, {
    id: 'blocker-input-box', width: '100%', height: 3, border: true, borderStyle: 'rounded', marginTop: 1, paddingLeft: 1,
  });
  const blockerInputText = new TextRenderable(renderer, {
    id: 'blocker-input-text', content: '',
  });
  blockerInputBox.add(blockerInputText);
  
  const blockerFooterHint = new TextRenderable(renderer, {
    id: 'blocker-footer-hint', content: t`\n${dim('[Enter] Submit  [Esc] Cancel')}`,
  });

  blockerContainer.add(blockerHeader);
  blockerContainer.add(blockerDivider);
  blockerContainer.add(blockerTask);
  blockerContainer.add(blockerReason);
  blockerContainer.add(blockerQuestionLabel);
  blockerContainer.add(blockerQuestion);
  blockerContainer.add(blockerInputBox);
  blockerContainer.add(blockerFooterHint);

  // Initial Right Panel setup
  rightPanel.add(activityHeader);
  rightPanel.add(activityScroll);
  
  main.add(rightPanel);

  // --- Footer ---
  const footer = new BoxRenderable(renderer, {
    id: 'footer', width: '100%', height: 3, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    border: true, borderStyle: 'rounded', paddingLeft: 2, paddingRight: 2,
    backgroundColor: COLORS.bg,
  });
  
  const statusText = new TextRenderable(renderer, {
    id: 'status', content: t`${fg(COLORS.success)('STATUS: Ready')}`,
  });
  const hotkeyText = new TextRenderable(renderer, {
    id: 'hotkeys', content: t`${dim('[Q]uit  [R]efresh')}`,
  });
  
  footer.add(statusText);
  footer.add(hotkeyText);
  root.add(footer);

  // --- UI Update Helpers ---
  const taskElements: TextRenderable[] = [];
  const logElements: TextRenderable[] = [];

  const updateTaskList = () => {
    taskElements.forEach(el => { try { taskListContainer.remove(el.id); } catch { /* ignore */ } });
    taskElements.length = 0;
    if (!manifest) return;

    manifest.tasks.forEach((task, i) => {
      const content = `${STATUS_ICONS[task.status]} ${task.id}`;
      const el = new TextRenderable(renderer, {
        id: `task-${i}`,
        content: task.status === 'active' ? t`${bold(fg(STATUS_COLORS[task.status])(content))}` : t`${fg(STATUS_COLORS[task.status])(content)}`,
      });
      taskElements.push(el);
      taskListContainer.add(el);
    });
  };

  const updateActivityLog = () => {
    logElements.forEach(el => { try { activityLogContainer.remove(el.id); } catch { /* ignore */ } });
    logElements.length = 0;
    
    logs.slice(-20).forEach((log, i) => {
      let color = COLORS.text;
      if (log.type === 'success') color = COLORS.success;
      if (log.type === 'warning') color = COLORS.warning;
      if (log.type === 'error') color = COLORS.error;

      const el = new TextRenderable(renderer, {
        id: `log-${i}`,
        content: t`${dim(`[${formatTime(log.timestamp)}]`)} ${fg(color)(log.message)}`,
      });
      logElements.push(el);
      activityLogContainer.add(el);
    });
  };

  const updateDisplay = () => {
    if (!manifest) return;
    
    sprintNameText.content = t`${fg(COLORS.text)(manifest.name)}`;
    sprintDescText.content = t`${dim(`"${manifest.id}"`)}`;
    
    const completed = manifest.tasks.filter(t => t.status === 'completed' || t.status === 'pushed').length;
    const progress = generateProgressBar(completed, manifest.tasks.length);
    progressText.content = t`${dim('Progress: ')}${fg(completed === manifest.tasks.length ? COLORS.success : COLORS.primary)(progress)}`;
    
    const active = manifest.tasks.some(t => t.status === 'active');
    const blocked = manifest.tasks.some(t => t.status === 'blocked');
    let sLabel = 'Idle', sColor = COLORS.dim;
    if (blocked) { sLabel = 'Blocked'; sColor = COLORS.error; }
    else if (active) { sLabel = 'Running'; sColor = COLORS.warning; }
    else if (completed === manifest.tasks.length) { sLabel = 'Complete'; sColor = COLORS.success; }
    sprintStatusText.content = t`${fg(sColor)(`[Sprint: ${sLabel}]`)}`;
    
    updateTaskList();
    
    // Toggle Right Panel
    if (activeBlocker) {
      if (currentRightView !== 'blocker') {
        try { rightPanel.remove('activity-header'); } catch { /* ignore */ }
        try { rightPanel.remove('activity-scroll'); } catch { /* ignore */ }
        rightPanel.add(blockerContainer);
        currentRightView = 'blocker';
      }
      
      blockerTask.content = t`${dim('Task: ')}${fg(COLORS.text)(activeBlocker.task || 'Unknown')}`;
      blockerReason.content = t`${dim('Reason: ')}${fg(COLORS.text)(activeBlocker.reason || 'Unknown')}`;
      blockerQuestion.content = t`${fg(COLORS.warning)(`"${activeBlocker.question || 'No question provided'}"`)}`;
      blockerInputText.content = t`${blockerInput}${bold(fg(COLORS.primary)('█'))}`;
      
      hotkeyText.content = t`${bold('[Enter]')} Submit  ${bold('[Esc]')} Cancel`;
    } else {
      if (currentRightView !== 'activity') {
        try { rightPanel.remove('blocker-container'); } catch { /* ignore */ }
        rightPanel.add(activityHeader);
        rightPanel.add(activityScroll);
        currentRightView = 'activity';
      }
      updateActivityLog();
      hotkeyText.content = t`${dim('[Q]uit  [R]efresh')}`;
    }
  };

  // --- Manifest Polling ---
  const loadManifest = () => {
    const p = path.resolve(sprintDir, 'manifest.json');
    try {
      if (fs.existsSync(p)) {
        const m: Manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (previousManifest) {
          m.tasks.forEach((t, i) => {
            const prev = previousManifest?.tasks[i];
            if (prev && prev.status !== t.status) {
              addLog(`${STATUS_ICONS[t.status]} ${t.id}: ${prev.status} → ${t.status}`, 
                t.status === 'completed' ? 'success' : t.status === 'blocked' ? 'error' : t.status === 'active' ? 'warning' : 'info');
            }
          });
        }
        manifest = m;
        previousManifest = m;
        updateDisplay();
      }
    } catch { /* ignore parse errors */ }
  };

  const poll = setInterval(loadManifest, 1000);
  loadManifest();
  addLog('Dashboard initialized', 'info');

  // --- Input ---
  renderer.keyInput.on('keypress', (key: KeyEvent) => {
    // Global shortcuts (Quit)
    if (key.name === 'q' && !activeBlocker) {
      clearInterval(poll);
      renderer.destroy();
      process.exit(0);
    }
    if (key.ctrl && key.name === 'c') {
      clearInterval(poll);
      renderer.destroy();
      process.exit(0);
    }

    if (activeBlocker) {
      if (key.name === 'enter') {
        if (blockerInput.trim() && bridge) {
          bridge.resolveBlocker(blockerInput.trim());
          // bridge resolve event will clear activeBlocker
        }
      } else if (key.name === 'escape') {
        activeBlocker = null;
        updateDisplay();
      } else if (key.name === 'backspace') {
        blockerInput = blockerInput.slice(0, -1);
        updateDisplay();
      } else if (key.sequence && key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 126) {
        blockerInput += key.sequence;
        updateDisplay();
      }
    } else {
      if (key.name === 'r') {
        addLog('Manual refresh', 'info');
        loadManifest();
      }
    }
  });

  // --- Start ---
  try {
    await renderer.start();
    await new Promise(() => {});
  } catch (e) {
    clearInterval(poll);
    console.error(`TUI Error: ${(e as Error).message}`);
  }
}
