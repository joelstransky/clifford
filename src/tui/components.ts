/**
 * UI Component Factory
 *
 * Factory functions that produce the major UI sections of the Clifford dashboard.
 * Each factory receives the renderer and the dynamically-imported OpenTUI module,
 * returning the root renderable plus any child references needed for live updates.
 *
 * This removes all inline widget construction from Dashboard.ts and centralises
 * the visual structure so that additions/changes only touch one place per section.
 */

import path from 'path';
import { DashboardController, Task, LogEntry } from './DashboardController.js';

import { stripEmoji } from '../utils/text.js';

// ─── Shared Types ───────────────────────────────────────────────────────────────

/** Resolved exports from `await import('@opentui/core')`. */
export interface OpenTuiModule {
  BoxRenderable: OpenTuiBoxCtor;
  TextRenderable: OpenTuiTextCtor;
  ScrollBoxRenderable: OpenTuiScrollBoxCtor;
  TabSelectRenderable: OpenTuiTabSelectCtor;
  TabSelectRenderableEvents: { SELECTION_CHANGED: string };
  bold: (s: string) => string;
  fg: (color: string) => (s: string) => string;
  dim: (s: string) => string;
  t: (strings: TemplateStringsArray, ...values: unknown[]) => string;
}

/** Minimal renderable instance — only the fields we need. */
export interface Renderable {
  id: string;
  content?: string;
  add: (child: Renderable) => Renderable;
  remove: (id: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  setSelectedIndex?: (index: number) => void;
}

/** Minimal renderer shape needed by factories. */
export interface Renderer {
  root: Renderable;
}

// ─── Constructor Signatures ─────────────────────────────────────────────────────

type OpenTuiBoxCtor = new (renderer: Renderer, opts: Record<string, unknown>) => Renderable;
type OpenTuiTextCtor = new (renderer: Renderer, opts: Record<string, unknown>) => Renderable;
type OpenTuiScrollBoxCtor = new (renderer: Renderer, opts: Record<string, unknown>) => Renderable;
type OpenTuiTabSelectCtor = new (renderer: Renderer, opts: Record<string, unknown>) => Renderable;

// ─── Theme ──────────────────────────────────────────────────────────────────────

export const COLORS = {
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

export const STATUS_COLORS: Record<Task['status'], string> = {
  completed: COLORS.success,
  active: COLORS.warning,
  pending: COLORS.dim,
  blocked: COLORS.error,
  pushed: COLORS.primary,
};

// ─── Utility Helpers ────────────────────────────────────────────────────────────

const VERSION = '1.0.0';

export function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0];
}

export function generateProgressBar(completed: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? completed / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(percentage * 100);
  return `${bar} ${percent}%`;
}

// ─── Identifiable Element Tracking ──────────────────────────────────────────────

export interface Identifiable {
  id: string;
}

/** Remove all tracked elements from a container, then clear the tracker array. */
export function clearTracked(container: Renderable, elements: Identifiable[]): void {
  elements.forEach(el => {
    try { container.remove(el.id); } catch { /* ignore */ }
  });
  elements.length = 0;
}

// ─── 1. createHeader ────────────────────────────────────────────────────────────

export interface HeaderComponents {
  header: Renderable;
  titleText: Renderable;
  sprintStatusText: Renderable;
}

export function createHeader(renderer: Renderer, tui: OpenTuiModule): HeaderComponents {
  const { BoxRenderable, TextRenderable, bold, fg, dim, t } = tui;

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

  return { header, titleText, sprintStatusText };
}

// ─── 2. createTabBar ────────────────────────────────────────────────────────────

export interface TabBarComponents {
  tabBar: Renderable;
}

export function createTabBar(
  renderer: Renderer,
  tui: OpenTuiModule,
  onTabChanged: (tab: 'sprints' | 'activity') => void,
): TabBarComponents {
  const { TabSelectRenderable, TabSelectRenderableEvents } = tui;

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

  tabBar.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: unknown) => {
    onTabChanged((index as number) === 0 ? 'sprints' : 'activity');
  });

  return { tabBar };
}

// ─── 3. createSprintListView ────────────────────────────────────────────────────

export interface SprintListViewComponents {
  sprintsPanel: Renderable;
  leftPanelHeader: Renderable;
  sprintNameText: Renderable;
  sprintDescText: Renderable;
  taskListContainer: Renderable;
}

export function createSprintListView(renderer: Renderer, tui: OpenTuiModule): SprintListViewComponents {
  const { BoxRenderable, TextRenderable, bold, fg, dim, t } = tui;

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

  return { sprintsPanel, leftPanelHeader, sprintNameText, sprintDescText, taskListContainer };
}

// ─── 4. createTaskListView ──────────────────────────────────────────────────────
// (The task list is rendered dynamically inside the same sprintsPanel, so
//  we expose a render helper rather than a separate panel.)

export interface TaskListRenderContext {
  renderSprintItems: (
    ctrl: DashboardController,
    container: Renderable,
    tracker: Identifiable[],
  ) => void;
  renderTaskItems: (
    ctrl: DashboardController,
    container: Renderable,
    tracker: Identifiable[],
  ) => void;
}

export function createTaskListRenderer(renderer: Renderer, tui: OpenTuiModule): TaskListRenderContext {
  const { BoxRenderable, TextRenderable, bold, fg, dim, t } = tui;


  const renderSprintItems = (
    ctrl: DashboardController,
    container: Renderable,
    tracker: Identifiable[],
  ): void => {
    const { allSprints, selectedIndex, isRunning } = ctrl;
    const runningDir = ctrl.getRunnerSprintDir();

    if (allSprints.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'sprint-empty',
        content: t`\n${dim('  No sprints discovered.')}\n${dim('  Run "clifford init" then create a sprint.')}`,
      });
      tracker.push(emptyEl);
      container.add(emptyEl);
      return;
    }

    allSprints.forEach((s, i) => {
      const isSelected = i === selectedIndex;
      const isThisRunning = isRunning && path.resolve(runningDir) === path.resolve(s.path);
      const otherRunning = isRunning && !isThisRunning;

      // Dim non-selected items when another sprint is running (state-aware locking)
      const isLocked = otherRunning && !isSelected;

      const itemBox = new BoxRenderable(renderer, {
        id: `sprint-item-${i}`,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
      });

      const prefix = isSelected ? '> ' : '  ';
      const runningIndicator = isThisRunning ? ' 🔄' : '';
      const lockIndicator = isLocked ? ' 🔒' : '';
      const displayName = stripEmoji(s.name);
      const completedCount = s.tasks.filter(tk => tk.status === 'completed' || tk.status === 'pushed').length;
      const totalCount = s.tasks.length;
      const countLabel = `[${completedCount} of ${totalCount}]`;
      const nameContent = `${prefix}${displayName}${runningIndicator}${lockIndicator}`;

      const label = new TextRenderable(renderer, {
        id: `sprint-label-${i}`,
        content: isSelected
          ? t`${bold(fg(COLORS.primary)(nameContent))} ${dim(countLabel)}`
          : isLocked
            ? t`${dim(nameContent)} ${dim(countLabel)}`
            : t`${fg(COLORS.text)(nameContent)} ${dim(countLabel)}`,
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
      } else if (s.tasks.some(tk => tk.status === 'completed' || tk.status === 'active')) {
        statusLabel = 'In Progress';
        statusColor = COLORS.warning;
      }

      const statusEl = new TextRenderable(renderer, {
        id: `sprint-status-${i}`,
        content: t`${fg(statusColor)(statusLabel)}`,
      });
      itemBox.add(statusEl);

      tracker.push(itemBox);
      container.add(itemBox);
    });
  };

  const renderTaskItems = (
    ctrl: DashboardController,
    container: Renderable,
    tracker: Identifiable[],
  ): void => {
    const { manifest: m, isRunning, activeTaskId } = ctrl;
    if (!m) return;

    if (m.tasks.length === 0) {
      const emptyEl = new TextRenderable(renderer, {
        id: 'task-empty',
        content: t`\n${dim('  No tasks defined in this sprint.')}`,
      });
      tracker.push(emptyEl);
      container.add(emptyEl);
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

      tracker.push(itemBox);
      container.add(itemBox);
    });
  };

  return { renderSprintItems, renderTaskItems };
}

// ─── 5. createActivityView ──────────────────────────────────────────────────────

export interface ActivityViewComponents {
  activityPanel: Renderable;
  // Status Row
  infoSprintText: Renderable;
  infoTaskText: Renderable;
  infoTimerText: Renderable;
  infoProgressText: Renderable;
  afkLabel: Renderable;
  mcpLabel: Renderable;
  // Activity Row
  activityRow: Renderable;
  activityScroll: Renderable;
  activityLogContainer: Renderable;
  // Process Row
  processRow: Renderable;
  processScroll: Renderable;
  processLogContainer: Renderable;
  // Blocker
  blockerContainer: Renderable;
  blockerTask: Renderable;
  blockerReason: Renderable;
  blockerQuestion: Renderable;
  blockerInputText: Renderable;
  blockerFooterHint: Renderable;
}

export function createActivityView(renderer: Renderer, tui: OpenTuiModule): ActivityViewComponents {
  const { BoxRenderable, TextRenderable, ScrollBoxRenderable, bold, fg, dim, t } = tui;

  // ── Root Panel ──
  const activityPanel = new BoxRenderable(renderer, {
    id: 'activity-panel', width: '100%', height: '100%', flexDirection: 'column',
    backgroundColor: COLORS.panelBg, gap: 0,
  });

  // ── Row 1: Status Row ──
  const statusRow = new BoxRenderable(renderer, {
    id: 'status-row', width: '100%', height: 8, flexDirection: 'column',
    padding: 1,
    border: true,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.titleBg,
  });

  const infoSprintText = new TextRenderable(renderer, { id: 'info-sprint', content: '', width: '100%' });
  const infoTaskText = new TextRenderable(renderer, { id: 'info-task', content: '', width: '100%' });
  const infoTimerText = new TextRenderable(renderer, { id: 'info-timer', content: '', width: '100%' });
  const infoProgressText = new TextRenderable(renderer, { id: 'info-progress', content: '' });
  const afkLabel = new TextRenderable(renderer, { id: 'afk-label', content: t`${fg(COLORS.dim)('AFK')}` });
  const mcpLabel = new TextRenderable(renderer, { id: 'mcp-label', content: t`${fg(COLORS.dim)('MCP')}` });

  // Progress row: progress text left, labels right
  const progressRow = new BoxRenderable(renderer, {
    id: 'progress-row', width: '100%', height: 1, flexDirection: 'row',
    justifyContent: 'space-between',
  });
  progressRow.add(infoProgressText);

  const labelBox = new BoxRenderable(renderer, {
    id: 'label-box', flexDirection: 'row', gap: 2
  });
  labelBox.add(afkLabel);
  labelBox.add(mcpLabel);
  progressRow.add(labelBox);

  statusRow.add(infoSprintText);
  statusRow.add(infoTaskText);
  statusRow.add(infoTimerText);
  statusRow.add(progressRow);

  // ── Row 2: Activity Row ──
  const activityRow = new BoxRenderable(renderer, {
    id: 'activity-row', width: '100%', flexGrow: 1, flexDirection: 'column',
    overflow: 'hidden',
    padding: 1,
  });

  const activityHeader = new TextRenderable(renderer, {
    id: 'activity-header', content: t`${bold(fg(COLORS.purple)(' ACTIVITY'))}`,
  });
  const activityHeaderBox = new BoxRenderable(renderer, {
    id: 'activity-header-box', width: '100%', height: 1, flexShrink: 0,
  });
  activityHeaderBox.add(activityHeader);

  const activityScroll = new ScrollBoxRenderable(renderer, {
    id: 'activity-scroll', width: '100%', flexGrow: 1,
  });
  const activityLogContainer = new BoxRenderable(renderer, {
    id: 'activity-log', width: '100%', flexDirection: 'column',
  });
  activityScroll.add(activityLogContainer);

  activityRow.add(activityHeaderBox);
  activityRow.add(activityScroll);

  // ── Row 3: Process Row ──
  const processRow = new BoxRenderable(renderer, {
    id: 'process-row', width: '100%', flexGrow: 1, flexDirection: 'column',
    overflow: 'hidden',
    padding: 1,
  });

  const processHeader = new TextRenderable(renderer, {
    id: 'process-header', content: t`${bold(fg(COLORS.text)(' PROCESS OUTPUT'))}`,
  });
  const processHeaderBox = new BoxRenderable(renderer, {
    id: 'process-header-box', width: '100%', height: 1, flexShrink: 0,
  });
  processHeaderBox.add(processHeader);

  const processScroll = new ScrollBoxRenderable(renderer, {
    id: 'process-scroll', width: '100%', flexGrow: 1,
  });
  const processLogContainer = new BoxRenderable(renderer, {
    id: 'process-log', width: '100%', flexDirection: 'column',
  });
  processScroll.add(processLogContainer);

  processRow.add(processHeaderBox);
  processRow.add(processScroll);

  // ── Blocker UI ──
  const blockerContainer = new BoxRenderable(renderer, {
    id: 'blocker-container', width: '100%', flexGrow: 1, flexDirection: 'column',
    padding: 1,
  });

  const blockerHeader = new TextRenderable(renderer, {
    id: 'blocker-header', content: t`${bold(fg(COLORS.error)('🛑 NEEDS HELP'))}`,
  });
  const blockerDivider = new TextRenderable(renderer, {
    id: 'blocker-divider', content: t`${dim('─'.repeat(50))}`,
  });
  const blockerTask = new TextRenderable(renderer, { id: 'blocker-task', content: '' });
  const blockerReason = new TextRenderable(renderer, { id: 'blocker-reason', content: '' });
  const blockerQuestionLabel = new TextRenderable(renderer, {
    id: 'blocker-question-label', content: t`\n${bold('Question:')}`,
  });
  const blockerQuestion = new TextRenderable(renderer, { id: 'blocker-question', content: '' });

  const blockerInputBox = new BoxRenderable(renderer, {
    id: 'blocker-input-box', width: '100%', height: 3, paddingLeft: 1,
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg,
  });
  const blockerInputLabel = new TextRenderable(renderer, {
    id: 'blocker-input-label', content: t`${bold(fg(COLORS.error)('🛑 > '))}`,
  });
  const blockerInputText = new TextRenderable(renderer, { id: 'blocker-input-text', content: '' });
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

  // ── Initial assembly ──
  activityPanel.add(statusRow);
  activityPanel.add(activityRow);
  activityPanel.add(processRow);

  return {
    activityPanel,
    infoSprintText, infoTaskText, infoTimerText, infoProgressText, afkLabel, mcpLabel,
    activityRow, activityScroll, activityLogContainer,
    processRow, processScroll, processLogContainer,
    blockerContainer,
    blockerTask, blockerReason, blockerQuestion, blockerInputText, blockerFooterHint,
  };
}

// ─── 6. createFooter ────────────────────────────────────────────────────────────

export interface FooterComponents {
  footer: Renderable;
  statusText: Renderable;
  hotkeyText: Renderable;
}

export function createFooter(renderer: Renderer, tui: OpenTuiModule): FooterComponents {
  const { BoxRenderable, TextRenderable, fg, dim, t } = tui;

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

  return { footer, statusText, hotkeyText };
}

// ─── 7. renderLogEntries (shared helper) ────────────────────────────────────────

/** Safely scroll a ScrollBoxRenderable to the bottom. */
export function scrollToEnd(scrollBox: Renderable): void {
  const sb = scrollBox as unknown as Record<string, unknown>;
  if (typeof sb.scrollToBottom === 'function') {
    (sb.scrollToBottom as () => void)();
  } else if (typeof sb.scrollTo === 'function') {
    (sb.scrollTo as (offset: number) => void)(999999);
  }
}

export function renderLogEntries(
  renderer: Renderer,
  tui: OpenTuiModule,
  entries: LogEntry[],
  container: Renderable,
  elements: Identifiable[],
  prefix: string,
  emptyMessage: string,
  maxVisible: number = 30,
  showTimestamp: boolean = true,
): void {
  const { TextRenderable, fg, dim, t } = tui;

  clearTracked(container, elements);

  if (entries.length === 0) {
    const emptyEl = new TextRenderable(renderer, {
      id: `${prefix}-empty`,
      content: t`\n${dim(`  ${emptyMessage}`)}`,
    });
    elements.push(emptyEl);
    container.add(emptyEl);
    return;
  }

  entries.slice(-maxVisible).forEach((log: LogEntry, i: number) => {
    let color = COLORS.text;
    if (log.type === 'success') color = COLORS.success;
    if (log.type === 'warning') color = COLORS.warning;
    if (log.type === 'error') color = COLORS.error;

    const content = showTimestamp
      ? t`${dim(`[${formatTime(log.timestamp)}]`)} ${fg(color)(log.message)}`
      : t`${fg(color)(log.message)}`;

    const el = new TextRenderable(renderer, {
      id: `${prefix}-${i}`,
      content,
    });
    elements.push(el);
    container.add(el);
  });
}
