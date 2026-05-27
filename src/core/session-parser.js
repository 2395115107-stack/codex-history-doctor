const fs = require("node:fs");
const path = require("node:path");
const { readJsonl } = require("./fs-utils");

function asMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function asSeconds(ms) {
  return typeof ms === "number" ? Math.floor(ms / 1000) : null;
}

function cleanMessage(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n# Files mentioned by the user:[\s\S]*?## My request for Codex:\n/, "")
    .trim();
}

function titleFromMessage(message) {
  const cleaned = cleanMessage(message)
    .replace(/^\/goal\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Untitled Codex conversation";
  return cleaned.length > 96 ? `${cleaned.slice(0, 93)}...` : cleaned;
}

function looksMojibake(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  const replacement = (value.match(/\uFFFD/g) || []).length;
  const suspicious = (value.match(/[�ÂÃÐÑØÞß]/g) || []).length;
  return replacement + suspicious >= Math.max(2, Math.ceil(value.length * 0.08));
}

function selectBestSessionMeta(records) {
  const metas = records
    .filter((record) => record.type === "session_meta" && record.payload && record.payload.id)
    .map((record) => ({
      timestamp: record.timestamp,
      payload: record.payload
    }));
  return metas[metas.length - 1] || null;
}

function extractTokenTotal(records) {
  let latest = 0;
  for (const record of records) {
    const payload = record.payload;
    if (!payload || payload.type !== "token_count") continue;
    const info = payload.info || payload;
    const total = Number(info.total_token_usage || info.total_tokens || info.tokens_used || 0);
    if (Number.isFinite(total) && total > latest) latest = total;
  }
  return latest;
}

function extractSessionFacts(records, filePath, stats) {
  const meta = selectBestSessionMeta(records);
  const payload = meta ? meta.payload : {};
  const id = payload.id || idFromFilename(filePath);
  const firstUser = records.find((record) => {
    const item = record.payload;
    return item && item.type === "user_message" && typeof item.message === "string";
  });
  const lastRecord = [...records].reverse().find((record) => record.timestamp);
  const firstTimestamp = payload.timestamp || meta?.timestamp || records.find((record) => record.timestamp)?.timestamp;
  const lastTimestamp = lastRecord?.timestamp || firstTimestamp;
  const firstUserMessage = cleanMessage(firstUser?.payload?.message || "");
  const title = titleFromMessage(firstUserMessage || payload.cwd || path.basename(filePath));
  const createdAtMs = asMillis(firstTimestamp) || Math.floor(stats.birthtimeMs);
  const updatedAtMs = Math.max(asMillis(lastTimestamp) || 0, Math.floor(stats.mtimeMs));

  return {
    id,
    rolloutPath: filePath,
    createdAt: asSeconds(createdAtMs),
    updatedAt: asSeconds(updatedAtMs),
    createdAtMs,
    updatedAtMs,
    source: payload.source || "local",
    modelProvider: payload.model_provider || "unknown",
    cwd: payload.cwd || "",
    title,
    sandboxPolicy: JSON.stringify(payload.git ? { type: "unknown", git: payload.git } : { type: "unknown" }),
    approvalMode: "unknown",
    tokensUsed: extractTokenTotal(records),
    cliVersion: payload.cli_version || "",
    firstUserMessage,
    memoryMode: "enabled",
    model: payload.model || null,
    reasoningEffort: null,
    threadSource: payload.thread_source || "user",
    preview: title,
    messageCounts: {
      users: records.filter((record) => record.payload?.type === "user_message").length,
      agents: records.filter((record) => record.payload?.type === "agent_message").length
    }
  };
}

function idFromFilename(filePath) {
  const match = path.basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : null;
}

async function parseSessionFile(filePath) {
  const stats = await fs.promises.stat(filePath);
  const { records, errors } = await readJsonl(filePath);
  const facts = records.length > 0 ? extractSessionFacts(records, filePath, stats) : null;
  return {
    filePath,
    size: stats.size,
    malformed: errors,
    facts,
    recordCount: records.length
  };
}

module.exports = {
  cleanMessage,
  looksMojibake,
  parseSessionFile,
  titleFromMessage
};
