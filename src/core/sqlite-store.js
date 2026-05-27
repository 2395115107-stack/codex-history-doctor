const { DatabaseSync } = require("node:sqlite");

function openDatabase(filePath, readOnly = true) {
  return new DatabaseSync(filePath, { readOnly });
}

function listThreads(sqlitePath) {
  const db = openDatabase(sqlitePath, true);
  try {
    const hasThreads = db.prepare("select name from sqlite_master where type='table' and name='threads'").get();
    if (!hasThreads) return [];
    return db.prepare("select * from threads").all();
  } finally {
    db.close();
  }
}

function upsertThread(sqlitePath, thread) {
  const db = openDatabase(sqlitePath, false);
  try {
    db.exec("PRAGMA journal_mode = WAL");
    const columns = db.prepare("pragma table_info(threads)").all().map((column) => column.name);
    const payload = threadToRow(thread, columns);
    const names = Object.keys(payload);
    const placeholders = names.map((name) => `@${name}`).join(", ");
    const updates = names.filter((name) => name !== "id").map((name) => `${name}=excluded.${name}`).join(", ");
    db.prepare(
      `insert into threads (${names.join(", ")}) values (${placeholders}) on conflict(id) do update set ${updates}`
    ).run(payload);
  } finally {
    db.close();
  }
}

function threadToRow(thread, columns) {
  const row = {
    id: thread.id,
    rollout_path: thread.rolloutPath,
    created_at: thread.createdAt || Math.floor(thread.createdAtMs / 1000),
    updated_at: thread.updatedAt || Math.floor(thread.updatedAtMs / 1000),
    source: thread.source || "local",
    model_provider: thread.modelProvider || "unknown",
    cwd: thread.cwd || "",
    title: thread.title || "Untitled Codex conversation",
    sandbox_policy: thread.sandboxPolicy || JSON.stringify({ type: "unknown" }),
    approval_mode: thread.approvalMode || "unknown",
    tokens_used: thread.tokensUsed || 0,
    has_user_event: thread.messageCounts?.users ? 1 : 0,
    archived: 0,
    archived_at: null,
    git_sha: null,
    git_branch: null,
    git_origin_url: null,
    cli_version: thread.cliVersion || "",
    first_user_message: thread.firstUserMessage || "",
    agent_nickname: null,
    agent_role: null,
    memory_mode: thread.memoryMode || "enabled",
    model: thread.model || null,
    reasoning_effort: thread.reasoningEffort || null,
    agent_path: null,
    created_at_ms: thread.createdAtMs || null,
    updated_at_ms: thread.updatedAtMs || null,
    thread_source: thread.threadSource || "user",
    preview: thread.preview || thread.title || ""
  };

  return Object.fromEntries(Object.entries(row).filter(([key]) => columns.includes(key)));
}

module.exports = {
  listThreads,
  upsertThread
};
