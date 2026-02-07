import fs from 'fs';
import path from 'path';
import { CommsBridge, BlockRequest } from '../utils/bridge.js';
import { SprintRunner, SprintManifest } from '../utils/sprint.js';
import { stripEmoji } from '../utils/text.js';

// Version constant
const VERSION = '1.0.0';

// Colors
const COLORS = {
  titleBg: '#13141c',
  bg: '#1a1b26',
  panelBg: '#24283b',
  statusBg: '#000000',
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

export async function launchDashboard(sprintDir: string, bridge: CommsBridge, runner: SprintRunner): Promise<void> {
  // Use a variable for the module name to ensure it's truly dynamic and NOT bundled
  const opentuiModule = '@opentui/core';
  const { 
    createCliRenderer, 
    BoxRenderable, 
    TextRenderable,
    ScrollBoxRenderable,
    TabSelectRenderable,
    TabSelectRenderableEvents,
    bold,
    fg,
    dim,
    t
  } = await import(opentuiModule);

  const renderer = await createCliRenderer({
    exitOnCtrlC: false, // We'll handle it ourselves
  });

  // --- State ---
  let activeTab: 'sprints' | 'activity' = 'sprints';
  let viewMode: 'sprints' | 'tasks' = 'sprints';
  let allSprints: SprintManifest[] = [];
  let selectedIndex: number = 0;
  let currentSprintDir = sprintDir;
  let manifest: Manifest | null = null;
  let previousManifest: Manifest | null = null;
  let logs: LogEntry[] = [];
  let activeBlocker: BlockRequest | null = null;
  let chatInput: string = '';
  let chatFocused: boolean = false;
  let currentRightView: 'activity' | 'blocker' | 'execution' = 'activity';
  let executionLogs: string[] = [];
  let sprintStartTime: number | null = null;
  let elapsedSeconds: number = 0;
  let activeTaskId: string | null = null;
  let activeTaskFile: string | null = null;

  // --- Quit Confirmation State ---
  let quitPending: boolean = false;
  let quitTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Spinner State ---
  const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerInterval: ReturnType<typeof setInterval> | null = null;
  let spinnerFrameIndex: number = 0;

  const startSpinner = () => {
    if (spinnerInterval) return; // Already running
    spinnerFrameIndex = 0;
    spinnerInterval = setInterval(() => {
      spinnerFrameIndex = (spinnerFrameIndex + 1) % SPINNER_FRAMES.length;
      updateHeaderStatus();
    }, 80);
    updateHeaderStatus();
  };

  const stopSpinner = () => {
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
  };

  /** Cancel the pending quit confirmation and restore normal status bar */
  const cancelQuit = () => {
    quitPending = false;
    if (quitTimer) {
      clearTimeout(quitTimer);
      quitTimer = null;
    }
    // statusText is set below after it's created; this is safe because
    // cancelQuit is only called from the keypress handler, which runs
    // after the entire UI tree is built.
  };

  /** Update just the header status text (used by spinner tick and full updateDisplay) */
  const updateHeaderStatus = () => {
    const completed = manifest ? manifest.tasks.filter(t => t.status === 'completed' || t.status === 'pushed').length : 0;
    const total = manifest ? manifest.tasks.length : 0;
    const isRunning = runner.getIsRunning();
    const blocked = manifest ? manifest.tasks.some(t => t.status === 'blocked') : false;

    if (spinnerInterval) {
      // Spinner is active — show animated starting indicator
      const frame = SPINNER_FRAMES[spinnerFrameIndex];
      sprintStatusText.content = t`${fg(COLORS.warning)(`[${frame} Starting...]`)}`;
      return;
    }

    let sLabel = 'Idle', sColor = COLORS.dim;
    if (blocked) { sLabel = 'Blocked'; sColor = COLORS.error; }
    else if (isRunning) {
      const runningDir = runner.getSprintDir();
      const runningSprint = allSprints.find(s => path.resolve(s.path) === path.resolve(runningDir));
      const activeTask = manifest?.tasks.find(t => t.status === 'active');
      const taskSuffix = (activeTask && runningSprint?.id === manifest?.id) ? ` > ${activeTask.id}` : '';
      sLabel = `Running: ${runningSprint?.name || 'Unknown'}${taskSuffix}`;
      sColor = COLORS.warning;
    }
    else if (completed === total && total > 0) { sLabel = 'Complete'; sColor = COLORS.success; }
    sprintStatusText.content = t`${fg(sColor)(`[${sLabel}]`)}`;
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    logs.push({ timestamp: new Date(), message, type });
    if (logs.length > 100) logs.shift();
    if (!activeBlocker) updateActivityLog();
  };

  // Discover sprints and set initial selection
  allSprints = SprintRunner.discoverSprints();
  const initialIndex = allSprints.findIndex(s => path.resolve(s.path) === path.resolve(sprintDir));
  if (initialIndex !== -1) selectedIndex = initialIndex;

  if (bridge) {
    bridge.on('block', (data: BlockRequest) => {
      activeBlocker = data;
      chatInput = '';
      chatFocused = true;
      addLog(`🛑 Blocker: ${data.question || data.reason}`, 'error');
      activeTab = 'activity';
      tabBar.setSelectedIndex(1);
      switchPanel('activity');
    });
    bridge.on('resolve', (response: string) => {
      activeBlocker = null;
      chatInput = '';
      chatFocused = false;
      addLog(`✅ Blocker resolved: ${response.substring(0, 30)}${response.length > 30 ? '...' : ''}`, 'success');
      updateDisplay();
      
      // Auto-restart if runner is not running (it might have exited due to the blocker)
      setTimeout(() => {
        if (!runner.getIsRunning()) {
          addLog('🧠 Restarting sprint with guidance...', 'warning');
          runner.run().catch(err => addLog(`Restart Error: ${err.message}`, 'error'));
        }
      }, 500);
    });
  }

  if (runner) {
    // Enable quiet mode so output doesn't bleed through TUI
    runner.setQuietMode(true);
    
    runner.on('start', () => {
      sprintStartTime = Date.now();
      elapsedSeconds = 0;
      executionLogs = [];
      startSpinner();
      if (!activeBlocker) {
        // Swap activity panel sub-view to execution
        try { activityPanel.remove('activity-header'); } catch { /* ignore */ }
        try { activityPanel.remove('activity-scroll'); } catch { /* ignore */ }
        try { activityPanel.remove('blocker-container'); } catch { /* ignore */ }
        try { activityPanel.remove('execution-container'); } catch { /* ignore */ }
        activityPanel.add(executionContainer);
        currentRightView = 'execution';

        activeTab = 'activity';
        tabBar.setSelectedIndex(1);
        switchPanel('activity');
      }
    });
    runner.on('stop', () => {
      stopSpinner();
      sprintStartTime = null;
      activeTaskId = null;
      activeTaskFile = null;
      if (currentRightView === 'execution') currentRightView = 'activity';
      updateDisplay();
    });
    runner.on('task-start', (data: { taskId: string; file: string }) => {
      stopSpinner();
      activeTaskId = data.taskId;
      activeTaskFile = data.file;
      updateDisplay();
    });
    runner.on('log', (data: { message: string; type: 'info' | 'warning' | 'error' }) => {
      addLog(data.message, data.type);
    });
    runner.on('output', (data: { data: string; stream: string }) => {
      const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
      executionLogs.push(...lines);
      if (executionLogs.length > 200) executionLogs = executionLogs.slice(-200);
      if (currentRightView === 'execution') updateDisplay();
    });
    runner.on('halt', (data: { task: string; reason: string; question: string }) => {
      stopSpinner();
      // Unify halt with the existing blocker UX: show the same "needs help" UI
      bridge.setBlockerContext(data.task, data.question);
      activeBlocker = { task: data.task, reason: data.reason, question: data.question };
      chatInput = '';
      chatFocused = true;
      addLog(`🛑 ${data.reason}: ${data.task}`, 'error');
      activeTab = 'activity';
      tabBar.setSelectedIndex(1);
      switchPanel('activity');
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
    paddingLeft: 2, paddingRight: 2,
    backgroundColor: COLORS.titleBg,
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

  // --- Tab Bar ---
  const tabBar = new TabSelectRenderable(renderer, {
    id: 'tab-bar',
    width: '100%',
    options: [
      { name: 'SPRINTS' },
      { name: 'ACTIVITY' },
    ],
    tabWidth: 20,
    showDescription: false,
    showUnderline: false,
    backgroundColor: COLORS.bg,
    textColor: COLORS.dim,
    selectedBackgroundColor: COLORS.primary,
    selectedTextColor: '#000000',
    focusedBackgroundColor: COLORS.bg,
    focusedTextColor: COLORS.dim,
  });
  root.add(tabBar);

  tabBar.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
    activeTab = index === 0 ? 'sprints' : 'activity';
    switchPanel(activeTab);
  });

  // --- Main Content ---
  const main = new BoxRenderable(renderer, {
    id: 'main', width: '100%', flexGrow: 1, flexDirection: 'column',
    overflow: 'hidden',
  });
  root.add(main);

  // --- Sprints Panel (replaces old leftPanel — now full-width) ---
  const sprintsPanel = new BoxRenderable(renderer, {
    id: 'sprints-panel', width: '100%', height: '100%', flexDirection: 'column',
    padding: 1, backgroundColor: COLORS.panelBg,
  });
  
  const leftPanelHeader = new TextRenderable(renderer, {
    id: 'sprint-plan-header', content: t`${bold(fg(COLORS.primary)('SPRINT PLAN'))}`,
  });
  sprintsPanel.add(leftPanelHeader);
  
  const sprintNameText = new TextRenderable(renderer, {
    id: 'sprint-name', content: t`${dim('Loading...')}`,
  });
  const sprintDescText = new TextRenderable(renderer, {
    id: 'sprint-desc', content: '',
  });
  
  sprintsPanel.add(sprintNameText);
  sprintsPanel.add(sprintDescText);
  
  const taskListBox = new BoxRenderable(renderer, {
    id: 'task-list-box', width: '100%', flexGrow: 1, flexDirection: 'column',
  });
  const taskListContainer = new BoxRenderable(renderer, {
    id: 'task-list', width: '100%', flexDirection: 'column',
  });
  taskListBox.add(taskListContainer);
  sprintsPanel.add(taskListBox);

  const progressText = new TextRenderable(renderer, {
    id: 'progress', content: t`${dim('Progress: ')}${fg(COLORS.dim)('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%')}`,
  });
  sprintsPanel.add(new BoxRenderable(renderer, { id: 'prog-wrap' }).add(progressText));

  // --- Activity Panel (replaces old rightPanel — now full-width) ---
  const activityPanel = new BoxRenderable(renderer, {
    id: 'activity-panel', width: '100%', height: '100%', flexDirection: 'column',
    padding: 1, backgroundColor: COLORS.panelBg,
  });
  
  // Activity Log Components
  const activityHeader = new TextRenderable(renderer, {
    id: 'activity-header', content: t`${bold(fg(COLORS.purple)('ACTIVITY LOG'))}`,
  });
  
  const activityScroll = new ScrollBoxRenderable(renderer, {
    id: 'activity-scroll', width: '100%', flexGrow: 1,
  });
  const activityLogContainer = new BoxRenderable(renderer, {
    id: 'activity-log', width: '100%', flexDirection: 'column',
  });
  activityScroll.add(activityLogContainer);
  
  // Blocker UI Components
  const blockerContainer = new BoxRenderable(renderer, {
    id: 'blocker-container', width: '100%', height: '100%', flexDirection: 'column',
    padding: 1,
  });
  
  const blockerHeader = new TextRenderable(renderer, {
    id: 'blocker-header', content: t`${bold(fg(COLORS.error)('🛑 NEEDS HELP'))}`,
  });
  const blockerDivider = new TextRenderable(renderer, {
    id: 'blocker-divider', content: t`${dim('─'.repeat(50))}`,
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
    id: 'blocker-input-box', width: '100%', height: 3, paddingLeft: 1,
  });
  const blockerInputText = new TextRenderable(renderer, {
    id: 'blocker-input-text', content: '',
  });
  blockerInputBox.add(blockerInputText);
  
  const blockerFooterHint = new TextRenderable(renderer, {
    id: 'blocker-footer-hint', content: t`\n${dim('Type response or "Done" if action taken.  [Enter] Submit  [Esc] Cancel')}`,
  });

  blockerContainer.add(blockerHeader);
  blockerContainer.add(blockerDivider);
  blockerContainer.add(blockerTask);
  blockerContainer.add(blockerReason);
  blockerContainer.add(blockerQuestionLabel);
  blockerContainer.add(blockerQuestion);
  blockerContainer.add(blockerInputBox);
  blockerContainer.add(blockerFooterHint);

  // Execution View Components
  const executionContainer = new BoxRenderable(renderer, {
    id: 'execution-container', width: '100%', height: '100%', flexDirection: 'column',
    padding: 1,
  });
  
  const executionHeader = new TextRenderable(renderer, {
    id: 'execution-header', content: t`${bold(fg(COLORS.warning)('🔄 SPRINT EXECUTING'))}`,
  });
  
  const executionTaskInfo = new BoxRenderable(renderer, {
    id: 'execution-task-info', width: '100%', flexDirection: 'column', padding: 1,
  });
  const execTaskIdText = new TextRenderable(renderer, {
    id: 'exec-task-id', content: '',
  });
  const execTaskFileText = new TextRenderable(renderer, {
    id: 'exec-task-file', content: '',
  });
  const execTimerText = new TextRenderable(renderer, {
    id: 'exec-timer', content: '',
  });
  executionTaskInfo.add(execTaskIdText);
  executionTaskInfo.add(execTaskFileText);
  executionTaskInfo.add(execTimerText);
  
  const execProgressBox = new BoxRenderable(renderer, {
    id: 'exec-progress-box', width: '100%',
  });
  const execProgressText = new TextRenderable(renderer, {
    id: 'exec-progress-text', content: '',
  });
  execProgressBox.add(execProgressText);
  
  const agentOutputHeader = new TextRenderable(renderer, {
    id: 'agent-output-header', content: t`\n${bold(fg(COLORS.primary)('AGENT OUTPUT:'))}`,
  });
  
  const agentOutputScroll = new ScrollBoxRenderable(renderer, {
    id: 'agent-output-scroll', width: '100%', flexGrow: 1,
  });
  const agentOutputContainer = new BoxRenderable(renderer, {
    id: 'agent-output-log', width: '100%', flexDirection: 'column',
  });
  agentOutputScroll.add(agentOutputContainer);
  
  executionContainer.add(executionHeader);
  executionContainer.add(executionTaskInfo);
  executionContainer.add(execProgressBox);
  executionContainer.add(agentOutputHeader);
  executionContainer.add(agentOutputScroll);

  // Initial Activity Panel setup
  activityPanel.add(activityHeader);
  activityPanel.add(activityScroll);

  // --- Panel Swap Logic ---
  let currentPanel: 'sprints' | 'activity' = 'sprints';
  main.add(sprintsPanel); // SPRINTS tab is active by default

  const switchPanel = (tab: 'sprints' | 'activity') => {
    if (tab === currentPanel) return;
    if (currentPanel === 'sprints') {
      main.remove('sprints-panel');
    } else {
      main.remove('activity-panel');
    }
    if (tab === 'sprints') {
      main.add(sprintsPanel);
    } else {
      main.add(activityPanel);
    }
    currentPanel = tab;
    updateDisplay();
  };
  
  // --- Chat Input ---
  const chatInputBox = new BoxRenderable(renderer, {
    id: 'chat-input-box', width: '100%', height: 3, paddingLeft: 1, paddingRight: 1,
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg,
  });
  const chatInputLabel = new TextRenderable(renderer, {
    id: 'chat-input-label', content: t`${dim('CHAT > ')}`,
  });
  const chatInputText = new TextRenderable(renderer, {
    id: 'chat-input-text', content: '',
  });
  chatInputBox.add(chatInputLabel);
  chatInputBox.add(chatInputText);
  root.add(chatInputBox);

  // --- Footer ---
  const footer = new BoxRenderable(renderer, {
    id: 'footer', width: '100%', height: 3, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingLeft: 2, paddingRight: 2,
    backgroundColor: COLORS.statusBg,
  });
  
  const statusText = new TextRenderable(renderer, {
    id: 'status', content: t`${fg(COLORS.success)('STATUS: Ready')}`,
  });
  const hotkeyText = new TextRenderable(renderer, {
    id: 'hotkeys', content: t`${dim('[QQ]uit  [R]efresh')}`,
  });
  
  footer.add(statusText);
  footer.add(hotkeyText);
  root.add(footer);

  // --- UI Update Helpers ---
  interface Identifiable { id: string; }
  const taskElements: Identifiable[] = [];
  const logElements: Identifiable[] = [];
  const sprintElements: Identifiable[] = [];
  const agentOutputLogElements: Identifiable[] = [];

  const clearLeftPanel = () => {
    taskElements.forEach(el => { try { taskListContainer.remove(el.id); } catch { /* ignore */ } });
    taskElements.length = 0;
    sprintElements.forEach(el => { try { taskListContainer.remove(el.id); } catch { /* ignore */ } });
    sprintElements.length = 0;
  };

  const updateSprintList = () => {
    clearLeftPanel();

    const isRunning = runner.getIsRunning();
    const runningDir = runner.getSprintDir();

    if (allSprints.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'sprint-empty',
        content: t`\n${dim('  No sprints discovered.')}\n${dim('  Run "clifford init" then create a sprint.')}`,
      });
      sprintElements.push(emptyEl);
      taskListContainer.add(emptyEl);
      return;
    }

    allSprints.forEach((s, i) => {
      const isSelected = i === selectedIndex;
      const isThisRunning = isRunning && path.resolve(runningDir) === path.resolve(s.path);
      const otherRunning = isRunning && !isThisRunning;
      const hasPending = s.tasks.some(t => t.status === 'pending');
      const isComplete = s.tasks.every(t => t.status === 'completed' || t.status === 'pushed');

      const itemBox = new BoxRenderable(renderer, {
        id: `sprint-item-${i}`,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
      });

      const prefix = isSelected ? '> ' : '  ';
      const runningIndicator = isThisRunning ? ' 🔄' : '';
      const displayName = stripEmoji(s.name);
      const labelContent = `${prefix}${displayName}${runningIndicator}`;
      
      const label = new TextRenderable(renderer, {
        id: `sprint-label-${i}`,
        content: isSelected
          ? t`${bold(fg(COLORS.primary)(labelContent))}`
          : otherRunning
            ? t`${dim(labelContent)}`
            : t`${fg(COLORS.text)(labelContent)}`,
      });
      itemBox.add(label);

      // Right side: status indicator
      let statusIndicator = '';
      if (isThisRunning) {
        statusIndicator = 'running';
      } else if (isComplete) {
        statusIndicator = '✅';
      } else if (hasPending && !otherRunning) {
        statusIndicator = '[▶]';
      }
      
      if (statusIndicator) {
        const statusLabel = new TextRenderable(renderer, {
          id: `sprint-status-${i}`,
          content: isThisRunning
            ? t`${fg(COLORS.warning)(statusIndicator)}`
            : isComplete
              ? t`${fg(COLORS.success)(statusIndicator)}`
              : hasPending && !otherRunning
                ? t`${fg(COLORS.success)(statusIndicator)}`
                : t`${dim(statusIndicator)}`,
        });
        itemBox.add(statusLabel);
      }

      sprintElements.push(itemBox);
      taskListContainer.add(itemBox);
    });
  };

  const updateTaskList = () => {
    clearLeftPanel();
    if (!manifest) return;

    if (manifest.tasks.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'task-empty',
        content: t`\n${dim('  No tasks defined in this sprint.')}`,
      });
      taskElements.push(emptyEl);
      taskListContainer.add(emptyEl);
      return;
    }

    const isRunning = runner.getIsRunning();

    manifest.tasks.forEach((task, i) => {
      const itemBox = new BoxRenderable(renderer, {
        id: `task-item-${i}`,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
      });

      // Check if this task is currently being executed by the runner
      const isActiveTask = isRunning && activeTaskId === task.id;
      const displayStatus = isActiveTask ? 'active' : task.status;
      const displayIcon = isActiveTask ? STATUS_ICONS['active'] : STATUS_ICONS[task.status];
      const displayColor = isActiveTask ? STATUS_COLORS['active'] : STATUS_COLORS[task.status];

      const labelContent = `${displayIcon} ${task.id}`;
      const label = new TextRenderable(renderer, {
        id: `task-label-${i}`,
        content: isActiveTask
          ? t`${bold(fg(displayColor)(labelContent))}`
          : t`${fg(displayColor)(labelContent)}`,
      });
      itemBox.add(label);

      const rightBox = new BoxRenderable(renderer, {
        id: `task-right-${i}`,
        flexDirection: 'row',
      });

      const playIndicator = (task.status === 'pending' && !isActiveTask)
        ? (isRunning ? dim('[▶]') : fg(COLORS.success)('[▶]'))
        : '';

      const statusLabel = new TextRenderable(renderer, {
        id: `task-status-${i}`,
        content: playIndicator
          ? t`${fg(displayColor)(displayStatus)} ${playIndicator}`
          : t`${fg(displayColor)(displayStatus)}`,
      });
      rightBox.add(statusLabel);

      itemBox.add(rightBox);

      taskElements.push(itemBox);
      taskListContainer.add(itemBox);
    });
  };

  const updateActivityLog = () => {
    logElements.forEach(el => { try { activityLogContainer.remove(el.id); } catch { /* ignore */ } });
    logElements.length = 0;
    
    if (logs.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'log-empty',
        content: t`\n${dim('  No activity yet. Start a sprint to see logs here.')}`,
      });
      logElements.push(emptyEl);
      activityLogContainer.add(emptyEl);
      return;
    }

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
    const isSprintsView = viewMode === 'sprints';
    const isTasksView = viewMode === 'tasks';

    // Top-level status (delegated to shared helper that also handles spinner)
    const completed = manifest ? manifest.tasks.filter(t => t.status === 'completed' || t.status === 'pushed').length : 0;
    const total = manifest ? manifest.tasks.length : 0;
    const isRunning = runner.getIsRunning();

    updateHeaderStatus();

    // Only rebuild sprints panel content when it's visible
    if (activeTab === 'sprints') {
      if (isSprintsView) {
        leftPanelHeader.content = t`${bold(fg(COLORS.primary)('AVAILABLE SPRINTS'))}`;
        sprintNameText.content = t`${fg(COLORS.text)('Select a sprint to view tasks')}`;
        sprintDescText.content = t`${dim('Use ↑↓ to navigate, → to drill in')}`;
        updateSprintList();
        progressText.content = t`${dim('Progress: ')}${fg(COLORS.dim)(generateProgressBar(0, 0, 30))}`;
      } else {
        const hasPendingTasks = manifest && manifest.tasks.some(t => t.status === 'pending');
        const canStart = hasPendingTasks && !isRunning;
        
        if (canStart) {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))} ${fg(COLORS.success)('[S] Start')}`;
        } else if (isRunning) {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))} ${fg(COLORS.warning)('[Running]')}`;
        } else {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))}`;
        }
        
        if (manifest) {
          sprintNameText.content = t`${fg(COLORS.text)(manifest.name)}`;
          sprintDescText.content = t`${dim(manifest.id)} ${dim('[←] Back')}`;
        }
        updateTaskList();
        const progress = generateProgressBar(completed, total, 30);
        progressText.content = t`${dim('Progress: ')}${fg(completed === total && total > 0 ? COLORS.success : COLORS.primary)(progress)}`;
      }
    }
    
    // Toggle Activity Panel sub-views
    // Exception: blocker activation ALWAYS updates regardless of tab
    if (activeBlocker) {
      if (currentRightView !== 'blocker') {
        try { activityPanel.remove('activity-header'); } catch { /* ignore */ }
        try { activityPanel.remove('activity-scroll'); } catch { /* ignore */ }
        try { activityPanel.remove('execution-container'); } catch { /* ignore */ }
        activityPanel.add(blockerContainer);
        currentRightView = 'blocker';
      }
      
      blockerTask.content = t`${dim('Task: ')}${fg(COLORS.text)(activeBlocker.task || 'Unknown')}`;
      blockerReason.content = t`${dim('Reason: ')}${fg(COLORS.text)(activeBlocker.reason || 'Unknown')}`;
      blockerQuestion.content = t`${fg(COLORS.warning)(`"${activeBlocker.question || 'No question provided'}"`)}`;
      
      // Hide the old blocker input box by giving it 0 height
      blockerInputBox.height = 0;
      blockerInputText.content = '';
      
      hotkeyText.content = t`${dim('"Done" = resume')}  ${bold('[Enter]')} Submit  ${bold('[Esc]')} Cancel`;
    } else if (activeTab === 'activity') {
      // Only update activity panel content when visible
      if (isRunning && currentRightView === 'execution') {
        execTaskIdText.content = t`${bold(fg(COLORS.primary)('Task ID: '))}${fg(COLORS.text)(activeTaskId || 'Initializing...')}`;
        execTaskFileText.content = t`${bold(fg(COLORS.primary)('File:    '))}${fg(COLORS.text)(activeTaskFile || '...')}`;
        
        const mm = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
        const ss = (elapsedSeconds % 60).toString().padStart(2, '0');
        execTimerText.content = t`${bold(fg(COLORS.primary)('Elapsed: '))}${fg(COLORS.warning)(`${mm}:${ss}`)}`;
        
        const progress = generateProgressBar(completed, total, 30);
        execProgressText.content = t`${bold(fg(COLORS.primary)('Progress: '))}${fg(completed === total && total > 0 ? COLORS.success : COLORS.primary)(progress)} (${completed}/${total})`;

        // Update agent output
        agentOutputLogElements.forEach(el => { try { agentOutputContainer.remove(el.id); } catch { /* ignore */ } });
        agentOutputLogElements.length = 0;
        executionLogs.slice(-20).forEach((line, i) => {
          const el = new TextRenderable(renderer, {
            id: `exec-log-${i}`,
            content: t`${dim('> ')}${fg(COLORS.text)(line.substring(0, 100))}`,
          });
          agentOutputLogElements.push(el);
          agentOutputContainer.add(el);
        });
      } else {
        if (currentRightView !== 'activity') {
          try { activityPanel.remove('blocker-container'); } catch { /* ignore */ }
          try { activityPanel.remove('execution-container'); } catch { /* ignore */ }
          activityPanel.add(activityHeader);
          activityPanel.add(activityScroll);
          currentRightView = 'activity';
        }
        updateActivityLog();
      }
    }

    // Footer hotkey hints — tab-context-aware
    if (activeBlocker) {
      // Already set above in the blocker block
    } else if (chatFocused) {
      hotkeyText.content = t`${bold('[Enter]')} Send  ${bold('[Esc]')} Cancel`;
    } else if (activeTab === 'sprints') {
      if (isSprintsView) {
        hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[→] Select'))}  ${bold(fg(COLORS.primary)('[/] Chat'))}`;
      } else if (isTasksView && !isRunning) {
        hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[←] Back'))}  ${bold(fg(COLORS.success)('[S]tart'))}  ${bold(fg(COLORS.primary)('[/] Chat'))}`;
      } else if (isRunning) {
        hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.error)('[X] Stop'))}  ${bold(fg(COLORS.warning)('[V]iew'))}  ${bold(fg(COLORS.primary)('[/] Chat'))}`;
      }
    } else if (activeTab === 'activity') {
      if (isRunning) {
        hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Sprints'))}  ${bold(fg(COLORS.error)('[X] Stop'))}  ${bold(fg(COLORS.primary)('[/] Chat'))}`;
      } else {
        hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Sprints'))}  ${dim('[R]efresh')}  ${bold(fg(COLORS.primary)('[/] Chat'))}`;
      }
    }

    // Update Chat Input UI
    const chatPrompt = activeBlocker 
      ? t`${bold(fg(COLORS.error)('🛑 > '))}` 
      : (chatFocused ? t`${bold(fg(COLORS.primary)('CHAT > '))}` : t`${dim('CHAT > ')}`);
    
    chatInputLabel.content = chatPrompt;
    chatInputText.content = (chatFocused || activeBlocker) 
      ? t`${chatInput}${bold(fg(activeBlocker ? COLORS.error : COLORS.primary)('█'))}` 
      : t`${dim(chatInput || 'Press / to chat...')}`;
  };

  // --- Manifest Polling ---
  /** Build a snapshot map of task ID → status for efficient comparison */
  const buildStatusSnapshot = (m: Manifest): Map<string, Task['status']> => {
    const snapshot = new Map<string, Task['status']>();
    m.tasks.forEach(task => snapshot.set(task.id, task.status));
    return snapshot;
  };

  /** Track the previous status snapshot separately from the manifest object */
  let previousStatusSnapshot: Map<string, Task['status']> | null = null;

  const loadManifest = () => {
    // Skip polling when not viewing tasks and no sprint is running
    if (viewMode === 'sprints' && !runner.getIsRunning()) return;

    const p = path.resolve(currentSprintDir, 'manifest.json');
    try {
      if (fs.existsSync(p)) {
        const m: Manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
        const newSnapshot = buildStatusSnapshot(m);

        // Only compare and log when we have a previous snapshot for the same sprint
        let hasChanges = false;

        if (previousManifest && previousManifest.id === m.id && previousStatusSnapshot) {
          // Compare by task ID, not array index
          for (const [taskId, newStatus] of newSnapshot) {
            const prevStatus = previousStatusSnapshot.get(taskId);
            if (prevStatus !== undefined && prevStatus !== newStatus) {
              hasChanges = true;
              addLog(`${STATUS_ICONS[newStatus]} ${taskId}: ${prevStatus} → ${newStatus}`,
                newStatus === 'completed' ? 'success' : newStatus === 'blocked' ? 'error' : newStatus === 'active' ? 'warning' : 'info');
            }
          }
        } else if (!previousManifest || previousManifest.id !== m.id) {
          // First load or sprint switch — treat as a change to trigger initial render
          hasChanges = true;
        }

        manifest = m;
        previousManifest = m;
        previousStatusSnapshot = newSnapshot;

        // Only re-render when there are actual changes
        if (hasChanges) updateDisplay();
      }
    } catch { /* ignore parse errors */ }
  };

  const poll = setInterval(loadManifest, 1000);
  loadManifest();

  // Always render initial display (loadManifest skips when in sprints view)
  updateDisplay();

  setInterval(() => {
    if (sprintStartTime) {
      elapsedSeconds = Math.floor((Date.now() - sprintStartTime) / 1000);
      if (currentRightView === 'execution') updateDisplay();
    }
  }, 1000);

  addLog('Dashboard initialized', 'info');

  // --- Input ---
  renderer.keyInput.on('keypress', (key: { name: string, ctrl: boolean, sequence: string }) => {
    // Ctrl+C: instant quit regardless of mode
    if (key.ctrl && key.name === 'c') {
      stopSpinner();
      clearInterval(poll);
      renderer.destroy();
      process.exit(0);
    }

    // Q to quit — double-press required, only when not typing in chat or blocker input
    if (key.name === 'q' && !activeBlocker && !chatFocused) {
      if (quitPending) {
        // Second Q press — actually quit
        cancelQuit();
        stopSpinner();
        clearInterval(poll);
        renderer.destroy();
        process.exit(0);
      } else {
        // First Q press — show confirmation in status bar
        quitPending = true;
        statusText.content = t`${fg(COLORS.warning)('Press Q again to quit')}`;
        quitTimer = setTimeout(() => {
          cancelQuit();
          statusText.content = t`${fg(COLORS.success)('STATUS: Ready')}`;
        }, 3000);
        return;
      }
    }

    // Any non-Q key cancels the quit confirmation
    if (quitPending && key.name !== 'q') {
      cancelQuit();
      statusText.content = t`${fg(COLORS.success)('STATUS: Ready')}`;
    }

    const isEnter = key.name === 'enter' || key.name === 'return';

    if (activeBlocker) {
      if (isEnter) {
        if (chatInput.trim()) {
          const response = chatInput.trim();
          const taskId = activeBlocker.task || '';
          const isDone = response.toLowerCase() === 'done' || response.toLowerCase() === 'done.';
          
          // Append the user's response to the task file (unless "Done")
          if (!isDone && manifest && taskId) {
            const task = manifest.tasks.find(t => t.id === taskId);
            if (task) {
              const taskFilePath = path.resolve(currentSprintDir, task.file);
              try {
                const existing = fs.readFileSync(taskFilePath, 'utf8');
                const appendix = `\n\n## Supplemental Info\n${response}\n`;
                fs.writeFileSync(taskFilePath, existing + appendix, 'utf8');
                addLog(`📝 Appended guidance to ${task.file}`, 'success');
              } catch (err) {
                addLog(`❌ Failed to update task file: ${(err as Error).message}`, 'error');
              }
            }
          }
          
          // Clear blocker state and unpause bridge
          activeBlocker = null;
          chatInput = '';
          chatFocused = false;
          bridge.resume();
          
          if (isDone) {
            addLog(`✅ Action confirmed. Restarting sprint...`, 'success');
          } else {
            addLog(`✅ Guidance saved. Restarting sprint...`, 'success');
          }
          updateDisplay();
          
          // Restart the sprint
          setTimeout(() => {
            if (!runner.getIsRunning()) {
              runner.run().catch(err => addLog(`Restart Error: ${err.message}`, 'error'));
            }
          }, 500);
        }
      } else if (key.name === 'escape') {
        activeBlocker = null;
        chatInput = '';
        chatFocused = false;
        bridge.resume();
        if (runner.getIsRunning()) runner.stop();
        addLog('Help dismissed, sprint stopped.', 'warning');
        updateDisplay();
      } else if (key.name === 'backspace') {
        chatInput = chatInput.slice(0, -1);
        updateDisplay();
      } else if (key.sequence && key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 126) {
        chatInput += key.sequence;
        updateDisplay();
      }
    } else if (chatFocused) {
      if (isEnter) {
        if (chatInput.trim()) {
          addLog(`[You] ${chatInput.trim()}`);
          chatInput = '';
          chatFocused = false;
          updateDisplay();
        }
      } else if (key.name === 'escape') {
        chatInput = '';
        chatFocused = false;
        updateDisplay();
      } else if (key.name === 'backspace') {
        chatInput = chatInput.slice(0, -1);
        updateDisplay();
      } else if (key.sequence && key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 126) {
        chatInput += key.sequence;
        updateDisplay();
      }
    } else {
      // Global shortcuts (work regardless of active tab)
      if (key.sequence === '/') {
        chatFocused = true;
        updateDisplay();
        return;
      }

      // Tab switching via Tab key
      if (key.name === 'tab') {
        const newTab = activeTab === 'sprints' ? 'activity' : 'sprints';
        activeTab = newTab;
        tabBar.setSelectedIndex(newTab === 'sprints' ? 0 : 1);
        switchPanel(newTab);
        return;
      }

      // Navigation keys — only active on SPRINTS tab
      if (key.name === 'up') {
        if (activeTab === 'sprints' && viewMode === 'sprints') {
          selectedIndex = Math.max(0, selectedIndex - 1);
          updateDisplay();
        }
      } else if (key.name === 'down') {
        if (activeTab === 'sprints' && viewMode === 'sprints') {
          selectedIndex = Math.min(allSprints.length - 1, selectedIndex + 1);
          updateDisplay();
        }
      } else if (key.name === 'right') {
        if (activeTab === 'sprints' && viewMode === 'sprints' && allSprints[selectedIndex]) {
          const selected = allSprints[selectedIndex];
          currentSprintDir = selected.path;
          viewMode = 'tasks';
          manifest = null;
          previousManifest = null;
          previousStatusSnapshot = null;
          loadManifest();
        }
      } else if (key.name === 'left' || key.sequence === '\u001b[D') {
        if (activeTab === 'sprints' && viewMode === 'tasks') {
          viewMode = 'sprints';
          manifest = null;
          previousManifest = null;
          previousStatusSnapshot = null;
          updateDisplay();
        }
      }

      // Global actions (work regardless of active tab)
      if (key.name === 'r') {
        addLog('Manual refresh', 'info');
        loadManifest();
      }
      if (key.name === 's') {
        if (viewMode === 'tasks' && !runner.getIsRunning()) {
          runner.setSprintDir(currentSprintDir);
          addLog(`Starting sprint: ${manifest?.name || currentSprintDir}`, 'warning');
          runner.run().catch(err => {
            stopSpinner();
            addLog(`Runner Error: ${err.message}`, 'error');
          });
        } else if (runner.getIsRunning()) {
          const runningDir = runner.getSprintDir();
          const runningSprint = allSprints.find(s => path.resolve(s.path) === path.resolve(runningDir));
          addLog(`Already running: ${runningSprint?.name || 'Another sprint'}`, 'warning');
        }
      }
      if (key.name === 'x' && runner.getIsRunning()) {
        addLog('Stopping sprint...', 'error');
        runner.stop();
      }
      if (key.name === 'v' && runner.getIsRunning()) {
        currentRightView = 'execution';
        activeTab = 'activity';
        tabBar.setSelectedIndex(1);
        switchPanel('activity');
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
