const STORAGE_KEY = "time-board-v46";
const LEGACY_KEYS = ["time-board-v45", "time-board-v44", "time-board-v43", "time-board-v42", "time-board-v41", "time-board-v40", "time-board-v39", "time-board-v38", "time-board-v37", "time-board-v36", "time-board-v35", "time-board-v34", "time-board-v33", "time-board-v32", "time-board-v31", "time-board-v30", "time-board-v29", "time-board-v28", "time-board-v27", "time-board-v26", "time-board-v25", "time-board-v24", "time-board-v23", "time-board-v22", "time-board-v21", "time-board-v20", "time-board-v19", "time-board-v17", "time-board-v14", "time-board-v13", "time-board-v12", "time-board-v11", "time-board-v10", "time-board-v9", "time-board-v8", "time-board-v7", "time-board-v6", "time-board-v5", "time-board-v4", "time-board-v3", "time-board-v2", "time-board-v1"];
const PIXELS_PER_MINUTE = 1;

const defaultProjects = [
  { id: createId(), name: "工作", color: "#3478f6" },
  { id: createId(), name: "学习", color: "#21a67a" },
  { id: createId(), name: "生活事务", color: "#f59f00" },
];

const state = loadState();
let currentModule = "home";
let currentView = "day";
let cursorDate = startOfDay(new Date());
let ticker = null;
let pendingStopTime = null;
const collapsedGoalIds = new Set();
const collapsedSubgoalIds = new Set();

const els = {
  moduleButtons: document.querySelectorAll("[data-module-target]"),
  moduleSections: document.querySelectorAll("[data-module]"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  importFile: document.querySelector("#importFile"),
  dataStatus: document.querySelector("#dataStatus"),
  timerForm: document.querySelector("#timerForm"),
  timerProject: document.querySelector("#timerProject"),
  timerSubgoal: document.querySelector("#timerSubgoal"),
  timerTask: document.querySelector("#timerTask"),
  timerState: document.querySelector("#timerState"),
  activeTimer: document.querySelector("#activeTimer"),
  elapsedTime: document.querySelector("#elapsedTime"),
  activeTimerTarget: document.querySelector("#activeTimerTarget"),
  startBtn: document.querySelector("#startBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  goalForm: document.querySelector("#goalForm"),
  goalName: document.querySelector("#goalName"),
  goalKind: document.querySelector("#goalKind"),
  goalPriority: document.querySelector("#goalPriority"),
  goalLimitFields: document.querySelector("#goalLimitFields"),
  goalLimitMinutes: document.querySelector("#goalLimitMinutes"),
  goalColor: document.querySelector("#goalColor"),
  goalList: document.querySelector("#goalList"),
  subgoalForm: document.querySelector("#subgoalForm"),
  subgoalProject: document.querySelector("#subgoalProject"),
  subgoalName: document.querySelector("#subgoalName"),
  subgoalMode: document.querySelector("#subgoalMode"),
  subgoalPriority: document.querySelector("#subgoalPriority"),
  subgoalQuantFields: document.querySelector("#subgoalQuantFields"),
  subgoalTarget: document.querySelector("#subgoalTarget"),
  subgoalUnit: document.querySelector("#subgoalUnit"),
  taskForm: document.querySelector("#taskForm"),
  taskProject: document.querySelector("#taskProject"),
  taskSubgoal: document.querySelector("#taskSubgoal"),
  taskName: document.querySelector("#taskName"),
  taskMode: document.querySelector("#taskMode"),
  taskPriority: document.querySelector("#taskPriority"),
  taskQuantFields: document.querySelector("#taskQuantFields"),
  taskTarget: document.querySelector("#taskTarget"),
  taskUnit: document.querySelector("#taskUnit"),
  mergeForm: document.querySelector("#mergeForm"),
  mergeTarget: document.querySelector("#mergeTarget"),
  mergeSourceList: document.querySelector("#mergeSourceList"),
  subgoalMergeForm: document.querySelector("#subgoalMergeForm"),
  subgoalMergeProject: document.querySelector("#subgoalMergeProject"),
  subgoalMergeTarget: document.querySelector("#subgoalMergeTarget"),
  subgoalMergeSourceList: document.querySelector("#subgoalMergeSourceList"),
  entryForm: document.querySelector("#entryForm"),
  entryProject: document.querySelector("#entryProject"),
  entrySubgoal: document.querySelector("#entrySubgoal"),
  entryTask: document.querySelector("#entryTask"),
  entryProgress: document.querySelector("#entryProgress"),
  entryDescription: document.querySelector("#entryDescription"),
  entryStart: document.querySelector("#entryStart"),
  entryEnd: document.querySelector("#entryEnd"),
  entryList: document.querySelector("#entryList"),
  rangeTitle: document.querySelector("#rangeTitle"),
  calendarHeader: document.querySelector("#calendarHeader"),
  calendarGrid: document.querySelector("#calendarGrid"),
  statsStrip: document.querySelector("#statsStrip"),
  prevRange: document.querySelector("#prevRange"),
  nextRange: document.querySelector("#nextRange"),
  todayBtn: document.querySelector("#todayBtn"),
  dayViewBtn: document.querySelector("#dayViewBtn"),
  weekViewBtn: document.querySelector("#weekViewBtn"),
  monthViewBtn: document.querySelector("#monthViewBtn"),
  yearViewBtn: document.querySelector("#yearViewBtn"),
  completionModal: document.querySelector("#completionModal"),
  completionSubgoal: document.querySelector("#completionSubgoal"),
  completionDescription: document.querySelector("#completionDescription"),
  completionAmountLabel: document.querySelector("#completionAmountLabel"),
  completionAmount: document.querySelector("#completionAmount"),
  completionHint: document.querySelector("#completionHint"),
  completionSave: document.querySelector("#completionSave"),
  completionSkip: document.querySelector("#completionSkip"),
  planEditModal: document.querySelector("#planEditModal"),
  planEditTitle: document.querySelector("#planEditTitle"),
  planEditForm: document.querySelector("#planEditForm"),
};

rebuildProgressFromEntries();
saveState();
seedFormDates();
bindEvents();
render();
syncTicker();

window.TimeBoardApp = Object.freeze({
  getState: () => JSON.parse(JSON.stringify(state)),
  replaceState(nextState) {
    Object.assign(state, normalizeImportedState(nextState));
    rebuildProgressFromEntries();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    syncTicker();
  },
  hasUserData: () => state.goals.length > 0 || state.entries.length > 0 || Boolean(state.activeEntry),
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!raw) {
    return syncProjectGoals({ projects: defaultProjects, goals: [], entries: [], activeEntry: null });
  }

  try {
    const parsed = JSON.parse(raw);
    return syncProjectGoals({
      projects: parsed.projects?.length ? parsed.projects : defaultProjects,
      goals: normalizeGoals(parsed.goals || []),
      entries: (parsed.entries || []).map(normalizeEntry),
      activeEntry: parsed.activeEntry ? normalizeEntry(parsed.activeEntry) : null,
    });
  } catch {
    return syncProjectGoals({ projects: defaultProjects, goals: [], entries: [], activeEntry: null });
  }
}

function syncProjectGoals(data) {
  const projects = [...data.projects];
  const goals = [...data.goals];

  goals.forEach((goal) => {
    if (!goal.projectId) goal.projectId = goal.id;
    if (!projects.some((project) => project.id === goal.projectId)) {
      projects.push({ id: goal.projectId, name: goal.name, color: pickColor(projects.length) });
    }
  });

  projects.forEach((project) => {
    if (!goals.some((goal) => goal.projectId === project.id)) {
      goals.push({
        id: project.id,
        name: project.name,
        projectId: project.id,
        kind: "goal",
        mode: "manual",
        priority: 3,
        dailyLimitMinutes: 0,
        subgoals: [{ id: createId(), name: "整体进度", mode: "manual", priority: 3, target: 0, unit: "%", done: 0, progress: 0, tasks: [] }],
      });
    }
  });

  return { ...data, projects, goals };
}

function normalizeEntry(entry) {
  return {
    ...entry,
    taskId: entry.taskId || "",
    amountDelta: Number(entry.amountDelta ?? entry.progressDelta ?? 0),
    progressDelta: Number(entry.progressDelta || 0),
    progressLabel: entry.progressLabel || "",
  };
}

function normalizeGoals(goals) {
  return goals.map((goal) => {
    const mode = goal.mode || inferGoalMode(goal);
    const kind = goal.kind || "goal";
    return {
      id: goal.id || createId(),
      name: goal.name || "未命名目标",
      projectId: goal.projectId || "",
      kind,
      mode,
      priority: normalizePriority(goal.priority),
      dailyLimitMinutes: Number(goal.dailyLimitMinutes || 0),
      subgoals: supportsSubgoals({ kind }) ? (goal.subgoals || []).map((subgoal) => normalizeSubgoal(subgoal, mode)) : [],
    };
  });
}

function normalizeSubgoal(subgoal, fallbackMode) {
  const mode = ["quantified", "manual", "daily"].includes(subgoal.mode)
    ? subgoal.mode
    : (["quantified", "manual"].includes(fallbackMode) ? fallbackMode : (Number(subgoal.target || 0) > 0 ? "quantified" : "manual"));
  const target = Number(subgoal.target || 0);
  const done = Number(subgoal.done || 0);
  const normalized = {
    id: subgoal.id || createId(),
    name: subgoal.name || "未命名子目标",
    mode,
    priority: normalizePriority(subgoal.priority),
    target,
    unit: subgoal.unit || (mode === "quantified" ? "个" : "%"),
    done: mode === "quantified" ? done : 0,
    progress: clampProgress(Number(subgoal.progress || (target ? done / target * 100 : 0))),
    manualOverride: Boolean(subgoal.manualOverride),
    tasks: (subgoal.tasks || []).map(normalizeTask),
  };
  // Once a subgoal has task items, its progress is always derived from them.
  // A previously stored 100% manual value must not keep the parent completed
  // after a new, unfinished task is added.
  if (normalized.tasks.length || !normalized.manualOverride) recalculateSubgoalProgress(normalized);
  return normalized;
}

function normalizeTask(task) {
  const mode = task.mode || (Number(task.target || 0) > 0 ? "quantified" : "manual");
  const target = Number(task.target || 0);
  const done = Number(task.doneAmount ?? task.done ?? 0);
  const progress = clampProgress(Number(task.progress || (target ? done / target * 100 : 0)));
  return {
    id: task.id || createId(),
    name: task.name || "未命名任务项",
    mode,
    priority: normalizePriority(task.priority),
    target,
    unit: task.unit || (mode === "quantified" ? "个" : "%"),
    done: mode === "quantified" ? done : 0,
    progress: mode === "quantified" ? progress : clampProgress(Number(task.progress || (task.done ? 100 : 0))),
  };
}

function inferGoalMode(goal) {
  return goal.subgoals?.some((subgoal) => Number(subgoal.target || 0) > 0) ? "quantified" : "manual";
}

function supportsSubgoals(goal) {
  return goal?.kind === "goal" || goal?.kind === "habit";
}

function supportsTasks(goal) {
  return goal?.kind === "goal";
}

function normalizePriority(value) {
  const priority = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(priority)));
}

function formatPriority(value) {
  return `P${normalizePriority(value)}`;
}

function getPriorityLabel(value) {
  return { 5: "最高", 4: "高", 3: "中", 2: "低", 1: "最低" }[normalizePriority(value)];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("time-board-state-saved"));
}

function exportData() {
  const payload = {
    app: "time-board",
    version: STORAGE_KEY,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `time-board-${toDateKey(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setDataStatus("已导出");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const imported = normalizeImportedState(payload);
    Object.assign(state, imported);
    rebuildProgressFromEntries();
    saveState();
    render();
    syncTicker();
    setDataStatus("已导入");
  } catch {
    setDataStatus("导入失败");
  } finally {
    event.target.value = "";
  }
}

function normalizeImportedState(payload) {
  const data = payload?.data || payload;
  if (!data || !Array.isArray(data.projects) || !Array.isArray(data.goals) || !Array.isArray(data.entries)) {
    throw new Error("Invalid backup");
  }
  return syncProjectGoals({
    projects: data.projects,
    goals: normalizeGoals(data.goals),
    entries: data.entries.map(normalizeEntry),
    activeEntry: data.activeEntry ? normalizeEntry(data.activeEntry) : null,
  });
}

function setDataStatus(message) {
  els.dataStatus.textContent = message;
  clearTimeout(setDataStatus.timer);
  setDataStatus.timer = setTimeout(() => {
    els.dataStatus.textContent = "";
  }, 2400);
}

function bindEvents() {
  els.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => setModule(button.dataset.moduleTarget));
  });

  els.exportData.addEventListener("click", exportData);
  els.importData.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importData);

  els.timerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.activeEntry) return;

    const goal = getGoal(els.timerProject.value);
    state.activeEntry = buildEntry({
      projectId: goal?.projectId,
      goalId: goal?.id,
      subgoalId: els.timerSubgoal.value,
      taskId: els.timerTask.value,
      amountDelta: 0,
      description: "未命名记录",
      note: "",
      startTime: new Date(),
      endTime: null,
    });

    saveState();
    render();
    syncTicker();
  });

  els.stopBtn.addEventListener("click", () => {
    if (!state.activeEntry) return;
    syncActiveEntryTargetFromTimer();
    pendingStopTime = new Date();
    openCompletionModal();
  });

  els.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.goalName.value.trim();
    const kind = els.goalKind.value;
    const dailyLimitMinutes = kind === "limit" ? Number(els.goalLimitMinutes.value || 0) : 0;
    if (!name) {
      els.goalName.focus();
      return;
    }
    if (kind === "limit" && dailyLimitMinutes <= 0) {
      els.goalLimitMinutes.focus();
      return;
    }

    const id = createId();
    state.projects.push({ id, name, color: els.goalColor.value });
    state.goals.push({
      id,
      name,
      projectId: id,
      kind,
      mode: "mixed",
      priority: normalizePriority(els.goalPriority.value),
      dailyLimitMinutes,
      subgoals: [],
    });

    els.goalName.value = "";
    els.goalPriority.value = "3";
    els.goalLimitMinutes.value = "";
    els.goalColor.value = pickColor(state.goals.length);
    saveState();
    render();
  });

  els.subgoalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const goal = getGoal(els.subgoalProject.value);
    const name = els.subgoalName.value.trim();
    const mode = els.subgoalMode.value;
    if (!goal || !supportsSubgoals(goal) || !name) {
      els.subgoalName.focus();
      return;
    }
    const subgoalMode = goal.kind === "habit" ? "daily" : mode;
    if (subgoalMode === "quantified" && Number(els.subgoalTarget.value || 0) <= 0) {
      els.subgoalTarget.focus();
      return;
    }

    goal.subgoals.push({
      id: createId(),
      name,
      mode: subgoalMode,
      priority: normalizePriority(els.subgoalPriority.value),
      target: subgoalMode === "quantified" ? Number(els.subgoalTarget.value) : 0,
      unit: subgoalMode === "quantified" ? (els.subgoalUnit.value.trim() || "个") : "%",
      done: 0,
      progress: 0,
      tasks: [],
    });

    els.subgoalName.value = "";
    els.subgoalPriority.value = "3";
    els.subgoalTarget.value = "";
    els.subgoalUnit.value = "";
    saveState();
    render();
  });

  els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const goal = getGoal(els.taskProject.value);
    const subgoal = getSubgoal(goal, els.taskSubgoal.value);
    const name = els.taskName.value.trim();
    const mode = els.taskMode.value;
    if (!goal || !supportsTasks(goal) || !subgoal || !name) {
      els.taskName.focus();
      return;
    }
    if (mode === "quantified" && Number(els.taskTarget.value || 0) <= 0) {
      els.taskTarget.focus();
      return;
    }

    subgoal.tasks.push({
      id: createId(),
      name,
      mode,
      priority: normalizePriority(els.taskPriority.value),
      target: mode === "quantified" ? Number(els.taskTarget.value) : 0,
      unit: mode === "quantified" ? (els.taskUnit.value.trim() || "个") : "%",
      done: 0,
      progress: 0,
    });
    recalculateSubgoalProgress(subgoal);
    els.taskName.value = "";
    els.taskPriority.value = "3";
    els.taskTarget.value = "";
    els.taskUnit.value = "";
    saveState();
    render();
  });

  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const start = parseDateTimeInput(els.entryStart.value);
    const end = parseDateTimeInput(els.entryEnd.value);

    if (!start || !end || end <= start) {
      els.entryEnd.focus();
      return;
    }

    const goal = getGoal(els.entryProject.value);
    const entry = buildEntry({
      projectId: goal?.projectId,
      goalId: goal?.id,
      subgoalId: els.entrySubgoal.value,
      taskId: els.entryTask.value,
      amountDelta: supportsTasks(goal) ? els.entryProgress.value : 0,
      description: normalizeDescription(els.entryDescription.value),
      note: "",
      startTime: start,
      endTime: end,
    });

    state.entries.push(entry);
    applyProgressDelta(entry);
    els.entryDescription.value = "";
    els.entryProgress.value = "";
    seedFormDates();
    saveState();
    render();
  });

  els.timerProject.addEventListener("change", () => {
    renderSubgoalOptions("timer");
    renderTaskOptions("timer");
  });
  els.timerSubgoal.addEventListener("change", () => {
    if (state.activeEntry) {
      state.activeEntry.subgoalId = els.timerSubgoal.value;
      state.activeEntry.taskId = "";
      saveState();
    }
    renderTaskOptions("timer");
  });
  els.timerTask.addEventListener("change", () => {
    if (!state.activeEntry) return;
    syncActiveEntryTargetFromTimer();
    saveState();
  });
  els.entryProject.addEventListener("change", () => {
    renderSubgoalOptions("entry");
    renderTaskOptions("entry");
    updateProgressHint("entry");
  });
  els.entrySubgoal.addEventListener("change", () => {
    renderTaskOptions("entry");
    updateProgressHint("entry");
  });
  els.entryTask.addEventListener("change", () => updateProgressHint("entry"));
  els.taskProject.addEventListener("change", renderTaskSubgoalOptions);
  els.subgoalProject.addEventListener("change", renderSubgoalModeFields);
  els.taskMode.addEventListener("change", renderTaskModeFields);
  els.mergeTarget.addEventListener("change", renderMergeOptions);
  els.subgoalMergeProject.addEventListener("change", renderSubgoalMergeOptions);
  els.subgoalMergeTarget.addEventListener("change", renderSubgoalMergeSourceOptions);
  els.subgoalMode.addEventListener("change", renderSubgoalModeFields);
  els.goalKind.addEventListener("change", renderGoalKindFields);
  els.completionSave.addEventListener("click", () => finalizeActiveEntry(els.completionAmount.value, els.completionDescription.value));
  els.completionSkip.addEventListener("click", () => finalizeActiveEntry(0, els.completionDescription.value));
  els.planEditModal.addEventListener("click", (event) => {
    if (event.target === els.planEditModal) closePlanEditor();
  });

  els.mergeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    mergeProjectsIntoGoal(els.mergeTarget.value, getSelectedMergeSources());
  });
  els.subgoalMergeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    mergeSubgoalsIntoTask(els.subgoalMergeProject.value, els.subgoalMergeTarget.value, getSelectedSubgoalMergeSources());
  });

  els.prevRange.addEventListener("click", () => moveRange(-1));
  els.nextRange.addEventListener("click", () => moveRange(1));
  els.todayBtn.addEventListener("click", () => {
    cursorDate = startOfDay(new Date());
    render();
  });

  [els.dayViewBtn, els.weekViewBtn, els.monthViewBtn, els.yearViewBtn].forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
}

function buildEntry({ projectId, goalId, subgoalId, taskId, amountDelta, description, note, startTime, endTime }) {
  const cleanGoalId = goalId || "";
  const cleanSubgoalId = cleanGoalId ? subgoalId || "" : "";
  const cleanTaskId = cleanSubgoalId ? taskId || "" : "";
  const progress = calculateProgressDelta(cleanGoalId, cleanSubgoalId, cleanTaskId, amountDelta);
  return {
    id: createId(),
    projectId,
    goalId: cleanGoalId,
    subgoalId: cleanSubgoalId,
    taskId: cleanTaskId,
    amountDelta: Number(amountDelta || 0),
    progressDelta: progress.percent,
    progressLabel: progress.label,
    description,
    note,
    startTime: startTime.toISOString(),
    endTime: endTime ? endTime.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function render() {
  renderModule();
  renderProjectOptions();
  renderGoalOptions();
  renderGoals();
  renderTimer();
  renderCalendar();
  renderStats();
  renderEntries();
}

function renderModule() {
  document.body.dataset.currentModule = currentModule;
  els.moduleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.moduleTarget === currentModule);
  });
  els.moduleSections.forEach((section) => {
    const modules = section.dataset.module.split(/\s+/);
    section.hidden = !modules.includes(currentModule);
  });
}

function renderProjectOptions() {
  const timerGoalId = state.activeEntry?.goalId || els.timerProject.value;
  const entryGoalId = els.entryProject.value;
  const options = getSortedPriorityItems(state.goals).map((goal) => `<option value="${goal.id}">${escapeHtml(formatGoalOption(goal))}</option>`).join("");
  els.timerProject.innerHTML = options;
  els.entryProject.innerHTML = options;

  if (getGoal(timerGoalId)) els.timerProject.value = timerGoalId;
  if (getGoal(entryGoalId)) els.entryProject.value = entryGoalId;
}

function renderGoalOptions() {
  const subgoalProjects = state.goals.filter(supportsSubgoals);
  const taskProjects = state.goals.filter(supportsTasks);
  els.subgoalProject.innerHTML = subgoalProjects.length
    ? subgoalProjects.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join("")
    : `<option value="">暂无可添加子目标的项目</option>`;
  els.taskProject.innerHTML = taskProjects.length
    ? taskProjects.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join("")
    : `<option value="">暂无目标型项目</option>`;
  els.subgoalProject.disabled = !subgoalProjects.length;
  els.subgoalForm.querySelector("button").disabled = !subgoalProjects.length;
  els.taskProject.disabled = !taskProjects.length;

  renderSubgoalOptions("timer");
  renderSubgoalOptions("entry");
  renderTaskSubgoalOptions();
  renderMergeOptions();
  renderSubgoalMergeOptions();
  renderGoalKindFields();
  renderSubgoalModeFields();
  renderTaskModeFields();
  updateProgressHint("timer");
  updateProgressHint("entry");
}

function renderSubgoalOptions(scope) {
  const controls = getScopeControls(scope);
  const goal = getGoal(controls.goal.value);
  const activeSubgoal = scope === "timer" ? getSubgoal(goal, state.activeEntry?.subgoalId) : null;
  const selectableSubgoals = getSelectableSubgoals(goal);
  if (activeSubgoal && !selectableSubgoals.some((subgoal) => subgoal.id === activeSubgoal.id)) {
    selectableSubgoals.unshift(activeSubgoal);
  }
  const hasSelectableSubgoals = selectableSubgoals.length > 0;
  const options = hasSelectableSubgoals
    ? selectableSubgoals.map((subgoal) => `<option value="${subgoal.id}">${escapeHtml(formatSubgoalOption(subgoal, goal))}</option>`).join("")
    : `<option value="">${formatNoSubgoalText(goal)}</option>`;
  const previous = controls.subgoal.value;
  controls.subgoal.innerHTML = options;
  controls.subgoal.disabled = !hasSelectableSubgoals;
  if (selectableSubgoals.some((subgoal) => subgoal.id === previous)) {
    controls.subgoal.value = previous;
  }
  if (scope === "timer" && state.activeEntry?.subgoalId) {
    controls.subgoal.value = state.activeEntry.subgoalId;
  }
  renderTaskOptions(scope);
}

function renderTaskOptions(scope) {
  const controls = getScopeControls(scope);
  if (!controls.task) return;
  const goal = getGoal(controls.goal.value);
  const subgoal = getSubgoal(goal, controls.subgoal.value);
  const previous = controls.task.value;
  const activeTask = scope === "timer" ? getTask(subgoal, state.activeEntry?.taskId) : null;
  const selectableTasks = getSelectableTasks(goal, subgoal);
  if (activeTask && !selectableTasks.some((task) => task.id === activeTask.id)) {
    selectableTasks.unshift(activeTask);
  }
  const hasSelectableTasks = selectableTasks.length > 0;
  controls.task.innerHTML = hasSelectableTasks
    ? `<option value="">记录到子目标</option>${selectableTasks.map((task) => `<option value="${task.id}">${escapeHtml(formatTaskOption(task))}</option>`).join("")}`
    : `<option value="">${subgoal ? "记录到子目标" : "先选择子目标"}</option>`;
  controls.task.disabled = !subgoal || !hasSelectableTasks;
  if (selectableTasks.some((task) => task.id === previous)) {
    controls.task.value = previous;
  }
  if (scope === "timer" && state.activeEntry?.taskId) {
    controls.task.value = state.activeEntry.taskId;
  }
}

function renderTaskSubgoalOptions() {
  const goal = getGoal(els.taskProject.value);
  const isGoalProject = supportsTasks(goal);
  const previous = els.taskSubgoal.value;
  els.taskSubgoal.innerHTML = isGoalProject && goal?.subgoals.length
    ? goal.subgoals.map((subgoal) => `<option value="${subgoal.id}">${escapeHtml(subgoal.name)}</option>`).join("")
    : `<option value="">先创建子目标</option>`;
  els.taskSubgoal.disabled = !isGoalProject || !goal?.subgoals.length;
  els.taskForm.querySelector("button").disabled = !isGoalProject || !goal?.subgoals.length;
  if (goal?.subgoals.some((subgoal) => subgoal.id === previous)) {
    els.taskSubgoal.value = previous;
  }
}

function renderMergeOptions() {
  const targets = state.goals;
  const previousTarget = els.mergeTarget.value;
  els.mergeTarget.innerHTML = targets.length
    ? targets.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join("")
    : `<option value="">暂无目标项目</option>`;
  if (targets.some((goal) => goal.id === previousTarget)) {
    els.mergeTarget.value = previousTarget;
  }

  const targetId = els.mergeTarget.value;
  const sources = state.goals.filter((goal) => goal.id !== targetId);
  els.mergeSourceList.innerHTML = sources.length
    ? sources.map((goal) => `
      <label class="merge-source-item">
        <input type="checkbox" value="${goal.id}" />
        <span>${escapeHtml(goal.name)}</span>
      </label>
    `).join("")
    : `<div class="empty-mini">没有可合并的旧项目</div>`;
  els.mergeTarget.disabled = !targets.length;
  els.mergeForm.querySelector("button").disabled = !targets.length || !sources.length;
}

function getSelectedMergeSources() {
  return Array.from(els.mergeSourceList.querySelectorAll("input:checked")).map((input) => input.value);
}

function renderSubgoalMergeOptions() {
  const goalProjects = state.goals.filter((goal) => goal.kind === "goal" && goal.subgoals.length);
  const previousProject = els.subgoalMergeProject.value;
  els.subgoalMergeProject.innerHTML = goalProjects.length
    ? goalProjects.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join("")
    : `<option value="">暂无可整理项目</option>`;
  if (goalProjects.some((goal) => goal.id === previousProject)) {
    els.subgoalMergeProject.value = previousProject;
  }
  els.subgoalMergeProject.disabled = !goalProjects.length;
  renderSubgoalMergeSourceOptions();
}

function renderSubgoalMergeSourceOptions() {
  const goal = getGoal(els.subgoalMergeProject.value);
  const subgoals = goal?.subgoals || [];
  const previousTarget = els.subgoalMergeTarget.value;
  els.subgoalMergeTarget.innerHTML = subgoals.length
    ? subgoals.map((subgoal) => `<option value="${subgoal.id}">${escapeHtml(subgoal.name)}</option>`).join("")
    : `<option value="">暂无子目标</option>`;
  if (subgoals.some((subgoal) => subgoal.id === previousTarget)) {
    els.subgoalMergeTarget.value = previousTarget;
  }

  const targetId = els.subgoalMergeTarget.value;
  const sources = subgoals.filter((subgoal) => subgoal.id !== targetId);
  els.subgoalMergeSourceList.innerHTML = sources.length
    ? sources.map((subgoal) => `
      <label class="merge-source-item">
        <input type="checkbox" value="${subgoal.id}" />
        <span>${escapeHtml(subgoal.name)}</span>
      </label>
    `).join("")
    : `<div class="empty-mini">没有可合并的子目标</div>`;
  els.subgoalMergeTarget.disabled = !subgoals.length;
  els.subgoalMergeForm.querySelector("button").disabled = !goal || !targetId || !sources.length;
}

function getSelectedSubgoalMergeSources() {
  return Array.from(els.subgoalMergeSourceList.querySelectorAll("input:checked")).map((input) => input.value);
}

function renderGoals() {
  els.goalList.innerHTML = "";
  if (!state.goals.length) {
    els.goalList.innerHTML = `<div class="empty-state">可以先创建一个项目，例如考公或开题。</div>`;
    return;
  }

  getSortedPriorityItems(state.goals).forEach((goal) => {
    const project = getProject(goal.projectId);
    const card = document.createElement("article");
    card.className = "goal-card";
    card.dataset.goalId = goal.id;
    card.style.setProperty("--plan-color", project.color);
    const progress = getGoalProgress(goal);
    const meta = getGoalMeta(goal);
    const collapsed = collapsedGoalIds.has(goal.id);
    card.innerHTML = `
      <div class="goal-head">
        <span class="level-badge level-project">项目</span>
        <span class="project-dot" style="background:${project.color}"></span>
        <button class="plan-name-button goal-name-display" type="button" data-plan-edit="goal" data-goal-id="${goal.id}">${escapeHtml(goal.name)}</button>
        <span class="priority-badge">${escapeHtml(formatPriority(goal.priority))}</span>
        <small>${escapeHtml(meta)}</small>
      </div>
      <div class="progress-track ${goal.kind === "limit" && progress > 100 ? "over-limit" : ""}"><span style="width:${Math.min(progress, 100)}%"></span></div>
      ${supportsSubgoals(goal) ? `
        <button class="collapse-goal" type="button" data-goal-id="${goal.id}">${collapsed ? "展开任务" : "折叠任务"}</button>
        <div class="subgoal-list" ${collapsed ? "hidden" : ""}>
          ${renderSubgoalList(goal)}
        </div>
      ` : `<div class="goal-kind-note">${escapeHtml(getGoalKindNote(goal))}</div>`}
    `;
    card.querySelectorAll("[data-plan-edit]").forEach((button) => {
      button.addEventListener("click", () => openPlanEditor(button.dataset.planEdit, button.dataset));
    });
    card.querySelectorAll(".collapse-goal").forEach((button) => {
      button.addEventListener("click", () => toggleGoalCollapse(button.dataset.goalId));
    });
    card.querySelectorAll(".collapse-subgoal").forEach((button) => {
      button.addEventListener("click", () => toggleSubgoalCollapse(button.dataset.subgoalId));
    });
    els.goalList.append(card);
  });
}

function renderSubgoalList(goal) {
  if (!goal.subgoals.length) return `<div class="empty-mini">还没有子目标</div>`;
  const sorted = getSortedPriorityItems(goal.subgoals);
  const incomplete = sorted.filter((subgoal) => !isSubgoalComplete(goal, subgoal));
  const complete = sorted.filter((subgoal) => isSubgoalComplete(goal, subgoal));
  return `
    <section class="plan-status-group status-incomplete">
      <div class="plan-status-heading">
        <span class="status-marker"></span>
        <strong>未完成子目标</strong>
        <small>${incomplete.length} 项</small>
      </div>
      <div class="plan-status-body">
        ${incomplete.length ? incomplete.map((subgoal) => renderSubgoalRow(goal, subgoal)).join("") : '<div class="empty-mini">没有未完成的子目标</div>'}
      </div>
    </section>
    <details class="plan-status-group status-complete">
      <summary class="plan-status-heading">
        <span class="status-marker"></span>
        <strong>已完成子目标</strong>
        <small>${complete.length} 项</small>
      </summary>
      <div class="plan-status-body">
        ${complete.length ? complete.map((subgoal) => renderSubgoalRow(goal, subgoal)).join("") : '<div class="empty-mini">还没有已完成的子目标</div>'}
      </div>
    </details>
  `;
}

function renderSubgoalRow(goal, subgoal) {
  const isHabit = goal.kind === "habit";
  const completed = isHabit && isHabitSubgoalDoneToday(goal.id, subgoal.id);
  return `
    <div class="subgoal-row ${isHabit ? "habit-subgoal-row" : ""}">
      <span class="level-badge level-subgoal">子目标</span>
      <button class="plan-name-button" type="button" data-plan-edit="subgoal" data-goal-id="${goal.id}" data-subgoal-id="${subgoal.id}">${escapeHtml(subgoal.name)}</button>
      ${isHabit ? `<strong>${escapeHtml(completed ? "今日已完成" : "今日未完成")}</strong>` : renderProgressEditor("subgoal", goal, subgoal)}
      <span class="priority-badge">${escapeHtml(formatPriority(subgoal.priority))}</span>
      <small class="plan-time">${formatDuration(getPlanDisplayDuration(goal, subgoal.id))}</small>
      ${isHabit ? "" : `<div class="progress-track"><span style="width:${subgoal.progress}%"></span></div>`}
      ${!isHabit && subgoal.tasks?.length ? `<button class="collapse-subgoal" type="button" data-subgoal-id="${subgoal.id}">${collapsedSubgoalIds.has(subgoal.id) ? "展开任务项" : "折叠任务项"}</button>` : ""}
      ${isHabit ? "" : renderTaskList(goal, subgoal)}
    </div>
  `;
}

function renderTaskList(goal, subgoal) {
  if (!subgoal.tasks?.length) return `<div class="task-list empty-task-list">还没有任务项</div>`;
  if (collapsedSubgoalIds.has(subgoal.id)) return "";
  const done = subgoal.tasks.filter((task) => Number(task.progress || 0) >= 100).length;
  const sorted = getSortedPriorityItems(subgoal.tasks);
  const incomplete = sorted.filter((task) => Number(task.progress || 0) < 100);
  const complete = sorted.filter((task) => Number(task.progress || 0) >= 100);
  return `
    <div class="task-list">
      <div class="task-summary">任务项 · ${done}/${subgoal.tasks.length} 已完成</div>
      <section class="task-status-group status-incomplete">
        <div class="plan-status-heading">
          <span class="status-marker"></span>
          <strong>未完成</strong>
          <small>${incomplete.length} 项</small>
        </div>
        <div class="plan-status-body">
          ${incomplete.length ? incomplete.map((task) => renderTaskRow(goal, subgoal, task)).join("") : '<div class="empty-mini">没有未完成的任务项</div>'}
        </div>
      </section>
      <details class="task-status-group status-complete">
        <summary class="plan-status-heading">
          <span class="status-marker"></span>
          <strong>已完成</strong>
          <small>${complete.length} 项</small>
        </summary>
        <div class="plan-status-body">
          ${complete.length ? complete.map((task) => renderTaskRow(goal, subgoal, task)).join("") : '<div class="empty-mini">还没有已完成的任务项</div>'}
        </div>
      </details>
    </div>
  `;
}

function renderTaskRow(goal, subgoal, task) {
  return `
    <div class="task-row ${Number(task.progress || 0) >= 100 ? "done" : ""}">
      <span class="level-badge level-task">任务项</span>
      <button class="plan-name-button" type="button" data-plan-edit="task" data-goal-id="${goal.id}" data-subgoal-id="${subgoal.id}" data-task-id="${task.id}">${escapeHtml(task.name)}</button>
      ${renderProgressEditor("task", goal, subgoal, task)}
      <span class="priority-badge">${escapeHtml(formatPriority(task.priority))}</span>
      <small class="plan-time">${formatDuration(getPlanDisplayDuration(goal, subgoal.id, task.id))}</small>
      <div class="progress-track"><span style="width:${task.progress}%"></span></div>
    </div>
  `;
}

function renderProgressEditor(type, goal, subgoal, task = null) {
  const item = task || subgoal;
  const label = task ? formatTaskProgress(task) : formatSubgoalProgress(subgoal);
  return `<strong class="progress-display">${escapeHtml(label)}</strong>`;
}

function openPlanEditor(type, dataset) {
  const goal = getGoal(dataset.goalId);
  const subgoal = getSubgoal(goal, dataset.subgoalId);
  const task = getTask(subgoal, dataset.taskId);
  const target = type === "goal" ? goal : type === "subgoal" ? subgoal : task;
  if (!target) return;

  els.planEditTitle.textContent = `编辑${type === "goal" ? "项目" : type === "subgoal" ? "子目标" : "任务项"}`;
  els.planEditForm.innerHTML = renderPlanEditForm(type, goal, subgoal, task);
  els.planEditForm.onsubmit = (event) => {
    event.preventDefault();
    savePlanEditor(type, goal?.id, subgoal?.id, task?.id);
  };
  els.planEditForm.querySelector("[data-plan-cancel]")?.addEventListener("click", closePlanEditor);
  els.planEditForm.querySelector("[data-plan-delete]")?.addEventListener("click", () => deletePlanEditorTarget(type, goal?.id, subgoal?.id, task?.id));
  els.planEditForm.elements.kind?.addEventListener("change", updatePlanEditKindFields);
  els.planEditForm.elements.mode?.addEventListener("change", updatePlanEditModeFields);
  updatePlanEditKindFields();
  updatePlanEditModeFields();
  els.planEditModal.hidden = false;
}

function closePlanEditor() {
  els.planEditModal.hidden = true;
  els.planEditForm.innerHTML = "";
  els.planEditForm.onsubmit = null;
}

function renderPlanEditForm(type, goal, subgoal, task) {
  const item = type === "goal" ? goal : type === "subgoal" ? subgoal : task;
  const project = getProject(goal?.projectId);
  const quantified = item?.mode === "quantified";
  return `
    <label>
      名称
      <input name="name" type="text" value="${escapeHtml(item.name)}" autocomplete="off" />
    </label>
    <label>
      重要性
      ${renderPriorityField("priority", item.priority)}
    </label>
    ${type === "goal" ? `
      <label>
        项目类型
        <select name="kind">
          <option value="goal"${goal.kind === "goal" ? " selected" : ""}>目标项目</option>
          <option value="habit"${goal.kind === "habit" ? " selected" : ""}>日常习惯</option>
          <option value="limit"${goal.kind === "limit" ? " selected" : ""}>每日上限</option>
        </select>
      </label>
      <label>
        颜色
        <input name="color" type="color" value="${project.color}" />
      </label>
      <label class="plan-limit-field" ${goal.kind === "limit" ? "" : "hidden"}>
        每日上限（分钟）
        <input name="dailyLimitMinutes" type="number" min="1" step="1" value="${Number(goal.dailyLimitMinutes || 45)}" />
      </label>
    ` : ""}
    ${type !== "goal" ? `
      <label>
        进度类型
        <select name="mode">
          <option value="quantified"${quantified ? " selected" : ""}>可量化（节、题、页等）</option>
          <option value="manual"${quantified ? "" : " selected"}>主观进度（百分比）</option>
        </select>
      </label>
      <div class="time-inputs plan-quant-fields" ${quantified ? "" : "hidden"}>
        <label>
          总数
          <input name="target" type="number" min="0" step="0.1" value="${Number(item.target || 0)}" ${quantified ? "" : "disabled"}/>
        </label>
        <label>
          单位
          <input name="unit" type="text" value="${escapeHtml(quantified ? item.unit : "节")}" autocomplete="off" ${quantified ? "" : "disabled"}/>
        </label>
      </div>
    ` : ""}
    <div class="button-row">
      <button type="button" data-plan-delete class="danger-button">删除</button>
      <button type="button" data-plan-cancel>取消</button>
      <button type="submit" class="primary">保存</button>
    </div>
  `;
}

function renderPriorityField(name, priority) {
  return `
    <select name="${name}">
      ${[5, 4, 3, 2, 1].map((value) => `<option value="${value}"${normalizePriority(priority) === value ? " selected" : ""}>P${value} · ${getPriorityLabel(value)}</option>`).join("")}
    </select>
  `;
}

function savePlanEditor(type, goalId, subgoalId, taskId) {
  const goal = getGoal(goalId);
  const subgoal = getSubgoal(goal, subgoalId);
  const task = getTask(subgoal, taskId);
  const item = type === "goal" ? goal : type === "subgoal" ? subgoal : task;
  if (!item) return;
  const form = els.planEditForm;
  const name = form.elements.name.value.trim();
  if (!name) return;

  item.name = name;
  item.priority = normalizePriority(form.elements.priority.value);
  if (type === "goal") {
    const project = getProject(goal.projectId);
    project.name = name;
    project.color = form.elements.color.value;
    const nextKind = form.elements.kind.value;
    updateGoalKind(goal, nextKind);
    goal.dailyLimitMinutes = nextKind === "limit" ? Math.max(1, Number(form.elements.dailyLimitMinutes.value || 1)) : 0;
  } else {
    const previousMode = item.mode;
    const nextMode = form.elements.mode.value;
    item.mode = nextMode;
    if (nextMode === "quantified") {
      item.target = Math.max(0, Number(form.elements.target.value || 0));
      item.unit = form.elements.unit.value.trim() || "个";
    } else {
      item.target = 0;
      item.unit = "%";
    }
    if (previousMode !== nextMode) {
      item.done = 0;
      item.progress = 0;
      rebuildProgressFromEntries();
    } else if (type === "task") {
      item.progress = nextMode === "quantified"
        ? clampProgress(item.target ? Number(item.done || 0) / item.target * 100 : 0)
        : clampProgress(item.progress);
      recalculateSubgoalProgress(subgoal);
    } else {
      recalculateSubgoalProgress(item);
    }
  }

  saveState();
  closePlanEditor();
  render();
}

function updatePlanEditKindFields() {
  const kind = els.planEditForm.elements.kind?.value;
  const limitField = els.planEditForm.querySelector(".plan-limit-field");
  if (!limitField) return;
  limitField.hidden = kind !== "limit";
  limitField.querySelector("input").disabled = kind !== "limit";
}

function updatePlanEditModeFields() {
  const mode = els.planEditForm.elements.mode?.value;
  const fields = els.planEditForm.querySelector(".plan-quant-fields");
  if (!fields) return;
  const quantified = mode === "quantified";
  fields.hidden = !quantified;
  fields.querySelectorAll("input").forEach((input) => {
    input.disabled = !quantified;
  });
}

function deletePlanEditorTarget(type, goalId, subgoalId, taskId) {
  closePlanEditor();
  if (type === "goal") deleteGoal(goalId);
  if (type === "subgoal") deleteSubgoal(goalId, subgoalId);
  if (type === "task") deleteTask(goalId, subgoalId, taskId);
}

function renderTimer() {
  const active = state.activeEntry;
  const selectedGoal = getGoal(els.timerProject.value);
  const selectedSubgoal = getSubgoal(selectedGoal, els.timerSubgoal.value);
  const selectableSubgoals = getSelectableSubgoals(selectedGoal);
  const selectableTasks = getSelectableTasks(selectedGoal, selectedSubgoal);
  els.timerState.textContent = active ? "进行中" : "未开始";
  els.timerState.classList.toggle("running", Boolean(active));
  els.activeTimer.hidden = !active;
  els.startBtn.disabled = Boolean(active);
  els.stopBtn.disabled = !active;
  els.timerProject.disabled = Boolean(active);
  els.timerSubgoal.disabled = !selectableSubgoals.length;
  els.timerTask.disabled = !selectableTasks.length;

  if (active) {
    els.timerProject.value = active.goalId || getGoalByProjectId(active.projectId)?.id || "";
    renderSubgoalOptions("timer");
    els.timerSubgoal.value = active.subgoalId || "";
    renderTaskOptions("timer");
    els.timerTask.value = active.taskId || "";
    const activeGoal = getGoal(active.goalId);
    const activeSubgoal = getSubgoal(activeGoal, active.subgoalId);
    const activeTask = getTask(activeSubgoal, active.taskId);
    els.activeTimerTarget.textContent = [activeGoal?.name, activeSubgoal?.name, activeTask?.name].filter(Boolean).join(" / ");
    updateElapsed();
  } else {
    els.elapsedTime.textContent = "00:00:00";
    els.activeTimerTarget.textContent = "";
  }
}

function syncActiveEntryTargetFromTimer() {
  if (!state.activeEntry) return;
  const goal = getGoal(state.activeEntry.goalId);
  const subgoal = getSubgoal(goal, els.timerSubgoal.value);
  const task = getTask(subgoal, els.timerTask.value);
  state.activeEntry.subgoalId = subgoal?.id || "";
  state.activeEntry.taskId = task?.id || "";
}

function renderCalendar() {
  if (currentView === "month") {
    renderMonthBoard();
    return;
  }
  if (currentView === "year") {
    renderYearBoard();
    return;
  }
  renderTimeBoard();
}

function renderTimeBoard() {
  const days = getVisibleDays();
  els.calendarGrid.className = "calendar-grid";
  els.calendarGrid.style.setProperty("--days", days.length);
  els.calendarHeader.className = "calendar-header";
  els.calendarHeader.style.gridTemplateColumns = `repeat(${days.length}, minmax(130px, 1fr))`;
  els.calendarHeader.innerHTML = days
    .map((day) => {
      const label = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(day);
      return `<div class="calendar-day-head"><div><strong>${formatMonthDay(day)}</strong><br>${label}</div></div>`;
    })
    .join("");

  els.rangeTitle.textContent = currentView === "day"
    ? formatFullDate(days[0])
    : `${formatMonthDay(days[0])} - ${formatMonthDay(days[days.length - 1])}`;

  els.calendarGrid.innerHTML = "";
  els.calendarGrid.append(renderTimeLabels());

  days.forEach((day, index) => {
    const column = document.createElement("div");
    column.className = "day-column";
    column.style.gridColumn = String(index + 2);
    column.dataset.date = toDateKey(day);
    getEntriesForDay(day).forEach((entry) => column.append(renderTimeBlock(entry, day)));
    els.calendarGrid.append(column);
  });

  updateViewButtons();
  scrollCalendarToDaytime();
}

function renderMonthBoard() {
  const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  els.rangeTitle.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(monthStart);
  els.calendarHeader.className = "board-header";
  els.calendarHeader.removeAttribute("style");
  els.calendarHeader.innerHTML = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label) => `<div>${label}</div>`).join("");
  els.calendarGrid.className = "month-board";
  els.calendarGrid.innerHTML = "";

  cells.forEach((day) => {
    const dayEntries = getEntriesForDay(day);
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const totalMs = dayEntries.reduce((sum, entry) => sum + clippedDuration(entry, dayStart, dayEnd), 0);
    const projectTotals = getProjectTotals(dayEntries, dayStart, dayEnd).slice(0, 3);
    const cell = document.createElement("article");
    cell.className = `month-cell${day.getMonth() === monthStart.getMonth() ? "" : " muted-cell"}`;
    cell.innerHTML = `
      <div class="month-cell-head">
        <strong>${day.getDate()}</strong>
        <span>${totalMs ? formatDuration(totalMs) : ""}</span>
      </div>
      <div class="month-entry-list">
        ${projectTotals.map((item) => `
          <div class="month-project-row" style="--entry-color:${item.project.color}">
            <div>
              <span>${escapeHtml(item.project.name)}</span>
              <strong>${formatDuration(item.ms)}</strong>
            </div>
            <div class="progress-track"><span style="width:${totalMs ? Math.round(item.ms / totalMs * 100) : 0}%; background:${item.project.color}"></span></div>
          </div>
        `).join("") || `<small>暂无记录</small>`}
      </div>
    `;
    els.calendarGrid.append(cell);
  });

  updateViewButtons();
}

function renderYearBoard() {
  const year = cursorDate.getFullYear();
  els.rangeTitle.textContent = `${year} 年`;
  els.calendarHeader.className = "board-header year-summary";
  els.calendarHeader.removeAttribute("style");
  els.calendarHeader.innerHTML = `<div>全年按月汇总</div>`;
  els.calendarGrid.className = "year-board";
  els.calendarGrid.innerHTML = "";

  Array.from({ length: 12 }, (_, month) => {
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 1);
    const entries = state.entries.filter((entry) => intersectsRange(entry, rangeStart, rangeEnd));
    const totalMs = entries.reduce((sum, entry) => sum + clippedDuration(entry, rangeStart, rangeEnd), 0);
    const projectTotals = getProjectTotals(entries, rangeStart, rangeEnd).slice(0, 4);
    const card = document.createElement("article");
    card.className = "year-card";
    card.innerHTML = `
      <div class="year-card-head">
        <strong>${month + 1}月</strong>
        <span>${formatDuration(totalMs)}</span>
      </div>
      <div class="year-bars">
        ${projectTotals.map((item) => `
          <div>
            <span>${escapeHtml(item.project.name)}</span>
            <strong>${formatDuration(item.ms)}</strong>
            <div class="progress-track"><span style="width:${totalMs ? Math.round(item.ms / totalMs * 100) : 0}%; background:${item.project.color}"></span></div>
          </div>
        `).join("") || `<div class="empty-mini">暂无记录</div>`}
      </div>
    `;
    els.calendarGrid.append(card);
  });

  updateViewButtons();
}

function renderTimeLabels() {
  const labels = document.createElement("div");
  labels.className = "time-labels";
  for (let hour = 0; hour <= 24; hour += 1) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.top = `${hour * 60 * PIXELS_PER_MINUTE}px`;
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    labels.append(label);
  }
  return labels;
}

function renderTimeBlock(entry, day) {
  const project = getProject(entry.projectId);
  const goalText = formatEntryGoalText(entry);
  const start = new Date(entry.startTime);
  const end = new Date(entry.endTime || new Date());
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const visibleStart = new Date(Math.max(start, dayStart));
  const visibleEnd = new Date(Math.min(end, dayEnd));
  const top = minutesSinceStartOfDay(visibleStart) * PIXELS_PER_MINUTE;
  const height = Math.max(28, (visibleEnd - visibleStart) / 60000 * PIXELS_PER_MINUTE);

  const block = document.createElement("div");
  block.className = "time-block";
  block.style.top = `${top}px`;
  block.style.height = `${height}px`;
  block.style.background = project.color;
  block.title = `${entry.description}\n${project.name} · ${formatTime(start)}-${formatTime(end)} · ${formatDuration(end - start)}${goalText ? `\n${goalText}` : ""}`;
  block.innerHTML = `
    <strong>${escapeHtml(entry.description)}</strong>
    <span>${escapeHtml(project.name)} · ${formatTime(start)}-${formatTime(end)}</span>
    ${goalText ? `<span>${escapeHtml(goalText)}</span>` : ""}
  `;
  return block;
}

function renderStats() {
  const { rangeStart, rangeEnd, denominator, label } = getCurrentRange();
  const entries = state.entries.filter((entry) => intersectsRange(entry, rangeStart, rangeEnd));
  const totalMs = entries.reduce((sum, entry) => sum + clippedDuration(entry, rangeStart, rangeEnd), 0);
  const top = getProjectTotals(entries, rangeStart, rangeEnd)[0];
  const progress = entries.reduce((sum, entry) => sum + Number(entry.progressDelta || 0), 0);
  const cards = [
    ["总记录", `${entries.length} 条`],
    ["总时长", formatDuration(totalMs)],
    [label, formatDuration(totalMs / denominator)],
    ["进度推进", progress ? `+${formatPercent(progress)}` : "暂无"],
    ["最多投入", top ? `${top.project.name} · ${formatDuration(top.ms)}` : "暂无"],
  ];

  els.statsStrip.innerHTML = cards
    .map(([cardLabel, value]) => `<div class="stat-card"><span>${cardLabel}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderEntries() {
  const template = document.querySelector("#entryCardTemplate");
  const recentStart = addDays(startOfDay(new Date()), -2);
  const sorted = state.entries
    .filter((entry) => intersectsRange(entry, recentStart, addDays(startOfDay(new Date()), 1)))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  els.entryList.innerHTML = "";

  if (!sorted.length) {
    els.entryList.innerHTML = `<div class="empty-state">还没有记录。可以先开始一个计时，或手动补录一段。</div>`;
    return;
  }

  sorted.forEach((entry) => {
    const project = getProject(entry.projectId);
    const goalText = formatEntryGoalText(entry);
    const end = entry.endTime ? new Date(entry.endTime) : new Date(entry.startTime);
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".project-dot").style.background = project.color;
    node.querySelector("strong").textContent = entry.description;
    node.querySelector("p").textContent = [project.name, goalText].filter(Boolean).join(" · ");
    node.querySelector("time").textContent = `${formatFullDate(new Date(entry.startTime))} ${formatTime(new Date(entry.startTime))}-${formatTime(end)} · ${formatDuration(end - new Date(entry.startTime))}`;
    node.querySelector(".edit-entry").addEventListener("click", () => openEntryEditor(node, entry));
    node.querySelector(".entry-edit-form").addEventListener("submit", (event) => {
      event.preventDefault();
      saveEntryEdit(node, entry.id);
    });
    node.querySelector("[data-entry-cancel]").addEventListener("click", () => closeEntryEditor(node));
    node.querySelector(".delete-entry").addEventListener("click", () => {
      reverseProgressDelta(entry);
      state.entries = state.entries.filter((item) => item.id !== entry.id);
      saveState();
      render();
    });
    els.entryList.append(node);
  });
}

function openEntryEditor(node, entry) {
  const form = node.querySelector(".entry-edit-form");
  form.hidden = false;
  form.querySelector('[data-entry-field="description"]').value = entry.description;
  form.querySelector('[data-entry-field="start"]').value = toLocalInputValue(new Date(entry.startTime));
  form.querySelector('[data-entry-field="end"]').value = toLocalInputValue(new Date(entry.endTime || entry.startTime));
  renderEntryTargetEditor(form, entry);
  renderEntryProgressEditor(form, entry);
  form.querySelector('[data-entry-field="subgoal"]').onchange = () => {
    renderEntryTaskEditor(form, entry);
    renderEntryProgressEditor(form, entry);
  };
  form.querySelector('[data-entry-field="task"]').onchange = () => renderEntryProgressEditor(form, entry);
  form.querySelector(".entry-edit-error").hidden = true;
}

function renderEntryTargetEditor(form, entry) {
  const goal = getGoal(entry.goalId);
  const subgoalSelect = form.querySelector('[data-entry-field="subgoal"]');
  const subgoals = goal?.subgoals || [];
  subgoalSelect.innerHTML = subgoals.length
    ? subgoals.map((subgoal) => `<option value="${subgoal.id}">${escapeHtml(subgoal.name)}</option>`).join("")
    : '<option value="">无关联子目标</option>';
  subgoalSelect.disabled = !subgoals.length;
  if (getSubgoal(goal, entry.subgoalId)) subgoalSelect.value = entry.subgoalId;
  renderEntryTaskEditor(form, entry);
}

function renderEntryTaskEditor(form, entry) {
  const goal = getGoal(entry.goalId);
  const subgoalId = form.querySelector('[data-entry-field="subgoal"]').value;
  const subgoal = getSubgoal(goal, subgoalId);
  const taskSelect = form.querySelector('[data-entry-field="task"]');
  const tasks = subgoal?.tasks || [];
  taskSelect.innerHTML = tasks.length
    ? `<option value="">记录到子目标</option>${tasks.map((task) => `<option value="${task.id}">${escapeHtml(task.name)}</option>`).join("")}`
    : '<option value="">记录到子目标</option>';
  taskSelect.disabled = !tasks.length;
  if (getTask(subgoal, entry.taskId)) taskSelect.value = entry.taskId;
}

function closeEntryEditor(node) {
  const form = node.querySelector(".entry-edit-form");
  form.hidden = true;
  form.querySelector(".entry-edit-error").hidden = true;
}

function saveEntryEdit(node, entryId) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const form = node.querySelector(".entry-edit-form");
  const error = form.querySelector(".entry-edit-error");
  const description = normalizeDescription(form.querySelector('[data-entry-field="description"]').value);
  const start = parseDateTimeInput(form.querySelector('[data-entry-field="start"]').value);
  const end = parseDateTimeInput(form.querySelector('[data-entry-field="end"]').value);
  const progressInput = form.querySelector('[data-entry-field="progress"]');
  const goal = getGoal(entry.goalId);
  const selectedSubgoalId = form.querySelector('[data-entry-field="subgoal"]').value;
  const selectedTaskId = form.querySelector('[data-entry-field="task"]').value;
  const target = getProgressTarget(goal, selectedSubgoalId, selectedTaskId);
  const canEditProgress = supportsTasks(goal) && Boolean(target.item);
  const amountValue = canEditProgress ? Number(progressInput.value || 0) : 0;

  if (!start || !end || end <= start) {
    error.textContent = "请填写有效时间段，结束时间需要晚于开始时间。";
    error.hidden = false;
    return;
  }
  if (canEditProgress && amountValue < 0) {
    error.textContent = "推进量不能小于 0。";
    error.hidden = false;
    return;
  }

  reverseProgressDelta(entry);
  const progress = calculateProgressDelta(entry.goalId, target.subgoal?.id, target.task?.id, amountValue);
  entry.description = description;
  entry.subgoalId = target.subgoal?.id || "";
  entry.taskId = target.task?.id || "";
  entry.startTime = start.toISOString();
  entry.endTime = end.toISOString();
  entry.amountDelta = amountValue;
  entry.progressDelta = progress.percent;
  entry.progressLabel = progress.label;
  entry.updatedAt = new Date().toISOString();
  applyProgressDelta(entry);
  saveState();
  render();
}

function renderEntryProgressEditor(form, entry) {
  const input = form.querySelector('[data-entry-field="progress"]');
  const hint = form.querySelector(".entry-edit-hint");
  const goal = getGoal(entry.goalId);
  const subgoalId = form.querySelector('[data-entry-field="subgoal"]')?.value || entry.subgoalId;
  const taskId = form.querySelector('[data-entry-field="task"]')?.value || "";
  const target = getProgressTarget(goal, subgoalId, taskId);
  const item = target.item;
  input.value = getEntryProgressEditValue(entry, item);

  if (!supportsTasks(goal) || !item) {
    input.disabled = true;
    input.placeholder = goal?.kind === "habit" ? "日常习惯无需填写推进量" : "这条记录没有可修改的进度";
    hint.textContent = goal?.kind === "limit" ? "每日上限按时间自动统计。" : "这条记录只修改名称和时间段。";
    return;
  }

  input.disabled = false;
  if (item.mode === "quantified") {
    input.placeholder = `例如 3${item.unit}`;
    hint.textContent = `当前记录为 ${formatNumber(Number(entry.amountDelta || 0))}${item.unit}。保存后会同步更新计划进度。`;
  } else {
    input.placeholder = "例如 8";
    hint.textContent = `当前记录为 +${formatPercent(Number(entry.progressDelta || 0))}。保存后会同步更新计划进度。`;
  }
}

function getEntryProgressEditValue(entry, item) {
  if (!item) return "";
  if (item.mode === "quantified") return Number(entry.amountDelta || 0) || "";
  return Number(entry.progressDelta || 0) || "";
}

function setModule(module) {
  currentModule = module;
  renderModule();
  if (module === "calendar") {
    scrollCalendarToDaytime();
  }
}

function setView(view) {
  currentView = view;
  render();
}

function moveRange(direction) {
  const next = new Date(cursorDate);
  if (currentView === "year") {
    next.setFullYear(next.getFullYear() + direction);
  } else if (currentView === "month") {
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setDate(next.getDate() + (currentView === "day" ? direction : direction * 7));
  }
  cursorDate = startOfDay(next);
  render();
}

function syncTicker() {
  clearInterval(ticker);
  ticker = null;
  if (state.activeEntry) {
    ticker = setInterval(() => {
      updateElapsed();
      renderCalendar();
      renderStats();
    }, 1000);
  }
}

function updateElapsed() {
  if (!state.activeEntry) return;
  const ms = new Date() - new Date(state.activeEntry.startTime);
  els.elapsedTime.textContent = formatClock(ms);
}

function openCompletionModal() {
  const goal = getGoal(state.activeEntry.goalId);
  const subgoal = getSubgoal(goal, state.activeEntry.subgoalId);
  const target = getProgressTarget(goal, state.activeEntry.subgoalId, state.activeEntry.taskId);
  els.completionSubgoal.textContent = getCompletionTitle(goal, subgoal, target.task);
  els.completionDescription.value = "";
  els.completionAmount.value = "";
  els.completionAmountLabel.textContent = "本次完成量 / 推进";
  if (goal?.kind === "habit") {
    els.completionAmount.disabled = true;
    els.completionAmount.placeholder = "日常习惯不需要填写数量";
    els.completionHint.textContent = subgoal
      ? `保存后会把「${subgoal.name}」标记为今天已完成。`
      : "保存后会把这个习惯标记为今天已完成。";
  } else if (goal?.kind === "limit") {
    els.completionAmount.disabled = true;
    els.completionAmount.placeholder = "每日上限按本次记录时长自动统计";
    els.completionHint.textContent = `本次时长会计入 ${formatDuration(goal.dailyLimitMinutes * 60000)} 的每日上限。`;
  } else if (!target.item) {
    els.completionAmount.disabled = true;
    els.completionAmount.placeholder = target.subgoal?.tasks?.length ? "需要选择具体任务项" : "没有可记录的进度";
    els.completionHint.textContent = target.subgoal?.tasks?.length
      ? "这个子目标的进度由任务项计算；本次只保存时间，不直接覆盖子目标进度。"
      : "没有可记录进度的子目标，可以直接保存本次时间。";
  } else if (target.item.mode === "quantified") {
    els.completionAmount.disabled = false;
    els.completionAmountLabel.textContent = `本次完成数量（${target.item.unit}）`;
    els.completionAmount.placeholder = `输入本次完成数量，例如 3${target.item.unit}`;
    els.completionHint.textContent = `当前 ${formatNumber(target.item.done)}/${formatNumber(target.item.target)}${target.item.unit}`;
  } else {
    els.completionAmount.disabled = false;
    els.completionAmountLabel.textContent = "本次推进百分比（%）";
    els.completionAmount.placeholder = "输入本次主观推进百分比，例如 8";
    els.completionHint.textContent = `当前 ${formatPercent(subgoal.progress)}`;
  }
  els.completionModal.hidden = false;
  if (!els.completionAmount.disabled) {
    els.completionAmount.focus();
  }
}

function finalizeActiveEntry(amount, description = "") {
  if (!state.activeEntry) return;
  const goal = getGoal(state.activeEntry.goalId);
  const amountValue = supportsTasks(goal) ? amount : 0;
  const progress = calculateProgressDelta(goal?.id, state.activeEntry.subgoalId, state.activeEntry.taskId, amountValue);
  const finished = {
    ...state.activeEntry,
    description: normalizeDescription(description),
    amountDelta: Number(amountValue || 0),
    progressDelta: progress.percent,
    progressLabel: progress.label,
    note: "",
    endTime: (pendingStopTime || new Date()).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.entries.push(finished);
  applyProgressDelta(finished);
  state.activeEntry = null;
  pendingStopTime = null;
  els.completionModal.hidden = true;
  saveState();
  render();
  syncTicker();
}

function scrollCalendarToDaytime() {
  if (currentView !== "day" && currentView !== "week") return;
  requestAnimationFrame(() => {
    const scroller = document.querySelector(".calendar-scroll");
    if (!scroller) return;
    scroller.scrollTop = 9 * 60 * PIXELS_PER_MINUTE;
  });
}

function applyProgressDelta(entry) {
  const goal = getGoal(entry.goalId);
  if (!supportsTasks(goal) || !entry.subgoalId) return;
  const subgoal = getSubgoal(goal, entry.subgoalId);
  if (!subgoal) return;
  const task = getTask(subgoal, entry.taskId);
  if (!task && subgoal.tasks.length) {
    recalculateSubgoalProgress(subgoal);
    return;
  }
  const item = task || subgoal;
  if (item.mode === "quantified") {
    item.done = Math.max(0, Number(item.done || 0) + Number(entry.amountDelta || 0));
    item.progress = clampProgress(item.target ? item.done / item.target * 100 : 0);
  } else {
    item.progress = clampProgress(Number(item.progress || 0) + Number(entry.progressDelta || 0));
  }
  if (task) {
    recalculateSubgoalProgress(subgoal);
  } else {
    subgoal.manualOverride = true;
  }
}

function reverseProgressDelta(entry) {
  const goal = getGoal(entry.goalId);
  if (!supportsTasks(goal) || !entry.subgoalId) return;
  const subgoal = getSubgoal(goal, entry.subgoalId);
  if (!subgoal) return;
  const task = getTask(subgoal, entry.taskId);
  if (!task && subgoal.tasks.length) {
    recalculateSubgoalProgress(subgoal);
    return;
  }
  const item = task || subgoal;
  if (item.mode === "quantified") {
    item.done = Math.max(0, Number(item.done || 0) - Number(entry.amountDelta || 0));
    item.progress = clampProgress(item.target ? item.done / item.target * 100 : 0);
  } else {
    item.progress = clampProgress(Number(item.progress || 0) - Number(entry.progressDelta || 0));
  }
  if (task) {
    recalculateSubgoalProgress(subgoal);
  } else {
    subgoal.manualOverride = true;
  }
}

function rebuildProgressFromEntries() {
  const touched = collectProgressTargets();
  resetTouchedProgress(touched);
  state.entries.forEach((entry) => {
    if (hasProgressPayload(entry)) {
      applyProgressDelta(entry);
    }
  });
}

function collectProgressTargets() {
  const directSubgoals = new Set();
  const tasks = new Set();
  state.entries.forEach((entry) => {
    if (!hasProgressPayload(entry) || !entry.goalId || !entry.subgoalId) return;
    if (entry.taskId) {
      tasks.add(makeProgressKey(entry.goalId, entry.subgoalId, entry.taskId));
    } else {
      directSubgoals.add(makeProgressKey(entry.goalId, entry.subgoalId));
    }
  });
  return { directSubgoals, tasks };
}

function resetTouchedProgress({ directSubgoals, tasks }) {
  state.goals.forEach((goal) => {
    goal.subgoals.forEach((subgoal) => {
      const subgoalKey = makeProgressKey(goal.id, subgoal.id);
      if (directSubgoals.has(subgoalKey)) {
        subgoal.done = 0;
        subgoal.progress = 0;
        subgoal.manualOverride = false;
      }
      subgoal.tasks.forEach((task) => {
        if (!tasks.has(makeProgressKey(goal.id, subgoal.id, task.id))) return;
        task.done = 0;
        task.progress = 0;
      });
      if (subgoal.tasks.some((task) => tasks.has(makeProgressKey(goal.id, subgoal.id, task.id))) && !directSubgoals.has(subgoalKey)) {
        recalculateSubgoalProgress(subgoal);
      }
    });
  });
}

function hasProgressPayload(entry) {
  return Number(entry.amountDelta || 0) || Number(entry.progressDelta || 0);
}

function makeProgressKey(goalId, subgoalId, taskId = "") {
  return [goalId, subgoalId, taskId].join("|");
}

function calculateProgressDelta(goalId, subgoalId, taskId, amount) {
  const goal = getGoal(goalId);
  if (!supportsTasks(goal)) return { percent: 0, label: "" };
  const item = getProgressTarget(goal, subgoalId, taskId).item;
  const value = Number(amount || 0);
  if (!item || !value) return { percent: 0, label: "" };
  if (item.mode === "quantified") {
    const percent = item.target ? value / item.target * 100 : 0;
    return { percent, label: `+${formatNumber(value)}${item.unit}` };
  }
  return { percent: value, label: `+${formatPercent(value)}` };
}

function updateProgressHint(scope) {
  const controls = getScopeControls(scope);
  const goal = getGoal(controls.goal.value);
  const subgoal = getSubgoal(goal, controls.subgoal.value);
  const task = getTask(subgoal, controls.task?.value);
  const item = getProgressTarget(goal, subgoal?.id, task?.id).item;
  if (!controls.amount) return;
  controls.amount.disabled = !supportsTasks(goal);
  if (goal?.kind === "habit") {
    controls.amount.value = "";
    controls.amount.placeholder = "日常习惯完成一次即可，不需要填写推进量";
    return;
  }
  if (goal?.kind === "limit") {
    controls.amount.value = "";
    controls.amount.placeholder = "每日上限按补录时长自动统计";
    return;
  }
  controls.amount.disabled = false;
  if (!item) {
    controls.amount.value = "";
    controls.amount.disabled = Boolean(subgoal?.tasks?.length);
    controls.amount.placeholder = subgoal?.tasks?.length
      ? "请选择具体任务项后填写完成量"
      : "量化目标填数量，主观目标填百分比";
    return;
  }
  controls.amount.placeholder = item.mode === "quantified"
    ? `输入完成数量，例如 3${item.unit}`
    : "输入主观推进百分比，例如 8";
}

function renderSubgoalModeFields() {
  const goal = getGoal(els.subgoalProject.value);
  const habit = goal?.kind === "habit";
  const quantified = !habit && els.subgoalMode.value === "quantified";
  els.subgoalMode.disabled = habit;
  els.subgoalQuantFields.hidden = !quantified;
  els.subgoalTarget.disabled = !quantified;
  els.subgoalUnit.disabled = !quantified;
  els.subgoalName.placeholder = habit ? "例如：早饭、背单词、多邻国" : "例如：听课、刷题、文献综述";
}

function renderTaskModeFields() {
  const quantified = els.taskMode.value === "quantified";
  els.taskQuantFields.hidden = !quantified;
  els.taskTarget.disabled = !quantified;
  els.taskUnit.disabled = !quantified;
}

function renderGoalKindFields() {
  const isLimit = els.goalKind.value === "limit";
  els.goalLimitFields.hidden = !isLimit;
  els.goalLimitMinutes.disabled = !isLimit;
}

function getScopeControls(scope) {
  if (scope === "timer") return { goal: els.timerProject, subgoal: els.timerSubgoal, task: els.timerTask, amount: null };
  if (scope === "entry") return { goal: els.entryProject, subgoal: els.entrySubgoal, task: els.entryTask, amount: els.entryProgress };
  return { goal: null, subgoal: null, task: null, amount: null };
}

function getVisibleDays() {
  if (currentView === "day") return [startOfDay(cursorDate)];
  const day = startOfDay(cursorDate);
  const offset = (day.getDay() + 6) % 7;
  const monday = addDays(day, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function getCurrentRange() {
  if (currentView === "year") {
    return { rangeStart: new Date(cursorDate.getFullYear(), 0, 1), rangeEnd: new Date(cursorDate.getFullYear() + 1, 0, 1), denominator: 12, label: "月均" };
  }
  if (currentView === "month") {
    const rangeStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const rangeEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
    return { rangeStart, rangeEnd, denominator: Math.round((rangeEnd - rangeStart) / 86400000), label: "日均" };
  }
  const days = getVisibleDays();
  return {
    rangeStart: startOfDay(days[0]),
    rangeEnd: addDays(startOfDay(days[days.length - 1]), 1),
    denominator: currentView === "week" ? 7 : 1,
    label: currentView === "week" ? "日均" : "今日",
  };
}

function getEntriesForDay(day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return state.entries
    .concat(state.activeEntry ? [state.activeEntry] : [])
    .filter((entry) => intersectsRange(entry, dayStart, dayEnd))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

function getProject(projectId) {
  return state.projects.find((project) => project.id === projectId) || { name: "未分类", color: "#69717d" };
}

function getGoal(goalId) {
  return state.goals.find((goal) => goal.id === goalId);
}

function getGoalByProjectId(projectId) {
  return state.goals.find((goal) => goal.projectId === projectId);
}

function getSubgoal(goal, subgoalId) {
  return goal?.subgoals.find((subgoal) => subgoal.id === subgoalId);
}

function getTask(subgoal, taskId) {
  return subgoal?.tasks.find((task) => task.id === taskId);
}

function getSortedProgressItems(items) {
  return [...items].sort((a, b) => {
    const aDone = Number(a.progress || 0) >= 100;
    const bDone = Number(b.progress || 0) >= 100;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return comparePriorityItems(a, b);
  });
}

function getSortedPriorityItems(items) {
  return [...(items || [])].sort(comparePriorityItems);
}

function comparePriorityItems(a, b) {
  const byPriority = normalizePriority(b.priority) - normalizePriority(a.priority);
  if (byPriority) return byPriority;
  return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
}

function getSelectableSubgoals(goal) {
  if (!supportsSubgoals(goal)) return [];
  return getSortedSubgoalOptions(goal).filter((subgoal) => isSelectableSubgoal(goal, subgoal));
}

function getSelectableTasks(goal, subgoal) {
  if (!supportsTasks(goal) || !subgoal?.tasks?.length) return [];
  return getSortedProgressItems(subgoal.tasks).filter((task) => Number(task.progress || 0) < 100);
}

function isSelectableSubgoal(goal, subgoal) {
  if (goal?.kind === "habit") return !isHabitSubgoalDoneToday(goal.id, subgoal.id);
  return Number(subgoal?.progress || 0) < 100;
}

function isSubgoalComplete(goal, subgoal) {
  if (goal?.kind === "habit") return isHabitSubgoalDoneToday(goal.id, subgoal.id);
  return Number(subgoal?.progress || 0) >= 100;
}

function getSortedSubgoalOptions(goal) {
  if (goal?.kind !== "habit") return getSortedProgressItems(goal?.subgoals || []);
  return [...(goal.subgoals || [])].sort((a, b) => {
    const aDone = isHabitSubgoalDoneToday(goal.id, a.id);
    const bDone = isHabitSubgoalDoneToday(goal.id, b.id);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return comparePriorityItems(a, b);
  });
}

function getProgressTarget(goal, subgoalId, taskId) {
  const subgoal = getSubgoal(goal, subgoalId);
  const task = getTask(subgoal, taskId);
  const item = task || (subgoal?.tasks?.length ? null : subgoal);
  return { subgoal, task, item };
}

function getGoalProgress(goal) {
  if (goal.kind === "habit") {
    if (!goal.subgoals.length) return isHabitDoneToday(goal) ? 100 : 0;
    const done = goal.subgoals.filter((subgoal) => isHabitSubgoalDoneToday(goal.id, subgoal.id)).length;
    return goal.subgoals.length ? done / goal.subgoals.length * 100 : 0;
  }
  if (goal.kind === "limit") {
    const limitMs = Number(goal.dailyLimitMinutes || 0) * 60000;
    return limitMs ? getGoalTodayDuration(goal) / limitMs * 100 : 0;
  }
  if (!goal.subgoals.length) return 0;
  const quantitySummary = summarizeQuantifiedItems(goal.subgoals);
  if (quantitySummary) return quantitySummary.progress;
  const total = goal.subgoals.reduce((sum, subgoal) => sum + Number(subgoal.progress || 0), 0);
  return clampProgress(total / goal.subgoals.length);
}

function getGoalMeta(goal) {
  if (goal.kind === "habit") {
    const used = getGoalTodayDuration(goal);
    if (goal.subgoals.length) {
      const done = goal.subgoals.filter((subgoal) => isHabitSubgoalDoneToday(goal.id, subgoal.id)).length;
      return `日常习惯 · 今天 ${done}/${goal.subgoals.length} 完成 · ${formatDuration(used)}`;
    }
    return `${isHabitDoneToday(goal) ? "日常习惯 · 今天已完成" : "日常习惯 · 今天未完成"} · ${formatDuration(used)}`;
  }
  if (goal.kind === "limit") {
    const used = getGoalTodayDuration(goal);
    const limit = Number(goal.dailyLimitMinutes || 0) * 60000;
    return `每日上限 · ${formatDuration(used)} / ${formatDuration(limit)}`;
  }
  return `${goal.subgoals.length} 个子目标 · ${formatPercent(getGoalProgress(goal))}`;
}

function getGoalKindNote(goal) {
  if (goal.kind === "habit") {
    if (goal.subgoals.length) return "在记录时间或补录时间中选择某个子目标，保存后它会标记为今天完成。";
    return isHabitDoneToday(goal) ? "今天已经记录过一次，保持这个节奏。" : "在记录时间或补录时间中保存一次，就会标记为今天完成。";
  }
  if (goal.kind === "limit") {
    const used = getGoalTodayDuration(goal);
    const limit = Number(goal.dailyLimitMinutes || 0) * 60000;
    if (limit && used > limit) return `今天已超过 ${formatDuration(used - limit)}。`;
    return `今天还剩 ${formatDuration(Math.max(0, limit - used))}。`;
  }
  return "";
}

function getGoalTodayDuration(goal) {
  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);
  return state.entries
    .concat(state.activeEntry ? [state.activeEntry] : [])
    .filter((entry) => entry.goalId === goal.id && intersectsRange(entry, todayStart, todayEnd))
    .reduce((sum, entry) => sum + clippedDuration(entry, todayStart, todayEnd), 0);
}

function isHabitSubgoalDoneToday(goalId, subgoalId) {
  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);
  return state.entries
    .concat(state.activeEntry ? [state.activeEntry] : [])
    .some((entry) => entry.goalId === goalId && entry.subgoalId === subgoalId && intersectsRange(entry, todayStart, todayEnd));
}

function getPlanDuration(goalId, subgoalId = "", taskId = "") {
  return state.entries
    .concat(state.activeEntry ? [state.activeEntry] : [])
    .filter((entry) => {
      if (entry.goalId !== goalId) return false;
      if (subgoalId && entry.subgoalId !== subgoalId) return false;
      if (taskId && entry.taskId !== taskId) return false;
      return true;
    })
    .reduce((sum, entry) => sum + Math.max(0, new Date(entry.endTime || new Date()) - new Date(entry.startTime)), 0);
}

function getPlanDisplayDuration(goal, subgoalId = "", taskId = "") {
  if (goal?.kind === "habit" || goal?.kind === "limit") {
    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    return state.entries
      .concat(state.activeEntry ? [state.activeEntry] : [])
      .filter((entry) => {
        if (entry.goalId !== goal.id) return false;
        if (subgoalId && entry.subgoalId !== subgoalId) return false;
        if (taskId && entry.taskId !== taskId) return false;
        return intersectsRange(entry, todayStart, todayEnd);
      })
      .reduce((sum, entry) => sum + clippedDuration(entry, todayStart, todayEnd), 0);
  }
  return getPlanDuration(goal.id, subgoalId, taskId);
}

function isHabitDoneToday(goal) {
  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);
  return state.entries.some((entry) => entry.goalId === goal.id && intersectsRange(entry, todayStart, todayEnd));
}

function getProjectTotals(entries, rangeStart, rangeEnd) {
  return state.projects
    .map((project) => ({
      project,
      ms: entries
        .filter((entry) => entry.projectId === project.id)
        .reduce((sum, entry) => sum + clippedDuration(entry, rangeStart, rangeEnd), 0),
    }))
    .filter((item) => item.ms > 0)
    .sort((a, b) => b.ms - a.ms);
}

function deleteGoal(goalId) {
  const goal = getGoal(goalId);
  state.goals = state.goals.filter((goal) => goal.id !== goalId);
  if (goal) {
    state.projects = state.projects.filter((project) => project.id !== goal.projectId);
  }
  state.entries = state.entries.map((entry) => entry.goalId === goalId ? { ...entry, goalId: "", subgoalId: "", amountDelta: 0, progressDelta: 0, progressLabel: "" } : entry);
  if (state.activeEntry?.goalId === goalId) {
    state.activeEntry.goalId = "";
    state.activeEntry.subgoalId = "";
    state.activeEntry.taskId = "";
    state.activeEntry.amountDelta = 0;
    state.activeEntry.progressDelta = 0;
    state.activeEntry.progressLabel = "";
  }
  saveState();
  render();
}

function mergeProjectsIntoGoal(targetGoalId, sourceGoalIds) {
  const target = getGoal(targetGoalId);
  if (!target || !sourceGoalIds.length) return;
  if (!supportsSubgoals(target)) {
    target.kind = "goal";
    target.mode = "mixed";
    target.dailyLimitMinutes = 0;
    target.subgoals = [];
  }

  const sourceSet = new Set(sourceGoalIds.filter((id) => id !== targetGoalId));
  const entryMaps = new Map();

  state.goals
    .filter((goal) => sourceSet.has(goal.id))
    .forEach((source) => {
      const { subgoal, taskMap } = convertGoalToSubgoal(source, target);
      target.subgoals.push(subgoal);
      entryMaps.set(source.id, { subgoalId: subgoal.id, taskMap });
    });

  state.entries = state.entries.map((entry) => remapMergedEntry(entry, target, entryMaps));
  if (state.activeEntry) {
    state.activeEntry = remapMergedEntry(state.activeEntry, target, entryMaps);
  }

  state.goals = state.goals.filter((goal) => !sourceSet.has(goal.id));
  state.projects = state.projects.filter((project) => state.goals.some((goal) => goal.projectId === project.id));
  if (supportsTasks(target)) {
    target.subgoals.forEach(recalculateSubgoalProgress);
  }
  saveState();
  render();
}

function mergeSubgoalsIntoTask(goalId, targetSubgoalId, sourceSubgoalIds) {
  const goal = getGoal(goalId);
  const target = getSubgoal(goal, targetSubgoalId);
  if (!goal || !target || !sourceSubgoalIds.length) return;

  const sourceSet = new Set(sourceSubgoalIds.filter((id) => id !== targetSubgoalId));
  const taskMap = new Map();

  goal.subgoals
    .filter((subgoal) => sourceSet.has(subgoal.id))
    .forEach((source) => {
      const task = convertSubgoalToTask(source, target);
      target.tasks.push(task);
      taskMap.set(source.id, task.id);
    });

  state.entries = state.entries.map((entry) => {
    if (entry.goalId !== goal.id || !taskMap.has(entry.subgoalId)) return entry;
    return {
      ...entry,
      subgoalId: target.id,
      taskId: taskMap.get(entry.subgoalId),
    };
  });

  if (state.activeEntry?.goalId === goal.id && taskMap.has(state.activeEntry.subgoalId)) {
    state.activeEntry = {
      ...state.activeEntry,
      subgoalId: target.id,
      taskId: taskMap.get(state.activeEntry.subgoalId),
    };
  }

  goal.subgoals = goal.subgoals.filter((subgoal) => !sourceSet.has(subgoal.id));
  recalculateSubgoalProgress(target);
  rebuildProgressFromEntries();
  saveState();
  render();
}

function convertSubgoalToTask(source, target) {
  return {
    id: createId(),
    name: getUniqueTaskName(target, source.name),
    mode: source.mode,
    priority: normalizePriority(source.priority),
    target: source.target,
    unit: source.unit,
    done: source.done,
    progress: source.progress,
  };
}

function getUniqueTaskName(subgoal, name) {
  const existing = new Set(subgoal.tasks.map((task) => task.name));
  if (!existing.has(name)) return name;
  let index = 2;
  while (existing.has(`${name} ${index}`)) index += 1;
  return `${name} ${index}`;
}

function convertGoalToSubgoal(source, target) {
  const simple = getSimpleSourceSubgoal(source);
  const habitChild = target.kind === "habit";
  const subgoal = {
    id: createId(),
    name: getUniqueSubgoalName(target, source.name),
    mode: habitChild ? "daily" : (simple?.mode || "manual"),
    priority: normalizePriority(simple?.priority || source.priority),
    target: habitChild ? 0 : (simple?.target || 0),
    unit: habitChild ? "%" : (simple?.unit || (simple?.mode === "quantified" ? "个" : "%")),
    done: habitChild || simple?.mode !== "quantified" ? 0 : Number(simple.done || 0),
    progress: habitChild ? 0 : (simple ? Number(simple.progress || 0) : getGoalProgress(source)),
    tasks: [],
  };
  const taskMap = new Map();

  if (!habitChild && !simple && source.kind === "goal") {
    source.subgoals.forEach((oldSubgoal) => {
      const task = {
        id: createId(),
        name: oldSubgoal.name,
        mode: oldSubgoal.mode,
        priority: normalizePriority(oldSubgoal.priority),
        target: oldSubgoal.target,
        unit: oldSubgoal.unit,
        done: oldSubgoal.done,
        progress: oldSubgoal.progress,
      };
      subgoal.tasks.push(task);
      taskMap.set(oldSubgoal.id, task.id);
    });
  }

  if (!habitChild) recalculateSubgoalProgress(subgoal);
  return { subgoal, taskMap };
}

function getSimpleSourceSubgoal(source) {
  if (source.kind !== "goal") return null;
  if (source.subgoals.length === 1 && source.subgoals[0].name === "整体进度" && !source.subgoals[0].tasks?.length) {
    return source.subgoals[0];
  }
  return source.subgoals.length ? null : { mode: "manual", target: 0, unit: "%", done: 0, progress: 0 };
}

function remapMergedEntry(entry, target, entryMaps) {
  const map = entryMaps.get(entry.goalId);
  if (!map) return entry;
  return {
    ...entry,
    projectId: target.projectId,
    goalId: target.id,
    subgoalId: map.subgoalId,
    taskId: map.taskMap.get(entry.subgoalId) || "",
  };
}

function getUniqueSubgoalName(target, name) {
  const existing = new Set(target.subgoals.map((subgoal) => subgoal.name));
  if (!existing.has(name)) return name;
  let index = 2;
  while (existing.has(`${name} ${index}`)) index += 1;
  return `${name} ${index}`;
}

function deleteSubgoal(goalId, subgoalId) {
  const goal = getGoal(goalId);
  if (!goal) return;
  goal.subgoals = goal.subgoals.filter((subgoal) => subgoal.id !== subgoalId);
  state.entries = state.entries.map((entry) => entry.goalId === goalId && entry.subgoalId === subgoalId
    ? { ...entry, subgoalId: "", taskId: "", amountDelta: 0, progressDelta: 0, progressLabel: "" }
    : entry);
  if (state.activeEntry?.goalId === goalId && state.activeEntry.subgoalId === subgoalId) {
    state.activeEntry.subgoalId = "";
    state.activeEntry.taskId = "";
    state.activeEntry.amountDelta = 0;
    state.activeEntry.progressDelta = 0;
    state.activeEntry.progressLabel = "";
  }
  saveState();
  render();
}

function deleteTask(goalId, subgoalId, taskId) {
  const subgoal = getSubgoal(getGoal(goalId), subgoalId);
  if (!subgoal) return;
  subgoal.tasks = subgoal.tasks.filter((task) => task.id !== taskId);
  state.entries = state.entries.map((entry) => entry.goalId === goalId && entry.subgoalId === subgoalId && entry.taskId === taskId
    ? { ...entry, taskId: "", amountDelta: 0, progressDelta: 0, progressLabel: "" }
    : entry);
  recalculateSubgoalProgress(subgoal);
  saveState();
  render();
}

function toggleGoalCollapse(goalId) {
  if (collapsedGoalIds.has(goalId)) {
    collapsedGoalIds.delete(goalId);
  } else {
    collapsedGoalIds.add(goalId);
  }
  renderGoals();
}

function toggleSubgoalCollapse(subgoalId) {
  if (collapsedSubgoalIds.has(subgoalId)) {
    collapsedSubgoalIds.delete(subgoalId);
  } else {
    collapsedSubgoalIds.add(subgoalId);
  }
  renderGoals();
}

function updatePlanField(field, shouldRender = true) {
  const goal = getGoal(field.dataset.goalId);
  const subgoal = getSubgoal(goal, field.dataset.subgoalId);
  const task = getTask(subgoal, field.dataset.taskId);
  const value = field.value.trim();
  if (!goal) return;

  if (field.dataset.edit === "goal-name" && value) {
    goal.name = value;
    const project = getProject(goal.projectId);
    project.name = value;
  } else if (field.dataset.edit === "goal-color") {
    getProject(goal.projectId).color = field.value;
  } else if (field.dataset.edit === "goal-kind") {
    updateGoalKind(goal, field.value);
  } else if (field.dataset.edit === "goal-priority") {
    goal.priority = normalizePriority(field.value);
  } else if (field.dataset.edit === "goal-limit") {
    goal.dailyLimitMinutes = Math.max(1, Number(field.value || 1));
  } else if (field.dataset.edit === "subgoal-name" && subgoal && value) {
    subgoal.name = value;
  } else if (field.dataset.edit === "subgoal-priority" && subgoal) {
    subgoal.priority = normalizePriority(field.value);
  } else if (field.dataset.edit === "subgoal-target" && subgoal) {
    subgoal.target = Math.max(0, Number(field.value || 0));
    recalculateSubgoalProgress(subgoal);
  } else if (field.dataset.edit === "subgoal-unit" && subgoal && value) {
    subgoal.unit = value;
  } else if (field.dataset.edit === "task-name" && task && value) {
    task.name = value;
  } else if (field.dataset.edit === "task-priority" && task) {
    task.priority = normalizePriority(field.value);
  } else if (field.dataset.edit === "task-target" && task) {
    task.target = Math.max(0, Number(field.value || 0));
    task.progress = clampProgress(task.target ? Number(task.done || 0) / task.target * 100 : 0);
    recalculateSubgoalProgress(subgoal);
  } else if (field.dataset.edit === "task-unit" && task && value) {
    task.unit = value;
  }

  saveState();
  if (shouldRender) render();
}

function updateGoalKind(goal, kind) {
  if (!["goal", "habit", "limit"].includes(kind) || goal.kind === kind) return;
  goal.kind = kind;
  if (kind === "limit") {
    goal.dailyLimitMinutes = Number(goal.dailyLimitMinutes || 45);
    goal.subgoals = [];
    goal.mode = "manual";
    clearGoalDetailReferences(goal.id);
    return;
  }
  goal.dailyLimitMinutes = 0;
  goal.mode = kind === "goal" ? "mixed" : "daily";
  goal.subgoals = (goal.subgoals || []).map((subgoal) => {
    if (kind === "habit") {
      return { ...subgoal, mode: "daily", target: 0, unit: "%", done: 0, progress: 0, tasks: [] };
    }
    return normalizeSubgoal({ ...subgoal, mode: subgoal.mode === "daily" ? "manual" : subgoal.mode }, "manual");
  });
  if (kind === "habit") {
    state.entries = state.entries.map((entry) => entry.goalId === goal.id
      ? { ...entry, taskId: "", amountDelta: 0, progressDelta: 0, progressLabel: "" }
      : entry);
    if (state.activeEntry?.goalId === goal.id) {
      state.activeEntry.taskId = "";
      state.activeEntry.amountDelta = 0;
      state.activeEntry.progressDelta = 0;
      state.activeEntry.progressLabel = "";
    }
  }
}

function clearGoalDetailReferences(goalId) {
  state.entries = state.entries.map((entry) => entry.goalId === goalId
    ? { ...entry, subgoalId: "", taskId: "", amountDelta: 0, progressDelta: 0, progressLabel: "" }
    : entry);
  if (state.activeEntry?.goalId === goalId) {
    state.activeEntry.subgoalId = "";
    state.activeEntry.taskId = "";
    state.activeEntry.amountDelta = 0;
    state.activeEntry.progressDelta = 0;
    state.activeEntry.progressLabel = "";
  }
}

function recalculateSubgoalProgress(subgoal) {
  if (!subgoal?.tasks?.length) {
    if (subgoal?.mode === "quantified") {
      subgoal.progress = clampProgress(subgoal.target ? Number(subgoal.done || 0) / subgoal.target * 100 : 0);
    }
    return;
  }
  const quantitySummary = subgoal.mode === "quantified"
    ? summarizeQuantifiedItems(subgoal.tasks, subgoal.unit)
    : null;
  if (quantitySummary) {
    subgoal.target = quantitySummary.target;
    subgoal.done = quantitySummary.done;
    subgoal.progress = quantitySummary.progress;
    subgoal.manualOverride = false;
    return;
  }
  const total = subgoal.tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0);
  subgoal.progress = clampProgress(total / subgoal.tasks.length);
  subgoal.done = subgoal.mode === "quantified" ? Number(subgoal.done || 0) : 0;
  subgoal.manualOverride = false;
}

function summarizeQuantifiedItems(items, expectedUnit = "") {
  if (!items?.length) return null;
  const unit = String(expectedUnit || items[0]?.unit || "").trim();
  const compatible = unit && items.every((item) =>
    item.mode === "quantified"
    && String(item.unit || "").trim() === unit
    && Number(item.target || 0) > 0
  );
  if (!compatible) return null;
  const target = items.reduce((sum, item) => sum + Number(item.target || 0), 0);
  const done = items.reduce((sum, item) => sum + Number(item.done || 0), 0);
  return {
    unit,
    target,
    done,
    progress: clampProgress(target ? done / target * 100 : 0),
  };
}

function seedFormDates() {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  els.entryStart.value = toLocalInputValue(start);
  els.entryEnd.value = toLocalInputValue(now);
}

function parseDateTimeInput(value) {
  const text = value.trim();
  if (!text) return null;
  const normalized = text.includes("T") ? text : text.replace(/\s+/, "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function intersectsRange(entry, rangeStart, rangeEnd) {
  const start = new Date(entry.startTime);
  const end = new Date(entry.endTime || new Date());
  return start < rangeEnd && end > rangeStart;
}

function clippedDuration(entry, rangeStart, rangeEnd) {
  const start = Math.max(new Date(entry.startTime), rangeStart);
  const end = Math.min(new Date(entry.endTime || new Date()), rangeEnd);
  return Math.max(0, end - start);
}

function formatEntryGoalText(entry) {
  const goal = getGoal(entry.goalId);
  if (!goal) return "";
  const subgoal = getSubgoal(goal, entry.subgoalId);
  if (goal.kind === "habit") return [subgoal?.name, "今日完成"].filter(Boolean).join(" · ");
  if (goal.kind === "limit") return "计入每日上限";
  const task = getTask(subgoal, entry.taskId);
  const item = task || subgoal;
  const label = formatEntryProgressLabel(entry, item);
  return `${[subgoal?.name || "整体", task?.name].filter(Boolean).join(" / ")}${label ? ` ${label}` : ""}`;
}

function formatEntryProgressLabel(entry, item) {
  if (item?.mode === "quantified") {
    const amount = Number(entry.amountDelta || 0);
    return amount ? `+${formatNumber(amount)}${item.unit}` : "";
  }
  if (item) {
    const percent = Number(entry.progressDelta || 0);
    return percent ? `+${formatPercent(percent)}` : "";
  }
  return entry.progressLabel || (entry.progressDelta ? `+${formatPercent(entry.progressDelta)}` : "");
}

function formatGoalOption(goal) {
  return `${formatPriority(goal.priority)} · ${goal.name}`;
}

function getCompletionTitle(goal, subgoal, task) {
  if (!goal) return "未关联项目";
  if (goal.kind === "habit") return subgoal ? `${goal.name} / ${subgoal.name}` : `${goal.name} / 今日完成`;
  if (goal.kind === "limit") return `${goal.name} / 计入每日上限`;
  if (task) return `${goal.name} / ${subgoal.name} / ${task.name}`;
  return subgoal ? `${goal.name} / ${subgoal.name}` : `${goal.name} / 未选择子目标`;
}

function formatNoSubgoalText(goal) {
  if (goal?.kind === "habit" && goal.subgoals.length) return "今天没有未完成的打卡子目标";
  if (goal?.kind === "habit") return "可先创建每日打卡子目标";
  if (goal?.kind === "limit") return "每日上限无需子目标";
  if (supportsSubgoals(goal) && goal.subgoals.length) return "没有未完成的子目标";
  return "先创建子目标";
}

function normalizeDescription(value) {
  return value.trim() || "未命名记录";
}

function formatSubgoalName(goalId, subgoalId) {
  const goal = getGoal(goalId);
  const subgoal = getSubgoal(goal, subgoalId);
  return [goal?.name, subgoal?.name].filter(Boolean).join(" / ");
}

function formatSubgoalOption(subgoal, goal = null) {
  if (goal?.kind === "habit") {
    return `${subgoal.name} · ${isHabitSubgoalDoneToday(goal.id, subgoal.id) ? "今日已完成" : "今日未完成"}`;
  }
  return subgoal.mode === "quantified"
    ? `${subgoal.name} · ${formatNumber(subgoal.done)}/${formatNumber(subgoal.target)}${subgoal.unit} · ${formatPercent(subgoal.progress)}`
    : `${subgoal.name} · ${formatPercent(subgoal.progress)}`;
}

function formatTaskOption(task) {
  return task.mode === "quantified"
    ? `${task.name} · ${formatNumber(task.done)}/${formatNumber(task.target)}${task.unit} · ${formatPercent(task.progress)}`
    : `${task.name} · ${formatPercent(task.progress)}`;
}

function formatSubgoalProgress(subgoal) {
  return subgoal.mode === "quantified"
    ? `${formatNumber(subgoal.done)}/${formatNumber(subgoal.target)}${subgoal.unit} · ${formatPercent(subgoal.progress)}`
    : formatPercent(subgoal.progress);
}

function formatTaskProgress(task) {
  return task.mode === "quantified"
    ? `${formatNumber(task.done)}/${formatNumber(task.target)}${task.unit} · ${formatPercent(task.progress)}`
    : formatPercent(task.progress);
}

function updateViewButtons() {
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
}

function minutesSinceStartOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toLocalInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16).replace("T", " ");
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function formatMonthDay(date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}小时${rest}分`;
  if (hours) return `${hours}小时`;
  return `${rest}分`;
}

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${formatNumber(number)}%`;
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function clampProgress(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickColor(index) {
  const colors = ["#3478f6", "#21a67a", "#f59f00", "#d9478f", "#7c5cff", "#d94738", "#0f9fb3"];
  return colors[index % colors.length];
}
