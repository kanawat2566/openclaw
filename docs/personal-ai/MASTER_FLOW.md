# Personal AI on OpenClaw: Master Flow

## Scope (MVP+)

This flow covers the agreed priorities:

- Token optimization (highest priority)
- Preference memory
- Task planner
- Daily summary
- Skill registry/versioning
- LINE bot
- Hybrid model routing (small + large)
- Local-only deployment

## Design Principle

Use OpenClaw core as-is where possible, and add behavior via:

- Plugin hooks (`src/plugins/hooks.ts`)
- Plugin/tool registration (`src/plugins/registry.ts`)
- Existing memory search/index stack (`src/memory/*`, `src/agents/memory-search.ts`)
- Existing compaction and model selection paths (`src/agents/compaction.ts`, `src/agents/model-selection.ts`)
- Existing LINE channel runtime (`src/line/*`)
- Existing cron service for scheduled summaries (`src/cron/*`)

## End-to-End Message Flow (LINE)

1. LINE webhook request arrives
2. `src/line/monitor.ts` validates and normalizes inbound events
3. OpenClaw resolves route/agent/channel context
4. Auto-reply dispatch path executes (existing dispatcher)
5. Personal AI plugin hooks run:
   - `message_received`: capture context metadata
   - `before_model_resolve`: apply hybrid routing policy
   - `before_prompt_build`: inject compact summary + retrieved preference memory
   - `before_compaction` / `after_compaction`: track compaction stats and fallback
   - `after_tool_call`: update task planner and memory candidates
   - `before_message_write`: redact/trim noisy payloads before persistence (optional)
6. Agent runs with selected model/tools
7. Tool calls may include:
   - `personal_memory_search`
   - `personal_memory_write`
   - `task_planner_*`
   - `daily_summary_*`
   - `line_send` (if needed for proactive push)
8. Final response is formatted for LINE (`src/line/send.ts`, `src/line/reply-chunks.ts`)
9. Post-response hooks persist:
   - preference memory candidates
   - task state changes
   - token/cost usage metrics
10. Async jobs (cron/manual) run daily summary consolidation

## Token Optimization Flow

1. Inbound message classified (simple vs complex vs planning/tool-heavy)
2. Hook computes token budget by channel (`LINE` = strict)
3. Hybrid model routing chooses small or large model
4. Build prompt context with strict assembly order:
   - persona core (short, stable)
   - session summary (latest compact form)
   - retrieved preference memory (top-k, thresholded)
   - task planner state (only active items)
   - latest user turn + minimal assistant/tool context
5. If transcript too large, rely on existing compaction path (`src/agents/compaction.ts`)
6. Log usage + compaction effectiveness
7. Regression checks compare token deltas vs baseline scenarios

## Preference Memory Flow

1. Observe user messages and accepted assistant actions
2. Extract candidate facts/preferences (heuristic + optional LLM extraction)
3. Score candidates:
   - type (`preference`, `profile`, `constraint`)
   - confidence
   - importance
   - recency
4. Deduplicate against existing memory file/index entries
5. Persist in OpenClaw-compatible memory storage first (file/index-backed)
6. Retrieval during prompt build:
   - query = user intent + channel + task context
   - top-k (3-5)
   - min score threshold
   - temporal decay / MMR optional
7. Feedback updates score (useful/not useful)

## Task Planner Flow

1. User expresses task/goal/deadline
2. Task parser tool extracts:
   - title
   - due date/time
   - status
   - next action
   - tags/context
3. Task registry persists in local file store (phase 1)
4. Planner tools support:
   - create/update/list/complete
   - plan_today
   - suggest_next_action
5. Daily summary job reads task + interaction logs to produce digest

## Daily Summary Flow

1. Cron job (`src/cron/service.ts`) triggers daily summary run
2. Job gathers:
   - messages (day window)
   - task changes
   - important memory writes
   - token/cost metrics
3. Summarizer generates:
   - What was done
   - Open tasks
   - Key preferences learned
   - Risks / blockers
4. Summary persisted as semantic memory + daily report artifact
5. (Optional) Push summary to LINE

## Skill Registry / Versioning Flow

1. Personal AI skills are implemented as plugin tools + metadata wrappers
2. Registry file tracks:
   - skill id
   - semantic version
   - status (`draft`, `testing`, `enabled`, `deprecated`)
   - permissions
   - schemas
   - rollout flags
3. Hook/tool middleware enforces:
   - allowed channels
   - allowed users
   - dry-run/testing mode
4. Skill invocation logs record version used for regression tracking
5. New versions can coexist during staged rollout

## Data Stores (Phase 1: File-First)

- OpenClaw memory/index (existing memory stack)
- Personal extension state files (JSON/JSONL):
  - `preferences`
  - `tasks`
  - `daily-summaries`
  - `token-usage-metrics`
  - `skill-registry`

Phase 2 migration target:

- Postgres + pgvector (without breaking tool APIs)

## Observability Flow

Per request / per job metrics:

- channel
- agent id
- selected model
- token estimate / actual usage (if available)
- compaction triggered (yes/no)
- memory retrieved count + hit scores
- tools called + version
- latency
- failures / fallback path

## Failure and Fallback Strategy

- Memory retrieval failure -> continue without memory, log event
- Small model failure / low confidence -> escalate to large model
- LINE reply token failure -> existing fallback push path (already present in `src/line/monitor.ts`)
- Daily summary job failure -> retry once, mark job failed, preserve raw inputs
- Skill version error -> rollback to previous enabled version
