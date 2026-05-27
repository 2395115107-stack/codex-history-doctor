const fs = require("node:fs");
const path = require("node:path");
const { writeJsonl } = require("./fs-utils");
const { upsertThread } = require("./sqlite-store");
const { createBackup } = require("./backup");

async function applyRepairPlan(plan, options = {}) {
  if (!options.apply) {
    return {
      applied: false,
      dryRun: true,
      operations: plan.operations.map((operation) => summarizeOperation(operation))
    };
  }

  let backup = options.backup || null;
  if (!backup) {
    backup = await createBackup(plan.codexDir, options);
  }

  const applied = [];
  for (const operation of plan.operations) {
    if (operation.type === "write-session-index") {
      await writeJsonl(path.join(plan.codexDir, "session_index.jsonl"), operation.records);
      applied.push(summarizeOperation(operation));
    } else if (operation.type === "upsert-thread") {
      upsertThread(operation.stateDbPath, operation.thread);
      applied.push(summarizeOperation(operation));
    }
  }

  const report = {
    applied: true,
    dryRun: false,
    repairedAt: new Date().toISOString(),
    backup,
    operations: applied
  };

  if (options.reportPath) {
    await fs.promises.mkdir(path.dirname(options.reportPath), { recursive: true });
    await fs.promises.writeFile(options.reportPath, JSON.stringify(report, null, 2), "utf8");
  }

  return report;
}

function summarizeOperation(operation) {
  if (operation.type === "write-session-index") {
    return {
      type: operation.type,
      description: operation.description,
      recordCount: operation.records.length
    };
  }
  if (operation.type === "upsert-thread") {
    return {
      type: operation.type,
      description: operation.description,
      id: operation.thread.id
    };
  }
  return {
    type: operation.type,
    description: operation.description
  };
}

module.exports = {
  applyRepairPlan
};
