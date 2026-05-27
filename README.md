# Codex History Doctor

Codex History Doctor is a local repair tool for Codex Desktop history.

When Codex still has local rollout files but the desktop history list is missing, incomplete, or suspicious, this tool scans the local `.codex` folder, creates a backup, previews the repair, and then rebuilds the history index and thread database records.

It never uploads your conversations. Everything runs on your machine.

It also reads the current top-level `model_provider` and `model` from `.codex/config.toml` and reattaches recovered or stale threads to that current model identity.

## What It Repairs

- Missing or damaged `session_index.jsonl`
- Missing `threads` rows in `state_*.sqlite`
- Thread rows pointing to missing rollout paths
- Empty or suspicious thread titles
- Threads still attached to an old `model_provider` or `model`
- Duplicate session ids, reported instead of silently hidden
- Malformed jsonl lines, reported without deleting source files

It cannot recover conversations that were physically deleted from disk.

## Desktop App

```bash
npm install
npm start
```

Before repairing, close Codex Desktop. This avoids writing to the same local files while Codex is running.

The desktop app includes a Settings section with English and Simplified Chinese.

Use the app in this order:

1. Scan
2. Backup
3. Repair Preview
4. Repair
5. Report

The Repair button creates a backup before writing anything.

## CLI

```bash
npm run cli -- scan
npm run cli -- doctor --report
npm run cli -- backup
npm run cli -- repair --dry-run
npm run cli -- repair --apply --yes
npm run cli -- backups
npm run cli -- restore <backup-id>
```

Close Codex Desktop before running `repair --apply --yes` or `restore`.

Use a custom Codex folder:

```bash
npm run cli -- scan --codex-dir "C:\Users\you\.codex"
```

## Safety Model

- Scan is read-only.
- Dry run is read-only.
- Repair requires explicit confirmation in the app or `--apply --yes` in the CLI.
- Repair creates a backup first.
- Restore copies the backup payload back into the selected `.codex` folder.
- The Codex Desktop program itself is not modified.

## Reports

Reports are written as:

- `diagnosis.json`
- `repair-plan.json`
- `repair-report.md`

By default they are stored under:

```text
~/.codex-history-doctor/reports/latest/
```

Backups are stored under:

```text
~/.codex-history-doctor/backups/
```

## Development

```bash
npm install
npm test
npm run build
npm run package:win
```

## Release Notes

### v0.1.0

- First public version.
- Windows-first desktop app and CLI.
- Local scan, diagnosis, backup, repair preview, repair, restore, and report export.
- Built with Electron and Node.js.
