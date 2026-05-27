const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("doctor", {
  defaults: () => ipcRenderer.invoke("doctor:defaults"),
  chooseCodexDir: () => ipcRenderer.invoke("doctor:chooseCodexDir"),
  inspect: (options) => ipcRenderer.invoke("doctor:inspect", options),
  backup: (options) => ipcRenderer.invoke("doctor:backup", options),
  repairDryRun: () => ipcRenderer.invoke("doctor:repairDryRun"),
  repairApply: (options) => ipcRenderer.invoke("doctor:repairApply", options),
  fix: (options) => ipcRenderer.invoke("doctor:fix", options),
  writeReports: (options) => ipcRenderer.invoke("doctor:writeReports", options),
  listBackups: (options) => ipcRenderer.invoke("doctor:listBackups", options),
  restore: (options) => ipcRenderer.invoke("doctor:restore", options)
});
