const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const {
  applyRepairPlan,
  createBackup,
  defaultCodexDir,
  defaultDoctorDir,
  inspectCodex,
  listBackups,
  restoreBackup,
  writeReports
} = require("../core");

let lastInspection = null;

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 620,
    title: "Codex History Doctor",
    backgroundColor: "#f4f1ea",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function registerIpc() {
  ipcMain.handle("doctor:defaults", async () => ({
    codexDir: defaultCodexDir(),
    doctorDir: defaultDoctorDir()
  }));

  ipcMain.handle("doctor:chooseCodexDir", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose .codex directory",
      properties: ["openDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("doctor:inspect", async (_event, options) => {
    lastInspection = await inspectCodex({ codexDir: options?.codexDir || defaultCodexDir() });
    return publicInspection(lastInspection);
  });

  ipcMain.handle("doctor:backup", async (_event, options) => {
    return createBackup(options?.codexDir || defaultCodexDir(), { doctorDir: options?.doctorDir || defaultDoctorDir() });
  });

  ipcMain.handle("doctor:repairDryRun", async () => {
    ensureInspection();
    return applyRepairPlan(lastInspection.repairPlan, { apply: false });
  });

  ipcMain.handle("doctor:repairApply", async (_event, options) => {
    ensureInspection();
    const report = await applyRepairPlan(lastInspection.repairPlan, {
      apply: true,
      codexDir: options?.codexDir || lastInspection.diagnosis.codexDir,
      doctorDir: options?.doctorDir || defaultDoctorDir()
    });
    lastInspection = await inspectCodex({ codexDir: options?.codexDir || lastInspection.diagnosis.codexDir });
    return {
      report,
      inspection: publicInspection(lastInspection)
    };
  });

  ipcMain.handle("doctor:writeReports", async (_event, options) => {
    ensureInspection();
    const outputDir = options?.outputDir || path.join(options?.doctorDir || defaultDoctorDir(), "reports", "latest");
    return writeReports(outputDir, lastInspection.diagnosis, lastInspection.repairPlan);
  });

  ipcMain.handle("doctor:listBackups", async (_event, options) => {
    return listBackups({ doctorDir: options?.doctorDir || defaultDoctorDir() });
  });

  ipcMain.handle("doctor:restore", async (_event, options) => {
    if (!options?.backupId) throw new Error("Missing backup id.");
    return restoreBackup(options.backupId, options.codexDir || defaultCodexDir(), {
      doctorDir: options.doctorDir || defaultDoctorDir()
    });
  });
}

function ensureInspection() {
  if (!lastInspection) throw new Error("Run Scan first.");
}

function publicInspection(inspection) {
  return {
    diagnosis: inspection.diagnosis,
    repairPlan: {
      generatedAt: inspection.repairPlan.generatedAt,
      codexDir: inspection.repairPlan.codexDir,
      stateDbPath: inspection.repairPlan.stateDbPath,
      operationCount: inspection.repairPlan.operationCount,
      operations: inspection.repairPlan.operations.map((operation) => ({
        type: operation.type,
        description: operation.description,
        id: operation.thread?.id,
        recordCount: operation.records?.length
      }))
    }
  };
}
