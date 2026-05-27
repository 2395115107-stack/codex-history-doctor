const fs = require("node:fs");
const path = require("node:path");
const { exists } = require("./fs-utils");

async function detectCurrentModel(codexDir, threads = []) {
  const fromConfig = await readModelFromConfig(path.join(codexDir, "config.toml"));
  if (fromConfig.modelProvider || fromConfig.model) {
    return {
      source: "config.toml",
      modelProvider: fromConfig.modelProvider || fallbackFromThreads(threads).modelProvider || "unknown",
      model: fromConfig.model || fallbackFromThreads(threads).model || null
    };
  }

  const fromThreads = fallbackFromThreads(threads);
  return {
    source: fromThreads.modelProvider || fromThreads.model ? "latest-thread" : "unknown",
    modelProvider: fromThreads.modelProvider || "unknown",
    model: fromThreads.model || null
  };
}

async function readModelFromConfig(configPath) {
  if (!(await exists(configPath))) return {};
  const text = await fs.promises.readFile(configPath, "utf8");
  const rootOnly = text.split(/\r?\n(?=\[)/)[0];
  return {
    modelProvider: readTomlString(rootOnly, "model_provider"),
    model: readTomlString(rootOnly, "model")
  };
}

function readTomlString(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*\"([^\"]*)\"\\s*$`, "m"));
  return match ? match[1] : null;
}

function fallbackFromThreads(threads) {
  const latest = [...threads]
    .filter((thread) => thread.model_provider || thread.model)
    .sort((a, b) => Number(b.updated_at_ms || b.updated_at || 0) - Number(a.updated_at_ms || a.updated_at || 0))[0];
  return {
    modelProvider: latest?.model_provider || null,
    model: latest?.model || null
  };
}

function retargetThread(thread, currentModel) {
  return {
    ...thread,
    modelProvider: currentModel.modelProvider || thread.modelProvider || "unknown",
    model: currentModel.model || thread.model || null
  };
}

module.exports = {
  detectCurrentModel,
  retargetThread
};
