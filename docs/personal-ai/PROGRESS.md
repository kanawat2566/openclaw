# Personal AI Progress (surap-personal-ai)

## How To Check Progress

1. `docs/personal-ai/TASK_LIST.md`
   - master backlog / phase order / acceptance criteria
2. `docs/personal-ai/PROGRESS.md` (this file)
   - current completion snapshot and next steps
3. `git status --short`
   - what changed in code right now
4. Run focused tests:
   - PowerShell (explicit files): `pnpm vitest run extensions/surap-personal-ai/src/token-optimization.test.ts extensions/surap-personal-ai/src/preference-store.test.ts extensions/surap-personal-ai/src/task-store.test.ts extensions/surap-personal-ai/src/skill-registry.test.ts extensions/surap-personal-ai/src/tools.test.ts extensions/surap-personal-ai/src/daily-summary.test.ts`
5. Later (when integrated): run plugin-specific integration suites

## Current Status Snapshot

Date baseline: 2026-02-22

### Completed (Foundation)

- Planning docs created (`MASTER_FLOW`, `TASK_LIST`, `TEST_PLAN`)
- `surap-personal-ai` extension scaffold created
- File-first state stores:
  - preferences
  - tasks
  - skills registry
  - metrics JSONL
- Hook wiring added:
  - `message_received`
  - `before_model_resolve`
  - `before_prompt_build`
  - `before_compaction`
  - `after_compaction`
  - `llm_output`
  - `after_tool_call`
- Token optimization foundation:
  - channel token budget policy
  - hybrid model routing heuristic (small/large)
  - prompt prepend context builder
- Tool layer v1 added:
  - `surap_preference_memory_write`
  - `surap_preference_memory_list`
  - `surap_task_create`
  - `surap_task_update`
  - `surap_task_complete`
  - `surap_task_list`
  - `surap_task_plan_today`
- Daily summary (manual tool foundation) added:
  - `surap_daily_summary_generate`
  - `surap_daily_summary_list`
  - file-first summary store + summary builder
- Auto daily summary (service-based scheduler integration) added:
  - plugin service lifecycle starts interval timer (OpenClaw `registerService`)
  - startup run when enabled
  - config-ready (`dailySummary.auto.enabled`, `intervalMs`)

### Tests Passing (Current)

- `token-optimization.test.ts`
- `preference-store.test.ts`
- `task-store.test.ts`
- `skill-registry.test.ts`
- `tools.test.ts`
- `daily-summary.test.ts`
- `hooks.integration.test.ts`
- `service.integration.test.ts`

## In Progress / Next

1. Task planner natural-language extraction flow (hook/tool-assisted)
2. Daily summary service + cron integration
3. LINE integration tests for personal-ai path
4. Regression suite (token/cost + routing behavior)
5. Load test harness
6. (Optional) Direct `src/cron` job registration path if plugin API exposes/permits it later

## Scheduler Note

- OpenClaw has a core cron engine (`src/cron/*`), but plugin API does not currently expose direct cron job registration to extensions.
- Current implementation integrates with OpenClaw using plugin service lifecycle (`registerService` + timer), which is safe and local-only.

## Notes

- Model ids for small/large routing are intentionally configurable later.
- Daily summary push to LINE and quick-reply feedback are deferred by request.
- File-first storage is intentional phase 1; DB migration planned later.
