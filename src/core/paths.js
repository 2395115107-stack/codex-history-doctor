const os = require("node:os");
const path = require("node:path");

function defaultCodexDir() {
  return path.join(os.homedir(), ".codex");
}

function defaultDoctorDir() {
  return path.join(os.homedir(), ".codex-history-doctor");
}

function timestampId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

module.exports = {
  defaultCodexDir,
  defaultDoctorDir,
  timestampId
};
