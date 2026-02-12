import path from 'path';
import { SprintRunner } from '../utils/sprint.js';
import { DashboardController, LogEntry } from './DashboardController.js';
import {
  OpenTuiModule,
  Renderable,
  Renderer,
  COLORS,
  STATUS_COLORS,
  Identifiable,
  generateProgressBar,
  clearTracked,
  createHeader,
  createTabBar,
  createSprintListView,
  createTaskListRenderer,
  createActivityView,
  createFooter,
  renderLogEntries,
  scrollToEnd,
} from './components.js';

export async function launchDashboard(sprintDir: string, runner: SprintRunner): Promise<void> {
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

  // ─── Assemble the OpenTUI module for factory consumption ────────────────────
  const tui: OpenTuiModule = {
    BoxRenderable, TextRenderable, ScrollBoxRenderable,
    TabSelectRenderable, TabSelectRenderableEvents,
    bold, fg, dim, t,
  };

  // ─── Controller ────────────────────────────────────────────────────────────
  const ctrl = new DashboardController(sprintDir, runner);

  // ─── Root ──────────────────────────────────────────────────────────────────
  const root = new BoxRenderable(renderer, {
    id: 'root', width: '100%', height: '100%', flexDirection: 'column',
  });
  renderer.root.add(root);

  // ─── Build UI Sections via Component Factories ─────────────────────────────

  const { header, sprintStatusText } = createHeader(renderer as Renderer, tui);
  root.add(header);

  const { tabBar } = createTabBar(renderer as Renderer, tui, (tab) => {
    ctrl.switchTab(tab);
  });
  root.add(tabBar);

  const main = new BoxRenderable(renderer, {
    id: 'main', width: '100%', flexGrow: 1, flexDirection: 'column',
    overflow: 'hidden',
  });
  root.add(main);

  const {
    sprintsPanel, leftPanelHeader, sprintNameText, sprintDescText,
    taskListContainer, progressText,
  } = createSprintListView(renderer as Renderer, tui);

  const {
    activityPanel,
    infoSprintText, infoTaskText, infoTimerText, infoProgressText,
    activityRow, activityScroll, activityLogContainer,
    processRow, processScroll, processLogContainer,
    blockerContainer,
    blockerTask, blockerReason, blockerQuestion, blockerInputText,
  } = createActivityView(renderer as Renderer, tui);

  const { footer, statusText, hotkeyText } = createFooter(renderer as Renderer, tui);
  root.add(footer);

  const listRenderer = createTaskListRenderer(renderer as Renderer, tui);

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

  // ─── UI Element Tracking ───────────────────────────────────────────────────
  const taskElements: Identifiable[] = [];
  const logElements: Identifiable[] = [];
  const processElements: Identifiable[] = [];
  const sprintElements: Identifiable[] = [];

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const clearLeftPanel = () => {
    clearTracked(taskListContainer, taskElements);
    clearTracked(taskListContainer, sprintElements);
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
      const activeTask = m?.tasks.find(tk => tk.status === 'active');
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
    listRenderer.renderSprintItems(ctrl, taskListContainer, sprintElements);
  };

  const updateTaskList = () => {
    clearLeftPanel();
    listRenderer.renderTaskItems(ctrl, taskListContainer, taskElements);
  };

  const updateActivityLog = () => {
    renderLogEntries(
      renderer as Renderer, tui,
      ctrl.activityLogs,
      activityLogContainer,
      logElements,
      'log',
      'No activity yet. Start a sprint to see events here.',
    );
    scrollToEnd(activityScroll);
  };

  const updateProcessLog = () => {
    renderLogEntries(
      renderer as Renderer, tui,
      ctrl.processLogs,
      processLogContainer,
      processElements,
      'proc',
      'No process output yet.',
      30,
      false,
    );
    scrollToEnd(processScroll);
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
    // ── Status Row is always visible — update its content ──
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
      infoSprintText.content = t`${dim('No sprint running')}`;
      infoTaskText.content = '';
      infoTimerText.content = '';
      infoProgressText.content = '';
    }

    // ── Blocker swap: replaces activityRow + processRow with blockerContainer ──
    if (ctrl.activeBlocker) {
      if (currentRightView !== 'blocker') {
        try { activityPanel.remove('activity-row'); } catch { /* ignore */ }
        try { activityPanel.remove('process-row'); } catch { /* ignore */ }
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
        activityPanel.add(activityRow);
        activityPanel.add(processRow);
        currentRightView = 'activity';
      }

      if (activeTab === 'activity') {
        updateActivityLog();
        updateProcessLog();
      }
    }

    // Footer hotkey hints — tab-context-aware
    if (!ctrl.activeBlocker) {
      if (activeTab === 'sprints') {
        if (isSprintsView) {
          hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[→] Select'))}`;
        } else if (isTasksView && !isRunning) {
          const canApprove = ctrl.canSprintApprove();
          const canStart = ctrl.canSprintStart();
          if (canApprove) {
            hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[←] Back'))}  ${bold(fg(COLORS.success)('[A]pprove'))}`;
          } else if (canStart) {
            hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[←] Back'))}  ${bold(fg(COLORS.success)('[S]tart'))}`;
          } else {
            hotkeyText.content = t`${dim('[QQ]uit')}  ${bold(fg(COLORS.purple)('[Tab] Activity'))}  ${bold(fg(COLORS.primary)('[←] Back'))}`;
          }
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

  ctrl.on('log-added', (entry: LogEntry | null) => {
    if (ctrl.activeBlocker) return;
    if (entry === null) {
      // Full clear — update both panels
      updateActivityLog();
      updateProcessLog();
    } else if (entry.channel === 'process') {
      updateProcessLog();
    } else {
      updateActivityLog();
    }
  });

  ctrl.on('tab-changed', (tab: 'sprints' | 'activity') => {
    tabBar.setSelectedIndex!(tab === 'sprints' ? 0 : 1);
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
      if (key.name === 'a') {
        ctrl.approveSprint();
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
