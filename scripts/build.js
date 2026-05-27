#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const required = [
  "src/cli.js",
  "src/core/index.js",
  "src/electron/main.js",
  "src/electron/preload.js",
  "src/renderer/index.html",
  "README.md"
];

const missing = required.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
if (missing.length > 0) {
  console.error("Build check failed. Missing files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Build check passed. Use npm run package:win to create a Windows portable app.");
