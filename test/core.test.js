const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const {
  applyRepairPlan,
  createBackup,
  inspectCodex,
  restoreBackup
} = require("../src/core");
const { parseSessionFile, titleFromMessage } = require("../src/core/session-parser");

test("titleFromMessage creates a compact title", () => {
  assert.equal(titleFromMessage("/goal Build a safe local repair tool"), "Build a safe local repair tool");
  assert.equal(titleFromMessage(""), "Untitled Codex conversation");
});

test("parseSessionFile extracts useful facts from rollout jsonl", async () => {
  const dir = await fixtureDir();
  const file = await writeRollout(dir, "019e67a9-4093-7863-85b8-65a9930bc13f", "Restore my Codex history");
  const parsed = await parseSessionFile(file);
  assert.equal(parsed.malformed.length, 0);
  assert.equal(parsed.facts.id, "019e67a9-4093-7863-85b8-65a9930bc13f");
  assert.equal(parsed.facts.title, "Restore my Codex history");
  assert.equal(parsed.facts.messageCounts.users, 1);
});

test("inspectCodex detects missing index and missing database threads", async () => {
  const codexDir = await fixtureCodex();
  const result = await inspectCodex({ codexDir });
  const codes = result.diagnosis.issues.map((issue) => issue.code);
  assert.ok(codes.includes("missing-session-index"));
  assert.ok(codes.includes("thread-missing-session"));
  assert.equal(result.repairPlan.operationCount, 2);
});

test("repair dry-run does not write files", async () => {
  const codexDir = await fixtureCodex();
  const result = await inspectCodex({ codexDir });
  const report = await applyRepairPlan(result.repairPlan, { apply: false });
  assert.equal(report.dryRun, true);
  assert.equal(fs.existsSync(path.join(codexDir, "session_index.jsonl")), false);
});

test("repair apply writes index and upserts sqlite thread, then restore reverts", async () => {
  const codexDir = await fixtureCodex();
  const doctorDir = await fixtureDir();
  const backup = await createBackup(codexDir, { doctorDir, backupId: "test-backup" });
  const result = await inspectCodex({ codexDir });
  const report = await applyRepairPlan(result.repairPlan, {
    apply: true,
    codexDir,
    doctorDir,
    backup
  });

  assert.equal(report.applied, true);
  assert.equal(fs.existsSync(path.join(codexDir, "session_index.jsonl")), true);

  const db = new DatabaseSync(path.join(codexDir, "state_5.sqlite"), { readOnly: true });
  const row = db.prepare("select id, title from threads").get();
  db.close();
  assert.equal(row.id, "019e67a9-4093-7863-85b8-65a9930bc13f");
  assert.equal(row.title, "Restore my Codex history");

  await restoreBackup("test-backup", codexDir, { doctorDir });
  assert.equal(fs.existsSync(path.join(codexDir, "session_index.jsonl")), false);
});

test("repair retargets old threads to the current configured model provider and model", async () => {
  const codexDir = await fixtureCodex({
    includeThread: true,
    threadModelProvider: "old-provider",
    threadModel: "old-model",
    configModelProvider: "custom",
    configModel: "gpt-5.5"
  });
  const result = await inspectCodex({ codexDir });
  assert.equal(result.diagnosis.currentModel.modelProvider, "custom");
  assert.equal(result.diagnosis.currentModel.model, "gpt-5.5");
  assert.ok(result.diagnosis.issues.some((issue) => issue.code === "thread-model-stale"));

  await applyRepairPlan(result.repairPlan, { apply: true, codexDir, doctorDir: await fixtureDir() });

  const db = new DatabaseSync(path.join(codexDir, "state_5.sqlite"), { readOnly: true });
  const row = db.prepare("select model_provider, model from threads where id = ?").get("019e67a9-4093-7863-85b8-65a9930bc13f");
  db.close();
  assert.equal(row.model_provider, "custom");
  assert.equal(row.model, "gpt-5.5");
});

async function fixtureCodex(options = {}) {
  const codexDir = await fixtureDir();
  await writeRollout(codexDir, "019e67a9-4093-7863-85b8-65a9930bc13f", "Restore my Codex history");
  createStateDb(path.join(codexDir, "state_5.sqlite"));
  if (options.configModelProvider || options.configModel) {
    await fs.promises.writeFile(
      path.join(codexDir, "config.toml"),
      `model_provider = "${options.configModelProvider || "custom"}"\nmodel = "${options.configModel || "gpt-5.5"}"\n`,
      "utf8"
    );
  }
  if (options.includeThread) {
    const db = new DatabaseSync(path.join(codexDir, "state_5.sqlite"));
    db.prepare(`
      insert into threads (
        id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
        sandbox_policy, approval_mode, model, created_at_ms, updated_at_ms, preview
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "019e67a9-4093-7863-85b8-65a9930bc13f",
      path.join(codexDir, "sessions", "2026", "05", "27", "rollout-2026-05-27T12-00-00-019e67a9-4093-7863-85b8-65a9930bc13f.jsonl"),
      1779854400,
      1779854402,
      "vscode",
      options.threadModelProvider || "old-provider",
      "D:\\Users\\sample",
      "Restore my Codex history",
      JSON.stringify({ type: "unknown" }),
      "unknown",
      options.threadModel || "old-model",
      1779854400000,
      1779854402000,
      "Restore my Codex history"
    );
    db.close();
  }
  return codexDir;
}

async function fixtureDir() {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), "codex-history-doctor-"));
}

async function writeRollout(codexDir, id, message) {
  const file = path.join(codexDir, "sessions", "2026", "05", "27", `rollout-2026-05-27T12-00-00-${id}.jsonl`);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const records = [
    {
      type: "session_meta",
      timestamp: "2026-05-27T04:00:00.000Z",
      payload: {
        id,
        timestamp: "2026-05-27T04:00:00.000Z",
        cwd: "D:\\Users\\sample",
        source: "vscode",
        model_provider: "openai",
        cli_version: "0.133.0-alpha.1",
        thread_source: "user"
      }
    },
    {
      type: "event_msg",
      timestamp: "2026-05-27T04:00:01.000Z",
      payload: {
        type: "user_message",
        message
      }
    },
    {
      type: "event_msg",
      timestamp: "2026-05-27T04:00:02.000Z",
      payload: {
        type: "agent_message",
        message: "Done."
      }
    }
  ];
  await fs.promises.writeFile(file, records.map((record) => JSON.stringify(record)).join("\n"), "utf8");
  return file;
}

function createStateDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    create table threads (
      id text primary key,
      rollout_path text not null,
      created_at integer not null,
      updated_at integer not null,
      source text not null,
      model_provider text not null,
      cwd text not null,
      title text not null,
      sandbox_policy text not null,
      approval_mode text not null,
      tokens_used integer not null default 0,
      has_user_event integer not null default 0,
      archived integer not null default 0,
      archived_at integer,
      git_sha text,
      git_branch text,
      git_origin_url text,
      cli_version text not null default '',
      first_user_message text not null default '',
      agent_nickname text,
      agent_role text,
      memory_mode text not null default 'enabled',
      model text,
      reasoning_effort text,
      agent_path text,
      created_at_ms integer,
      updated_at_ms integer,
      thread_source text,
      preview text not null default ''
    );
  `);
  db.close();
}
