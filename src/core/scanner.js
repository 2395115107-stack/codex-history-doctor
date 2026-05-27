const fs = require("node:fs");
const path = require("node:path");
const { exists, listFiles, readJsonl } = require("./fs-utils");
const { parseSessionFile, looksMojibake } = require("./session-parser");
const { listThreads } = require("./sqlite-store");

async function scanCodex(codexDir) {
  const sessionsDir = path.join(codexDir, "sessions");
  const indexPath = path.join(codexDir, "session_index.jsonl");

  const codexDirExists = await exists(codexDir);
  const sessionFiles = codexDirExists
    ? await listFiles(sessionsDir, (filePath) => filePath.toLowerCase().endsWith(".jsonl"))
    : [];

  const parsedSessions = [];
  for (const filePath of sessionFiles) {
    parsedSessions.push(await parseSessionFile(filePath));
  }

  const stateDatabases = codexDirExists
    ? await listFiles(codexDir, (filePath) => /^state_\d+\.sqlite$/i.test(path.basename(filePath)))
    : [];
  const stateDbPath = selectStateDatabase(stateDatabases);
  const threads = stateDbPath ? listThreads(stateDbPath) : [];
  const index = await readSessionIndex(indexPath);

  return {
    codexDir,
    codexDirExists,
    sessionsDir,
    indexPath,
    stateDbPath,
    sessionFiles,
    sessions: parsedSessions,
    index,
    threads
  };
}

function selectStateDatabase(files) {
  if (files.length === 0) return null;
  return [...files].sort((a, b) => {
    const an = Number(path.basename(a).match(/\d+/)?.[0] || 0);
    const bn = Number(path.basename(b).match(/\d+/)?.[0] || 0);
    return bn - an;
  })[0];
}

async function readSessionIndex(indexPath) {
  if (!(await exists(indexPath))) {
    return { path: indexPath, exists: false, records: [], malformed: [] };
  }
  const result = await readJsonl(indexPath);
  return {
    path: indexPath,
    exists: true,
    records: result.records,
    malformed: result.errors
  };
}

function diagnose(scan) {
  const issues = [];
  const repairable = [];
  const warnings = [];
  const sessionFacts = scan.sessions.map((session) => session.facts).filter(Boolean);
  const sessionIds = groupBy(sessionFacts, (session) => session.id || "__missing__");
  const indexIds = new Set(scan.index.records.map((record) => record.id).filter(Boolean));
  const threadById = new Map(scan.threads.map((thread) => [thread.id, thread]));
  const sessionById = new Map();

  for (const [id, sessions] of sessionIds.entries()) {
    if (id === "__missing__") continue;
    const ranked = [...sessions].sort((a, b) => scoreSession(b) - scoreSession(a));
    sessionById.set(id, ranked[0]);
    if (sessions.length > 1) {
      issues.push({
        code: "duplicate-session-id",
        severity: "warning",
        message: `Session id ${id} appears in ${sessions.length} rollout entries.`,
        id,
        files: sessions.map((session) => session.rolloutPath)
      });
      warnings.push("Duplicate session ids are resolved by choosing the richest, newest rollout file.");
    }
  }

  if (!scan.codexDirExists) {
    issues.push({
      code: "missing-codex-dir",
      severity: "error",
      message: `Codex directory does not exist: ${scan.codexDir}`
    });
  }

  if (!scan.index.exists) {
    issues.push({
      code: "missing-session-index",
      severity: "repairable",
      message: "session_index.jsonl is missing."
    });
    repairable.push("rebuild-session-index");
  }

  if (scan.index.malformed.length > 0) {
    issues.push({
      code: "malformed-session-index",
      severity: "repairable",
      message: "session_index.jsonl contains malformed JSON lines.",
      count: scan.index.malformed.length
    });
    repairable.push("rebuild-session-index");
  }

  for (const session of scan.sessions) {
    if (session.malformed.length > 0) {
      issues.push({
        code: "malformed-rollout",
        severity: "warning",
        message: `Rollout has malformed JSON lines: ${session.filePath}`,
        file: session.filePath,
        count: session.malformed.length
      });
    }
    if (!session.facts?.id) {
      issues.push({
        code: "missing-session-id",
        severity: "warning",
        message: `Could not determine a session id for ${session.filePath}`,
        file: session.filePath
      });
    }
  }

  for (const session of sessionById.values()) {
    if (!indexIds.has(session.id)) {
      issues.push({
        code: "index-missing-session",
        severity: "repairable",
        message: `History index is missing session ${session.id}.`,
        id: session.id
      });
      repairable.push("rebuild-session-index");
    }

    const thread = threadById.get(session.id);
    if (!thread) {
      issues.push({
        code: "thread-missing-session",
        severity: "repairable",
        message: `State database is missing thread ${session.id}.`,
        id: session.id
      });
      repairable.push("upsert-thread");
    } else {
      if (!fs.existsSync(thread.rollout_path || "")) {
        issues.push({
          code: "thread-rollout-missing",
          severity: "repairable",
          message: `Thread ${session.id} points to a missing rollout file.`,
          id: session.id,
          currentPath: thread.rollout_path,
          repairedPath: session.rolloutPath
        });
        repairable.push("upsert-thread");
      }
      if (!thread.title || looksMojibake(thread.title)) {
        issues.push({
          code: "thread-title-suspicious",
          severity: "repairable",
          message: `Thread ${session.id} has an empty or suspicious title.`,
          id: session.id,
          title: thread.title
        });
        repairable.push("upsert-thread");
      }
    }
  }

  for (const thread of scan.threads) {
    if (thread.rollout_path && !fs.existsSync(thread.rollout_path)) {
      issues.push({
        code: "orphan-thread",
        severity: "warning",
        message: `Database thread points to a missing rollout file: ${thread.id}`,
        id: thread.id,
        rolloutPath: thread.rollout_path
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    codexDir: scan.codexDir,
    stateDbPath: scan.stateDbPath,
    totals: {
      rolloutFiles: scan.sessionFiles.length,
      parsedSessions: sessionFacts.length,
      uniqueSessions: sessionById.size,
      indexRecords: scan.index.records.length,
      databaseThreads: scan.threads.length,
      issues: issues.length
    },
    issues,
    repairable: [...new Set(repairable)],
    warnings: [...new Set(warnings)],
    sessions: [...sessionById.values()].sort((a, b) => b.updatedAtMs - a.updatedAtMs)
  };
}

function scoreSession(session) {
  return session.updatedAtMs + session.messageCounts.users * 100000 + session.messageCounts.agents * 50000;
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

module.exports = {
  diagnose,
  scanCodex
};
