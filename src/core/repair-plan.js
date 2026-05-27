const { retargetThread } = require("./current-model");

function createRepairPlan(diagnosis) {
  const operations = [];

  if (diagnosis.repairable.includes("rebuild-session-index") || diagnosis.repairable.includes("retarget-model")) {
    operations.push({
      type: "write-session-index",
      description: "Rebuild session_index.jsonl from parsed rollout files for the current sidebar.",
      records: diagnosis.sessions.map((session) => ({
        id: session.id,
        thread_name: session.title,
        updated_at: new Date(session.updatedAtMs).toISOString()
      }))
    });
  }

  if ((diagnosis.repairable.includes("upsert-thread") || diagnosis.repairable.includes("retarget-model")) && diagnosis.stateDbPath) {
    for (const session of diagnosis.sessions) {
      const thread = retargetThread(session, diagnosis.currentModel || {});
      operations.push({
        type: "upsert-thread",
        description: `Upsert thread ${session.id} in ${diagnosis.stateDbPath} and attach it to ${thread.modelProvider}/${thread.model || "unknown"}.`,
        stateDbPath: diagnosis.stateDbPath,
        thread
      });
    }
  }

  if (diagnosis.repairable.includes("retarget-model")) {
    for (const session of diagnosis.sessions) {
      operations.push({
        type: "sync-session-meta",
        description: `Sync rollout metadata for ${session.id} to ${diagnosis.currentModel?.modelProvider || "unknown"}/${diagnosis.currentModel?.model || "unknown"}.`,
        filePath: session.rolloutPath,
        id: session.id,
        currentModel: diagnosis.currentModel
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    codexDir: diagnosis.codexDir,
    stateDbPath: diagnosis.stateDbPath,
    currentModel: diagnosis.currentModel,
    operationCount: operations.length,
    operations
  };
}

module.exports = {
  createRepairPlan
};
