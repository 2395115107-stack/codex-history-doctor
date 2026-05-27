const { retargetThread } = require("./current-model");

function createRepairPlan(diagnosis) {
  const operations = [];

  if (diagnosis.repairable.includes("rebuild-session-index")) {
    operations.push({
      type: "write-session-index",
      description: "Rebuild session_index.jsonl from parsed rollout files.",
      records: diagnosis.sessions.map((session) => ({
        id: session.id,
        thread_name: session.title,
        updated_at: new Date(session.updatedAtMs).toISOString()
      }))
    });
  }

  if (diagnosis.repairable.includes("upsert-thread") && diagnosis.stateDbPath) {
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
