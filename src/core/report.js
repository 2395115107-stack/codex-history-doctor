const fs = require("node:fs");
const path = require("node:path");
const { ensureDir } = require("./fs-utils");

async function writeReports(outputDir, diagnosis, repairPlan) {
  await ensureDir(outputDir);
  const diagnosisPath = path.join(outputDir, "diagnosis.json");
  const planPath = path.join(outputDir, "repair-plan.json");
  const markdownPath = path.join(outputDir, "repair-report.md");
  await fs.promises.writeFile(diagnosisPath, JSON.stringify(diagnosis, null, 2), "utf8");
  await fs.promises.writeFile(planPath, JSON.stringify(repairPlan, null, 2), "utf8");
  await fs.promises.writeFile(markdownPath, renderMarkdownReport(diagnosis, repairPlan), "utf8");
  return { diagnosisPath, planPath, markdownPath };
}

function renderMarkdownReport(diagnosis, repairPlan) {
  const lines = [
    "# Codex History Doctor Report",
    "",
    `Generated: ${diagnosis.generatedAt}`,
    `Codex directory: \`${diagnosis.codexDir}\``,
    `State database: \`${diagnosis.stateDbPath || "not found"}\``,
    "",
    "## Summary",
    "",
    `- Rollout files: ${diagnosis.totals.rolloutFiles}`,
    `- Unique sessions: ${diagnosis.totals.uniqueSessions}`,
    `- Index records: ${diagnosis.totals.indexRecords}`,
    `- Database threads: ${diagnosis.totals.databaseThreads}`,
    `- Issues: ${diagnosis.totals.issues}`,
    `- Planned operations: ${repairPlan.operationCount}`,
    "",
    "## Issues",
    ""
  ];

  if (diagnosis.issues.length === 0) {
    lines.push("No issues found.");
  } else {
    for (const issue of diagnosis.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }

  lines.push("", "## Planned Operations", "");
  if (repairPlan.operations.length === 0) {
    lines.push("No repair operations are needed.");
  } else {
    for (const operation of repairPlan.operations) {
      lines.push(`- ${operation.type}: ${operation.description}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  renderMarkdownReport,
  writeReports
};
