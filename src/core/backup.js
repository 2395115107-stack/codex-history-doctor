const fs = require("node:fs");
const path = require("node:path");
const { copyDirectory, copyFileIfExists, ensureDir, exists } = require("./fs-utils");
const { defaultDoctorDir, timestampId } = require("./paths");

async function createBackup(codexDir, options = {}) {
  const doctorDir = options.doctorDir || defaultDoctorDir();
  const backupId = options.backupId || timestampId();
  const backupDir = path.join(doctorDir, "backups", backupId);
  const payloadDir = path.join(backupDir, "codex");
  await ensureDir(payloadDir);

  const copied = [];
  const missing = [];
  for (const fileName of ["session_index.jsonl"]) {
    const didCopy = await copyFileIfExists(path.join(codexDir, fileName), path.join(payloadDir, fileName));
    if (didCopy) copied.push(fileName);
    else missing.push(fileName);
  }

  const sessionsCopied = await copyDirectory(path.join(codexDir, "sessions"), path.join(payloadDir, "sessions"));
  if (sessionsCopied) copied.push("sessions/");

  const entries = (await exists(codexDir)) ? await fs.promises.readdir(codexDir) : [];
  for (const entry of entries) {
    if (/^state_\d+\.sqlite(?:-wal|-shm)?$/i.test(entry)) {
      const didCopy = await copyFileIfExists(path.join(codexDir, entry), path.join(payloadDir, entry));
      if (didCopy) copied.push(entry);
    }
  }

  const manifest = {
    backupId,
    createdAt: new Date().toISOString(),
    sourceCodexDir: codexDir,
    payloadDir,
    copied,
    missing
  };
  await fs.promises.writeFile(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

async function listBackups(options = {}) {
  const doctorDir = options.doctorDir || defaultDoctorDir();
  const backupsDir = path.join(doctorDir, "backups");
  if (!(await exists(backupsDir))) return [];
  const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(backupsDir, entry.name, "manifest.json");
    if (!(await exists(manifestPath))) continue;
    backups.push(JSON.parse(await fs.promises.readFile(manifestPath, "utf8")));
  }
  return backups.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function restoreBackup(backupId, targetCodexDir, options = {}) {
  const doctorDir = options.doctorDir || defaultDoctorDir();
  const backupDir = path.join(doctorDir, "backups", backupId);
  const manifestPath = path.join(backupDir, "manifest.json");
  if (!(await exists(manifestPath))) {
    throw new Error(`Backup not found: ${backupId}`);
  }
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const payloadDir = manifest.payloadDir || path.join(backupDir, "codex");
  for (const relativePath of manifest.missing || []) {
    await fs.promises.rm(path.join(targetCodexDir, relativePath), { force: true, recursive: true });
  }
  await fs.promises.cp(payloadDir, targetCodexDir, { recursive: true, force: true });
  return {
    restoredAt: new Date().toISOString(),
    backupId,
    targetCodexDir
  };
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup
};
