# Product Notes

## Audience

Codex Desktop users who can see evidence of old local conversations on disk but cannot see them correctly in the app history list.

## Positioning

Codex History Doctor is a safe local repair bench, not a cloud sync tool and not a replacement Codex client.

## v1 Promise

If the conversation rollout files still exist locally, the tool helps rebuild the local history index and database rows that Codex Desktop uses to show those conversations.

Recovered and stale database threads are attached to the current `model_provider` and `model` from `.codex/config.toml`, so older threads can appear under the provider/model the user is actively using now.

The main repair action is one-click sync: scan, backup, retarget database rows, sync rollout `session_meta` provider/model fields, rebuild `session_index.jsonl`, and scan again.

## v1 Boundaries

- No cloud upload.
- No deletion by default.
- No edits to Codex Desktop application binaries.
- No promise to recover deleted data.
- Windows first.
