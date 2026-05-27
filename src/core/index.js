const { createBackup, listBackups, restoreBackup } = require("./backup");
const { defaultCodexDir, defaultDoctorDir } = require("./paths");
const { applyRepairPlan } = require("./repair");
const { createRepairPlan } = require("./repair-plan");
const { writeReports } = require("./report");
const { diagnose, scanCodex } = require("./scanner");

async function inspectCodex(options = {}) {
  const codexDir = options.codexDir || defaultCodexDir();
  const scan = await scanCodex(codexDir);
  const diagnosis = diagnose(scan);
  const repairPlan = createRepairPlan(diagnosis);
  return { scan, diagnosis, repairPlan };
}

module.exports = {
  applyRepairPlan,
  createBackup,
  createRepairPlan,
  defaultCodexDir,
  defaultDoctorDir,
  diagnose,
  inspectCodex,
  listBackups,
  restoreBackup,
  scanCodex,
  writeReports
};
