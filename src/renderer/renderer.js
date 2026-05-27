const state = {
  defaults: null,
  inspection: null,
  backups: []
};

const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", async () => {
  state.defaults = await window.doctor.defaults();
  $("codexDir").value = state.defaults.codexDir;
  bindEvents();
  await refreshBackups();
});

function bindEvents() {
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
  await run("Scanning", async () => {
    state.inspection = await window.doctor.inspect({ codexDir: currentCodexDir() });
    renderInspection();
  });
}

async function backup() {
  await run("Backing up", async () => {
    const manifest = await window.doctor.backup({ codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    setStatus(`Backup saved: ${manifest.backupId}`);
    await refreshBackups();
  });
}

async function dryRun() {
  await run("Previewing", async () => {
    if (!state.inspection) await scan();
    const result = await window.doctor.repairDryRun();
    setStatus(`Preview ready: ${result.operations.length} operations`);
  });
}

async function repair() {
  if (!state.inspection) await scan();
  const count = state.inspection.repairPlan.operationCount;
  if (count === 0) {
    setStatus("No repair needed");
    return;
  }
  const confirmed = window.confirm(`Repair will create a backup first, then apply ${count} operations. Continue?`);
  if (!confirmed) return;
  await run("Repairing", async () => {
    const result = await window.doctor.repairApply({ codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    state.inspection = result.inspection;
    renderInspection();
    await refreshBackups();
    setStatus(`Repair complete: ${result.report.operations.length} operations`);
  });
}

async function writeReport() {
  await run("Writing report", async () => {
    if (!state.inspection) await scan();
    const files = await window.doctor.writeReports({ doctorDir: state.defaults.doctorDir });
    setStatus(`Report written: ${files.markdownPath}`);
  });
}

async function restore() {
  const backupId = $("backupSelect").value;
  if (!backupId) {
    setStatus("No backup selected");
    return;
  }
  const confirmed = window.confirm(`Restore backup ${backupId} into the selected Codex folder?`);
  if (!confirmed) return;
  await run("Restoring", async () => {
    await window.doctor.restore({ backupId, codexDir: currentCodexDir(), doctorDir: state.defaults.doctorDir });
    await scan();
    setStatus(`Restored backup: ${backupId}`);
  });
}

async function refreshBackups() {
  state.backups = await window.doctor.listBackups({ doctorDir: state.defaults.doctorDir });
  const select = $("backupSelect");
  select.innerHTML = "";
  if (state.backups.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No backups yet";
    option.value = "";
    select.appendChild(option);
    return;
  }
  for (const backup of state.backups) {
    const option = document.createElement("option");
    option.value = backup.backupId;
    option.textContent = `${backup.backupId} - ${backup.copied.length} items`;
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
  $("issueCount").textContent = `${diagnosis.issues.length} issues`;
  $("operationCount").textContent = `${repairPlan.operationCount} operations`;
  $("sessionCount").textContent = `${diagnosis.sessions.length} found`;
  renderList("issues", diagnosis.issues, (issue) => `
    <div class="item">
      <span class="badge ${issue.severity}">${issue.severity}</span>
      <div><strong>${escapeHtml(issue.code)}</strong><p>${escapeHtml(issue.message)}</p></div>
    </div>
  `, "No issues found.");
  renderList("operations", repairPlan.operations, (operation) => `
    <div class="item">
      <span class="badge neutral">${escapeHtml(operation.type)}</span>
      <div><strong>${escapeHtml(operation.id || `${operation.recordCount || 0} records`)}</strong><p>${escapeHtml(operation.description)}</p></div>
    </div>
  `, "No repair operations are needed.");
  renderSessions(diagnosis.sessions);
  setStatus("Scan complete");
}

function renderSessions(sessions) {
  const target = $("sessions");
  if (sessions.length === 0) {
    target.className = "session-grid empty";
    target.textContent = "No sessions found.";
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
    setStatus(`Error: ${error.message}`);
  }
}

function currentCodexDir() {
  return $("codexDir").value.trim() || state.defaults.codexDir;
}

function setStatus(text) {
  $("statusPill").textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
