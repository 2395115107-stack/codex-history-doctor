const fs = require("node:fs");
const path = require("node:path");

async function exists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function readJsonl(filePath) {
  const text = await fs.promises.readFile(filePath, "utf8");
  if (text.trim() === "") return [];

  const records = [];
  const errors = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error.message
      });
    }
  }

  return { records, errors };
}

async function writeJsonl(filePath, records) {
  const body = records.map((record) => JSON.stringify(record)).join("\n");
  await fs.promises.writeFile(filePath, `${body}\n`, "utf8");
}

async function listFiles(root, predicate) {
  const found = [];

  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (!predicate || predicate(fullPath)) {
        found.push(fullPath);
      }
    }
  }

  await walk(root);
  return found.sort();
}

async function copyFileIfExists(source, destination) {
  if (!(await exists(source))) return false;
  await ensureDir(path.dirname(destination));
  await fs.promises.copyFile(source, destination);
  return true;
}

async function copyDirectory(source, destination) {
  if (!(await exists(source))) return false;
  await ensureDir(destination);
  await fs.promises.cp(source, destination, { recursive: true, force: true });
  return true;
}

module.exports = {
  copyDirectory,
  copyFileIfExists,
  ensureDir,
  exists,
  listFiles,
  readJsonl,
  writeJsonl
};
