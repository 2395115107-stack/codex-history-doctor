#!/usr/bin/env node

const path = require("node:path");
const {
  applyRepairPlan,
  createBackup,
  defaultCodexDir,
  defaultDoctorDir,
  inspectCodex,
  listBackups,
  restoreBackup,
  writeReports
} = require("./core");

async function main(argv) {
  const command = argv[2] || "help";
  const args = parseArgs(argv.slice(3));
  const codexDir = args.codexDir || defaultCodexDir();
  const doctorDir = args.doctorDir || defaultDoctorDir();

  if (command === "help" || args.help) {
    printHelp();
    return;
  }

  if (command === "scan" || command === "doctor") {
    const { diagnosis, repairPlan } = await inspectCodex({ codexDir });
    printDiagnosis(diagnosis, repairPlan);
    if (args.report) {
      const outputDir = typeof args.report === "string" ? args.report : path.join(doctorDir, "reports", "latest");
      const files = await writeReports(outputDir, diagnosis, repairPlan);
      console.log(`\nReports written to ${outputDir}`);
      console.log(`- ${files.diagnosisPath}`);
      console.log(`- ${files.planPath}`);
      console.log(`- ${files.markdownPath}`);
    }
    return;
  }

  if (command === "backup") {
    const manifest = await createBackup(codexDir, { doctorDir });
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "fix") {
    const before = await inspectCodex({ codexDir });
    printDiagnosis(before.diagnosis, before.repairPlan);
    if (before.repairPlan.operationCount === 0) {
      console.log("\nNothing to fix.");
      return;
    }
    const report = await applyRepairPlan(before.repairPlan, {
      apply: true,
      codexDir,
      doctorDir,
      reportPath: path.join(doctorDir, "reports", "latest", "fix-result.json")
    });
    const after = await inspectCodex({ codexDir });
    console.log("\nFix applied.");
    console.log(JSON.stringify({
      before: before.diagnosis.totals,
      applied: report.operations,
      after: after.diagnosis.totals,
      remainingIssues: after.diagnosis.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        message: issue.message
      }))
    }, null, 2));
    return;
  }

  if (command === "repair") {
    const apply = Boolean(args.apply);
    if (apply && !args.yes) {
      throw new Error("Refusing to repair without --yes. Run repair --dry-run first, then repair --apply --yes.");
    }
    const { diagnosis, repairPlan } = await inspectCodex({ codexDir });
    const report = await applyRepairPlan(repairPlan, {
      apply,
      codexDir,
      doctorDir,
      reportPath: path.join(doctorDir, "reports", "latest", "repair-result.json")
    });
    console.log(JSON.stringify({
      diagnosis: diagnosis.totals,
      repairPlan: {
        operationCount: repairPlan.operationCount
      },
      result: report
    }, null, 2));
    return;
  }

  if (command === "restore") {
    const backupId = argv[3];
    if (!backupId) throw new Error("Missing backup id. Usage: codex-history-doctor restore <backup-id>");
    const result = await restoreBackup(backupId, codexDir, { doctorDir });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "backups") {
    const backups = await listBackups({ doctorDir });
    console.log(JSON.stringify(backups, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--codex-dir") parsed.codexDir = args[++index];
    else if (arg === "--doctor-dir") parsed.doctorDir = args[++index];
    else if (arg === "--report") parsed.report = args[index + 1] && !args[index + 1].startsWith("--") ? args[++index] : true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--dry-run") parsed.apply = false;
    else if (arg === "--yes") parsed.yes = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
  }
  return parsed;
}

function printDiagnosis(diagnosis, repairPlan) {
  console.log("Codex History Doctor");
  console.log("====================");
  console.log(`Codex directory: ${diagnosis.codexDir}`);
  console.log(`State database: ${diagnosis.stateDbPath || "not found"}`);
  console.log(`Current model: ${diagnosis.currentModel?.modelProvider || "unknown"}/${diagnosis.currentModel?.model || "unknown"} (${diagnosis.currentModel?.source || "unknown"})`);
  console.log("");
  console.log(`Rollout files: ${diagnosis.totals.rolloutFiles}`);
  console.log(`Unique sessions: ${diagnosis.totals.uniqueSessions}`);
  console.log(`Index records: ${diagnosis.totals.indexRecords}`);
  console.log(`Database threads: ${diagnosis.totals.databaseThreads}`);
  console.log(`Issues: ${diagnosis.totals.issues}`);
  console.log(`Planned operations: ${repairPlan.operationCount}`);
  if (diagnosis.issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of diagnosis.issues) {
      console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }
}

function printHelp() {
  console.log(`Codex History Doctor

Usage:
  codex-history-doctor scan [--codex-dir <path>] [--report [dir]]
  codex-history-doctor doctor [--codex-dir <path>] [--report [dir]]
  codex-history-doctor backup [--codex-dir <path>]
  codex-history-doctor fix [--codex-dir <path>]
  codex-history-doctor repair --dry-run [--codex-dir <path>]
  codex-history-doctor repair --apply --yes [--codex-dir <path>]
  codex-history-doctor backups
  codex-history-doctor restore <backup-id> [--codex-dir <path>]

Safety:
  fix scans, creates a backup, applies repair, and scans again.
  repair --apply always creates a backup first.
  repair --apply requires --yes so it cannot run by accident.
`);
}

main(process.argv).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
