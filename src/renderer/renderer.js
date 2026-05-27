const state = {
  defaults: null,
  inspection: null,
  backups: [],
  locale: "en"
};

const $ = (id) => document.getElementById(id);

const messages = {
  en: {
    "brand.subtitle": "Local repair bench for Codex Desktop history.",
    "settings.title": "Settings",
    "settings.language": "Language",
    "form.codexFolder": "Codex data folder",
    "actions.chooseFolder": "Choose folder",
    "actions.scan": "Scan",
    "actions.backup": "Backup",
    "actions.preview": "Repair Preview",
    "actions.repair": "Repair",
    "actions.report": "Report",
    "restore.title": "Restore",
    "restore.button": "Restore selected backup",
    "hero.eyebrow": "Private by design",
    "hero.title": "Scan first. Preview every fix. Repair only after backup.",
    "hero.modelUnknown": "Current model: not scanned yet",
    "hero.modelLine": "Current model: {provider}/{model} ({source})",
    "status.idle": "Idle",
    "metrics.rollouts": "Rollout files",
    "metrics.sessions": "Sessions",
    "metrics.index": "Index records",
    "metrics.threads": "DB threads",
    "metrics.issues": "Issues",
    "metrics.fixes": "Fixes",
    "diagnosis.title": "Diagnosis",
    "diagnosis.noScan": "No scan yet",
    "diagnosis.empty": "Run a scan to see history health.",
    "diagnosis.noIssues": "No issues found.",
    "diagnosis.count": "{count} issues",
    "preview.title": "Repair Preview",
    "preview.zero": "0 operations",
    "preview.empty": "No repair plan yet.",
    "preview.noOps": "No repair operations are needed.",
    "preview.count": "{count} operations",
    "preview.records": "{count} records",
    "sessions.title": "Recovered Sessions",
    "sessions.zero": "0 found",
    "sessions.empty": "Scanned sessions will appear here.",
    "sessions.none": "No sessions found.",
    "sessions.count": "{count} found",
    "backup.none": "No backups yet",
    "backup.option": "{id} - {count} items",
    "status.scanning": "Scanning",
    "status.backingUp": "Backing up",
    "status.backupSaved": "Backup saved: {id}",
    "status.previewing": "Previewing",
    "status.previewReady": "Preview ready: {count} operations",
    "status.noRepair": "No repair needed",
    "status.repairing": "Repairing",
    "status.repairDone": "Repair complete: {count} operations",
    "status.reportWriting": "Writing report",
    "status.reportWritten": "Report written: {path}",
    "status.noBackup": "No backup selected",
    "status.restoring": "Restoring",
    "status.restored": "Restored backup: {id}",
    "status.scanDone": "Scan complete",
    "status.error": "Error: {message}",
    "confirm.repair": "Repair will create a backup first, then apply {count} operations. Continue?",
    "confirm.restore": "Restore backup {id} into the selected Codex folder?"
  },
  "zh-CN": {
    "brand.subtitle": "用于修复 Codex Desktop 本地历史显示的安全工作台。",
    "settings.title": "设置",
    "settings.language": "语言",
    "form.codexFolder": "Codex 数据文件夹",
    "actions.chooseFolder": "选择文件夹",
    "actions.scan": "扫描",
    "actions.backup": "备份",
    "actions.preview": "修复预览",
    "actions.repair": "执行修复",
    "actions.report": "导出报告",
    "restore.title": "恢复",
    "restore.button": "恢复所选备份",
    "hero.eyebrow": "本地私有处理",
    "hero.title": "先扫描，再预览每个改动，备份后才修复。",
    "hero.modelUnknown": "当前模型：尚未扫描",
    "hero.modelLine": "当前模型：{provider}/{model}（{source}）",
    "status.idle": "待命",
    "metrics.rollouts": "历史文件",
    "metrics.sessions": "会话",
    "metrics.index": "索引记录",
    "metrics.threads": "数据库线程",
    "metrics.issues": "问题",
    "metrics.fixes": "修复项",
    "diagnosis.title": "诊断结果",
    "diagnosis.noScan": "尚未扫描",
    "diagnosis.empty": "点击扫描后，这里会显示历史健康状态。",
    "diagnosis.noIssues": "未发现问题。",
    "diagnosis.count": "{count} 个问题",
    "preview.title": "修复预览",
    "preview.zero": "0 个操作",
    "preview.empty": "暂无修复计划。",
    "preview.noOps": "当前不需要执行修复操作。",
    "preview.count": "{count} 个操作",
    "preview.records": "{count} 条记录",
    "sessions.title": "可恢复会话",
    "sessions.zero": "找到 0 条",
    "sessions.empty": "扫描到的会话会显示在这里。",
    "sessions.none": "没有找到会话。",
    "sessions.count": "找到 {count} 条",
    "backup.none": "暂无备份",
    "backup.option": "{id} - {count} 项",
    "status.scanning": "正在扫描",
    "status.backingUp": "正在备份",
    "status.backupSaved": "备份已保存：{id}",
    "status.previewing": "正在生成预览",
    "status.previewReady": "预览已生成：{count} 个操作",
    "status.noRepair": "无需修复",
    "status.repairing": "正在修复",
    "status.repairDone": "修复完成：{count} 个操作",
    "status.reportWriting": "正在写入报告",
    "status.reportWritten": "报告已写入：{path}",
    "status.noBackup": "未选择备份",
    "status.restoring": "正在恢复",
    "status.restored": "已恢复备份：{id}",
    "status.scanDone": "扫描完成",
    "status.error": "错误：{message}",
    "confirm.repair": "修复会先创建备份，然后执行 {count} 个操作。继续吗？",
    "confirm.restore": "要把备份 {id} 恢复到当前选择的 Codex 文件夹吗？"
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  state.locale = localStorage.getItem("codex-history-doctor-locale") || "en";
  state.defaults = await window.doctor.defaults();
  $("codexDir").value = state.defaults.codexDir;
  $("languageSelect").value = state.locale;
  bindEvents();
  applyTranslations();
  await refreshBackups();
});

function bindEvents() {
  $("languageSelect").addEventListener("change", () => {
    state.locale = $("languageSelect").value;
    localStorage.setItem("codex-history-doctor-locale", state.locale);
    applyTranslations();
    if (state.inspection) renderInspection();
    else renderInitialEmptyStates();
    refreshBackups();
  });
  $("chooseDir").addEventListener("click", async () => {
    const selected = await window.doctor.chooseCodexDir();
    if (selected) $("codexDir").value = selected;
  });
  $("scanBtn").addEventListener("click", scan);
  $("backupBtn").addEventListener("click", backup);
  $("dryRunBtn").addEventListener("click", dryRun);
  $("repairBtn").addEventListener("click", repair);
  $("reportBtn").addEventListener("click", writeReport);
  $("restoreBtn").addEventListener("click", restore);
}

async function scan() {
  await run(t("status.scanning"), async () => {
    state.inspection = await window.doctor.inspect({ codexDir: currentCodexDir() });
    renderInspection();
  });
}

async function backup() {
  await run(t("status.backingUp"), async () => {
    const manifest = await window.doctor.backup({ codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    setStatus(t("status.backupSaved", { id: manifest.backupId }));
    await refreshBackups();
  });
}

async function dryRun() {
  await run(t("status.previewing"), async () => {
    if (!state.inspection) await scan();
    const result = await window.doctor.repairDryRun();
    setStatus(t("status.previewReady", { count: result.operations.length }));
  });
}

async function repair() {
  if (!state.inspection) await scan();
  const count = state.inspection.repairPlan.operationCount;
  if (count === 0) {
    setStatus(t("status.noRepair"));
    return;
  }
  const confirmed = window.confirm(t("confirm.repair", { count }));
  if (!confirmed) return;
  await run(t("status.repairing"), async () => {
    const result = await window.doctor.repairApply({ codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    state.inspection = result.inspection;
    renderInspection();
    await refreshBackups();
    setStatus(t("status.repairDone", { count: result.report.operations.length }));
  });
}

async function writeReport() {
  await run(t("status.reportWriting"), async () => {
    if (!state.inspection) await scan();
    const files = await window.doctor.writeReports({ doctorDir: state.defaults.doctorDir });
    setStatus(t("status.reportWritten", { path: files.markdownPath }));
  });
}

async function restore() {
  const backupId = $("backupSelect").value;
  if (!backupId) {
    setStatus(t("status.noBackup"));
    return;
  }
  const confirmed = window.confirm(t("confirm.restore", { id: backupId }));
  if (!confirmed) return;
  await run(t("status.restoring"), async () => {
    await window.doctor.restore({ backupId, codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    await scan();
    setStatus(t("status.restored", { id: backupId }));
  });
}

async function refreshBackups() {
  state.backups = await window.doctor.listBackups({ doctorDir: state.defaults.doctorDir });
  const select = $("backupSelect");
  select.innerHTML = "";
  if (state.backups.length === 0) {
    const option = document.createElement("option");
    option.textContent = t("backup.none");
    option.value = "";
    select.appendChild(option);
    return;
  }
  for (const backup of state.backups) {
    const option = document.createElement("option");
    option.value = backup.backupId;
    option.textContent = t("backup.option", { id: backup.backupId, count: backup.copied.length });
    select.appendChild(option);
  }
}

function renderInspection() {
  const { diagnosis, repairPlan } = state.inspection;
  const metrics = [
    diagnosis.totals.rolloutFiles,
    diagnosis.totals.uniqueSessions,
    diagnosis.totals.indexRecords,
    diagnosis.totals.databaseThreads,
    diagnosis.totals.issues,
    repairPlan.operationCount
  ];
  document.querySelectorAll("#metrics strong").forEach((node, index) => {
    node.textContent = metrics[index];
  });
  $("issueCount").textContent = t("diagnosis.count", { count: diagnosis.issues.length });
  $("operationCount").textContent = t("preview.count", { count: repairPlan.operationCount });
  $("sessionCount").textContent = t("sessions.count", { count: diagnosis.sessions.length });
  $("currentModel").textContent = t("hero.modelLine", {
    provider: diagnosis.currentModel?.modelProvider || "unknown",
    model: diagnosis.currentModel?.model || "unknown",
    source: diagnosis.currentModel?.source || "unknown"
  });
  renderList("issues", diagnosis.issues, (issue) => `
    <div class="item">
      <span class="badge ${issue.severity}">${escapeHtml(localizeSeverity(issue.severity))}</span>
      <div><strong>${escapeHtml(issue.code)}</strong><p>${escapeHtml(issue.message)}</p></div>
    </div>
  `, t("diagnosis.noIssues"));
  renderList("operations", repairPlan.operations, (operation) => `
    <div class="item">
      <span class="badge neutral">${escapeHtml(operation.type)}</span>
      <div><strong>${escapeHtml(operation.id || t("preview.records", { count: operation.recordCount || 0 }))}</strong><p>${escapeHtml(operation.description)}</p></div>
    </div>
  `, t("preview.noOps"));
  renderSessions(diagnosis.sessions);
  setStatus(t("status.scanDone"));
}

function renderSessions(sessions) {
  const target = $("sessions");
  if (sessions.length === 0) {
    target.className = "session-grid empty";
    target.textContent = t("sessions.none");
    return;
  }
  target.className = "session-grid";
  target.innerHTML = sessions.map((session) => `
    <article class="session-card">
      <h4>${escapeHtml(session.title)}</h4>
      <p>${escapeHtml(session.id)}</p>
      <div>${new Date(session.updatedAtMs).toLocaleString()}</div>
    </article>
  `).join("");
}

function renderList(id, items, renderer, emptyText) {
  const target = $(id);
  if (items.length === 0) {
    target.className = "list empty";
    target.textContent = emptyText;
    return;
  }
  target.className = "list";
  target.innerHTML = items.map(renderer).join("");
}

async function run(label, fn) {
  try {
    setStatus(label);
    await fn();
  } catch (error) {
    console.error(error);
    setStatus(t("status.error", { message: error.message }));
  }
}

function currentCodexDir() {
  return $("codexDir").value.trim() || state.defaults.codexDir;
}

function setStatus(text) {
  $("statusPill").textContent = text;
}

function applyTranslations() {
  document.documentElement.lang = state.locale;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
}

function renderInitialEmptyStates() {
  $("issueCount").textContent = t("diagnosis.noScan");
  $("issues").className = "list empty";
  $("issues").textContent = t("diagnosis.empty");
  $("operationCount").textContent = t("preview.zero");
  $("operations").className = "list empty";
  $("operations").textContent = t("preview.empty");
  $("sessionCount").textContent = t("sessions.zero");
  $("sessions").className = "session-grid empty";
  $("sessions").textContent = t("sessions.empty");
  $("currentModel").textContent = t("hero.modelUnknown");
  setStatus(t("status.idle"));
}

function localizeSeverity(severity) {
  if (state.locale !== "zh-CN") return severity;
  return {
    warning: "警告",
    error: "错误",
    repairable: "可修复"
  }[severity] || severity;
}

function t(key, values = {}) {
  const template = messages[state.locale]?.[key] || messages.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? ""));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
