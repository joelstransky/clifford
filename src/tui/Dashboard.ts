import path from 'path';
import { CommsBridge } from '../utils/bridge.js';
import { SprintRunner } from '../utils/sprint.js';
import { stripEmoji } from '../utils/text.js';
import { DashboardController, Task, LogEntry } from './DashboardController.js';

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

  // ─── Controller ────────────────────────────────────────────────────────────
  const ctrl = new DashboardController(sprintDir, bridge, runner);

  // ─── Root ──────────────────────────────────────────────────────────────────
  const root = new BoxRenderable(renderer, {
    id: 'root', width: '100%', height: '100%', flexDirection: 'column',
  });
  renderer.root.add(root);

  // ─── Header ────────────────────────────────────────────────────────────────
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

  // ─── Tab Bar ───────────────────────────────────────────────────────────────
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
    ctrl.switchTab(index === 0 ? 'sprints' : 'activity');
  });

  // ─── Main Content ──────────────────────────────────────────────────────────
  const main = new BoxRenderable(renderer, {
    id: 'main', width: '100%', flexGrow: 1, flexDirection: 'column',
    overflow: 'hidden',
  });
  root.add(main);

  // ─── Sprints Panel ─────────────────────────────────────────────────────────
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

  // ─── Activity Panel ────────────────────────────────────────────────────────
  const activityPanel = new BoxRenderable(renderer, {
    id: 'activity-panel', width: '100%', height: '100%', flexDirection: 'column',
    padding: 1, backgroundColor: COLORS.panelBg,
  });
  
  const activityInfoPanel = new BoxRenderable(renderer, {
    id: 'activity-info-panel', width: '100%', flexDirection: 'column',
    paddingLeft: 1, paddingRight: 1,
  });

  const infoSprintText = new TextRenderable(renderer, {
    id: 'info-sprint', content: '', width: '100%',
  });
  const infoTaskText = new TextRenderable(renderer, {
    id: 'info-task', content: '', width: '100%',
  });
  const infoTimerText = new TextRenderable(renderer, {
    id: 'info-timer', content: '', width: '100%',
  });
  const infoProgressText = new TextRenderable(renderer, {
    id: 'info-progress', content: '', width: '100%',
  });

  activityInfoPanel.add(infoSprintText);
  activityInfoPanel.add(infoTaskText);
  activityInfoPanel.add(infoTimerText);
  activityInfoPanel.add(infoProgressText);

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
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg,
  });
  const blockerInputLabel = new TextRenderable(renderer, {
    id: 'blocker-input-label', content: t`${bold(fg(COLORS.error)('🛑 > '))}`,
  });
  const blockerInputText = new TextRenderable(renderer, {
    id: 'blocker-input-text', content: '',
  });
  blockerInputBox.add(blockerInputLabel);
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

  // Initial Activity Panel setup
  activityPanel.add(activityInfoPanel);
  activityPanel.add(activityHeader);
  activityPanel.add(activityScroll);

  // ─── Panel Swap Logic ──────────────────────────────────────────────────────
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
  
  // ─── Footer ────────────────────────────────────────────────────────────────
  const footer = new BoxRenderable(renderer, {
    id: 'footer', width: '100%', height: 3, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingLeft: 2, paddingRight: 2,
    backgroundColor: COLORS.statusBg,
  });
  
  const statusText = new TextRenderable(renderer, {
    id: 'status', content: t`${fg(COLORS.success)('Ready')}`,
  });
  const hotkeyText = new TextRenderable(renderer, {
    id: 'hotkeys', content: t`${dim('[QQ]uit  [R]efresh')}`,
  });
  
  footer.add(statusText);
  footer.add(hotkeyText);
  root.add(footer);

  // ─── UI Element Tracking ───────────────────────────────────────────────────
  interface Identifiable { id: string; }
  const taskElements: Identifiable[] = [];
  const logElements: Identifiable[] = [];
  const sprintElements: Identifiable[] = [];

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const clearLeftPanel = () => {
    taskElements.forEach(el => { try { taskListContainer.remove(el.id); } catch { /* ignore */ } });
    taskElements.length = 0;
    sprintElements.forEach(el => { try { taskListContainer.remove(el.id); } catch { /* ignore */ } });
    sprintElements.length = 0;
  };

  /** Update the header status badge (spinner or text). */
  const updateHeaderStatus = () => {
    const { completedCount, totalCount, isRunning, isBlocked, manifest: m } = ctrl;

    if (ctrl.isSpinnerActive) {
      const frame = ctrl.currentSpinnerFrame;
      sprintStatusText.content = t`${fg(COLORS.warning)(`[${frame} Starting...]`)}`;
      return;
    }

    let sLabel = 'Idle', sColor = COLORS.dim;
    if (isBlocked) {
      sLabel = 'Blocked'; sColor = COLORS.error;
    } else if (isRunning) {
      const runningDir = ctrl.getRunnerSprintDir();
      const runningSprint = ctrl.allSprints.find(s => path.resolve(s.path) === path.resolve(runningDir));
      const activeTask = m?.tasks.find(t => t.status === 'active');
      const taskSuffix = (activeTask && runningSprint?.id === m?.id) ? ` > ${activeTask.id}` : '';
      sLabel = `Running: ${runningSprint?.name || 'Unknown'}${taskSuffix}`;
      sColor = COLORS.warning;
    } else if (completedCount === totalCount && totalCount > 0) {
      sLabel = 'Complete'; sColor = COLORS.success;
    }
    sprintStatusText.content = t`${fg(sColor)(`[${sLabel}]`)}`;
  };

  /** Update the footer status bar. */
  const updateStatusBar = () => {
    if (ctrl.quitPending) return; // Don't overwrite quit confirmation

    const { isRunning, completedCount, totalCount, activeBlocker: blocker } = ctrl;

    if (blocker) {
      statusText.content = t`${fg(COLORS.error)('Needs Help')}`;
    } else if (isRunning) {
      statusText.content = t`${fg(COLORS.warning)(ctrl.getRunnerStatus())}`;
    } else if (!isRunning && completedCount === totalCount && totalCount > 0) {
      statusText.content = t`${fg(COLORS.success)('Sprint Complete')}`;
    } else {
      statusText.content = t`${fg(COLORS.success)('Ready')}`;
    }
  };

  const updateSprintList = () => {
    clearLeftPanel();

    const { allSprints, selectedIndex, isRunning } = ctrl;
    const runningDir = ctrl.getRunnerSprintDir();

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

      // Derive sprint status label
      let statusLabel = 'Pending';
      let statusColor = COLORS.dim;

      if (isThisRunning) {
        statusLabel = 'Active';
        statusColor = COLORS.warning;
      } else if (s.tasks.some(tk => tk.status === 'blocked')) {
        statusLabel = 'Blocked';
        statusColor = COLORS.error;
      } else if (s.tasks.length > 0 && s.tasks.every(tk => tk.status === 'pushed')) {
        statusLabel = 'Published';
        statusColor = COLORS.primary;
      } else if (s.tasks.length > 0 && s.tasks.every(tk => tk.status === 'completed' || tk.status === 'pushed')) {
        statusLabel = 'Complete';
        statusColor = COLORS.success;
      }

      const statusEl = new TextRenderable(renderer, {
        id: `sprint-status-${i}`,
        content: t`${fg(statusColor)(statusLabel)}`,
      });
      itemBox.add(statusEl);

      sprintElements.push(itemBox);
      taskListContainer.add(itemBox);
    });
  };

  const updateTaskList = () => {
    clearLeftPanel();
    const { manifest: m, isRunning, activeTaskId } = ctrl;
    if (!m) return;

    if (m.tasks.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'task-empty',
        content: t`\n${dim('  No tasks defined in this sprint.')}`,
      });
      taskElements.push(emptyEl);
      taskListContainer.add(emptyEl);
      return;
    }

    const STATUS_ICONS = DashboardController.STATUS_ICONS;
    const STATUS_LABELS = DashboardController.STATUS_LABELS;

    m.tasks.forEach((task, i) => {
      const itemBox = new BoxRenderable(renderer, {
        id: `task-item-${i}`,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
      });

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

      const statusLabel = new TextRenderable(renderer, {
        id: `task-status-${i}`,
        content: t`${fg(displayColor)(STATUS_LABELS[displayStatus])}`,
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
    
    if (ctrl.logs.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'log-empty',
        content: t`\n${dim('  No activity yet. Start a sprint to see logs here.')}`,
      });
      logElements.push(emptyEl);
      activityLogContainer.add(emptyEl);
      return;
    }

    ctrl.logs.slice(-20).forEach((log: LogEntry, i: number) => {
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

  // Track which sub-view is rendered in the activity panel
  let currentRightView: 'activity' | 'blocker' = 'activity';

  const updateDisplay = () => {
    const { viewMode, activeTab, manifest: m, completedCount, totalCount, isRunning } = ctrl;
    const isSprintsView = viewMode === 'sprints';
    const isTasksView = viewMode === 'tasks';

    updateHeaderStatus();
    updateStatusBar();

    // Only rebuild sprints panel content when it's visible
    if (activeTab === 'sprints') {
      if (isSprintsView) {
        leftPanelHeader.content = t`${bold(fg(COLORS.primary)('AVAILABLE SPRINTS'))}`;
        sprintNameText.content = t`${fg(COLORS.text)('Select a sprint to view tasks')}`;
        sprintDescText.content = t`${dim('Use ↑↓ to navigate, → to drill in')}`;
        updateSprintList();
        progressText.content = t`${dim('Progress: ')}${fg(COLORS.dim)(generateProgressBar(0, 0, 30))}`;
      } else {
        const canStart = ctrl.canSprintStart();
        
        if (canStart) {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))} ${fg(COLORS.success)('[S] Start')}`;
        } else if (isRunning) {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))} ${fg(COLORS.warning)('[Running]')}`;
        } else {
          leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))}`;
        }
        
        if (m) {
          sprintNameText.content = t`${fg(COLORS.text)(m.name)}`;
          sprintDescText.content = t`${dim(m.id)} ${dim('[←] Back')}`;
        }
        updateTaskList();
        const progress = generateProgressBar(completedCount, totalCount, 30);
        progressText.content = t`${dim('Progress: ')}${fg(completedCount === totalCount && totalCount > 0 ? COLORS.success : COLORS.primary)(progress)}`;
      }
    }

    // Toggle Activity Panel sub-views
    if (ctrl.activeBlocker) {
      if (currentRightView !== 'blocker') {
        try { activityPanel.remove('activity-info-panel'); } catch { /* ignore */ }
        try { activityPanel.remove('activity-header'); } catch { /* ignore */ }
        try { activityPanel.remove('activity-scroll'); } catch { /* ignore */ }
        activityPanel.add(blockerContainer);
        currentRightView = 'blocker';
      }
      
      blockerTask.content = t`${dim('Task: ')}${fg(COLORS.text)(ctrl.activeBlocker.task || 'Unknown')}`;
      blockerReason.content = t`${dim('Reason: ')}${fg(COLORS.text)(ctrl.activeBlocker.reason || 'Unknown')}`;
      blockerQuestion.content = t`${fg(COLORS.warning)(`"${ctrl.activeBlocker.question || 'No question provided'}"`)}`;
      
      blockerInputText.content = t`${ctrl.chatInput}${bold(fg(COLORS.error)('█'))}`;
      
      hotkeyText.content = t`${dim('"Done" = resume')}  ${bold('[Enter]')} Submit  ${bold('[Esc]')} Cancel`;
    } else {
      if (currentRightView !== 'activity') {
        try { activityPanel.remove('blocker-container'); } catch { /* ignore */ }
        activityPanel.add(activityInfoPanel);
        activityPanel.add(activityHeader);
        activityPanel.add(activityScroll);
        currentRightView = 'activity';
      }

      // Populate the header panel
      if (isRunning || ctrl.sprintStartTime) {
        const sprintName = m?.name || 'Unknown';
        infoSprintText.content = t`${bold(fg(COLORS.primary)('Sprint: '))}${fg(COLORS.text)(sprintName)}`;
        infoTaskText.content = t`${bold(fg(COLORS.primary)('Task:   '))}${fg(COLORS.text)(ctrl.activeTaskId || 'Initializing...')}`;

        const mm = Math.floor(ctrl.elapsedSeconds / 60).toString().padStart(2, '0');
        const ss = (ctrl.elapsedSeconds % 60).toString().padStart(2, '0');
        infoTimerText.content = t`${bold(fg(COLORS.primary)('Elapsed: '))}${fg(COLORS.warning)(`${mm}:${ss}`)}`;

        const progress = generateProgressBar(completedCount, totalCount, 30);
        infoProgressText.content = t`${bold(fg(COLORS.primary)('Progress: '))}${fg(completedCount === totalCount && totalCount > 0 ? COLORS.success : COLORS.primary)(progress)} (${completedCount}/${totalCount})`;
      } else {
        infoSprintText.content = '';
        infoTaskText.content = '';
        infoTimerText.content = '';
        infoProgressText.content = '';
      }

      if (activeTab === 'activity') {
        updateActivityLog();
      }
    }

    // Footer hotkey hints — tab-context-aware
    if (!ctrl.activeBlocker) {
      if (activeTab === 'sprints') {
        if (isSprintsView) {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[→] Select'))}`;
        } else if (isTasksView && !isRunning) {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[←] Back'))}  ${bold(fg(COLORS.success)('[S]tart'))}`;
        } else if (isRunning) {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.error)('[X] Stop'))}`;
        }
      } else if (activeTab === 'activity') {
        if (isRunning) {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Sprints'))}  ${bold(fg(COLORS.error)('[X] Stop'))}`;
        } else {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Sprints'))}  ${dim('[R]efresh')}`;
        }
      }
    }
  };

  // ─── Controller Event Subscriptions ────────────────────────────────────────

  ctrl.on('state-changed', () => {
    updateDisplay();
  });

  ctrl.on('log-added', () => {
    if (!ctrl.activeBlocker) updateActivityLog();
  });

  ctrl.on('tab-changed', (tab: 'sprints' | 'activity') => {
    tabBar.setSelectedIndex(tab === 'sprints' ? 0 : 1);
    switchPanel(tab);
  });

  ctrl.on('quit-confirmed', () => {
    ctrl.destroy();
    renderer.destroy();
    process.exit(0);
  });

  // ─── Initialize Controller (wires events, starts polling) ──────────────────
  ctrl.init();
  updateDisplay(); // initial render

  // ─── Input ─────────────────────────────────────────────────────────────────
  renderer.keyInput.on('keypress', (key: { name: string, ctrl: boolean, sequence: string }) => {
    // Ctrl+C: instant quit regardless of mode
    if (key.ctrl && key.name === 'c') {
      ctrl.destroy();
      renderer.destroy();
      process.exit(0);
    }

    // Q to quit — double-press required, only when not typing in blocker input
    if (key.name === 'q' && !ctrl.activeBlocker) {
      if (ctrl.handleQuitPress()) return; // quit-confirmed event handles exit

      // First press — show confirmation in status bar
      statusText.content = t`${fg(COLORS.warning)('Press Q again to quit')}`;
      return;
    }

    // Any non-Q key cancels the quit confirmation
    if (ctrl.quitPending && key.name !== 'q') {
      ctrl.cancelQuit();
    }

    const isEnter = key.name === 'enter' || key.name === 'return';

    if (ctrl.activeBlocker) {
      if (isEnter) {
        ctrl.handleBlockerSubmit();
      } else if (key.name === 'escape') {
        ctrl.handleBlockerDismiss();
      } else if (key.name === 'backspace') {
        ctrl.handleBlockerBackspace();
      } else if (key.sequence && key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 126) {
        ctrl.handleBlockerChar(key.sequence);
      }
    } else {
      // Tab switching via Tab key
      if (key.name === 'tab') {
        const newTab = ctrl.activeTab === 'sprints' ? 'activity' : 'sprints';
        ctrl.switchTab(newTab);
        return;
      }

      // Navigation keys
      if (key.name === 'up') {
        ctrl.navigateUp();
      } else if (key.name === 'down') {
        ctrl.navigateDown();
      } else if (key.name === 'right') {
        ctrl.drillIntoSprint();
      } else if (key.name === 'left' || key.sequence === '\u001b[D') {
        ctrl.drillBack();
      }

      // Global actions
      if (key.name === 'r') {
        ctrl.refresh();
      }
      if (key.name === 's') {
        ctrl.startSprint();
      }
      if (key.name === 'x') {
        ctrl.stopSprint();
      }
    }
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  try {
    await renderer.start();
    await new Promise(() => {});
  } catch (e) {
    ctrl.destroy();
    console.error(`TUI Error: ${(e as Error).message}`);
  }
}
