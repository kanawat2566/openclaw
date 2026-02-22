# Personal AI on OpenClaw: Master Task List

## Progress Snapshot (2026-02-22)

- `WS1` Baseline and observability: `in progress` (plugin scaffold + metrics foundation done)
- `WS2` Token optimization: `in progress` (routing/budget hooks foundation done; regression suite pending)
- `WS3` Preference memory: `in progress` (file store + extraction basics done; retrieval integration tuning pending)
- `WS4` Task planner: `in progress` (file store + core tools done; NL extraction and prompt integration refinement pending)
- `WS5` Daily summary: `in progress` (manual tools + auto service timer integration done; direct cron-job path + LINE delivery pending)
- `WS6` Skill registry/versioning: `in progress` (file registry + lifecycle rules done; command/admin controls pending)
- `WS7` LINE integration hardening: `pending`
- `WS8` Full test platform: `in progress` (unit + plugin hook/service integration foundation done; e2e/regression/load pending)

## Assumptions

- OpenClaw core remains primary runtime
- Local-only deployment
- LINE credentials available
- File-first storage for personal features in phase 1
- Hybrid model routing required from MVP

## Workstreams

- WS1: Baseline and observability
- WS2: Token optimization
- WS3: Preference memory
- WS4: Task planner
- WS5: Daily summary (cron)
- WS6: Skill registry/versioning
- WS7: LINE integration hardening
- WS8: Test platform (unit/integration/e2e/load/regression)

## Execution Order (Dependency-Aware)

1. WS1 Baseline and observability
2. WS2 Token optimization
3. WS3 Preference memory
4. WS6 Skill registry/versioning (foundation for WS4/WS5 tools)
5. WS4 Task planner
6. WS5 Daily summary
7. WS7 LINE integration hardening
8. WS8 Full test suite + regression baselines

## WS1: Baseline and Observability

### Goals

- Add measurable baseline before behavior changes
- Create personal-ai extension module skeleton
- Capture token/latency/tool metrics

### Tasks

- Create `extensions/personal-ai/` plugin scaffold
- Register plugin hooks (no-op first) and logger
- Add structured metrics writer (JSONL file)
- Define scenario fixtures for regression comparisons
- Add config section for personal-ai features
- Add local state directory conventions

### Deliverables

- Plugin skeleton loads successfully
- Metrics file written for inbound LINE/local test messages
- Baseline scenario runner outputs token/latency snapshots

## WS2: Token Optimization (Highest Priority)

### Goals

- Reduce token use without harming response quality
- Enforce channel-specific context budgets (LINE strict)

### Tasks

- Implement token budget policy config
- Add `before_model_resolve` hook for hybrid model routing
- Add `before_prompt_build` hook for selective context assembly
- Add compaction monitoring hooks (`before_compaction`, `after_compaction`)
- Add response verbosity policy per channel
- Add fallback escalation rule (small -> large) when needed
- Add token regression benchmark cases

### Acceptance Criteria

- 30%+ reduction on baseline scenarios (target)
- No major regression in expected outputs on golden tests
- Compaction/fallback stats logged per run

## WS3: Preference Memory

### Goals

- Persist user preferences and constraints
- Retrieve only relevant memory for prompts

### Tasks

- Define preference memory schema (file-first)
- Implement extractor for candidate preferences
- Add dedupe/merge policy
- Implement memory scoring (importance/confidence/recency)
- Implement retrieval adapter backed by OpenClaw memory search
- Add feedback update path (`useful` / `not useful`)
- Add pruning/compaction policy for memory entries

### Acceptance Criteria

- Preferences persist across sessions
- Retrieval returns relevant top-k entries with threshold
- Duplicate writes are merged rather than appended blindly

## WS6: Skill Registry / Versioning (Foundation)

### Goals

- Track personal skills lifecycle and versions without fighting OpenClaw plugin system

### Tasks

- Define local skill registry schema (`skills.json`)
- Implement registry service (load/save/validate)
- Add lifecycle states (`draft/testing/enabled/deprecated`)
- Add permission model (channel/user/unsafe actions)
- Add invocation logging with version tag
- Add CLI/admin helper commands (optional in phase 1; file editing fallback allowed)

### Acceptance Criteria

- Skills can be enabled/disabled by version
- Invocation logs include skill + version + outcome
- Invalid state transitions are rejected

## WS4: Task Planner

### Goals

- Create personal task planning capability backed by local files and tools

### Tasks

- Define task schema (`tasks.json`)
- Implement planner service (CRUD + state transitions)
- Add tools:
  - `task_create`
  - `task_update`
  - `task_list`
  - `task_complete`
  - `task_plan_today`
  - `task_next_action`
- Add parser/extractor from free-form user messages
- Integrate planner context into prompt build (active tasks only)

### Acceptance Criteria

- Tasks can be created/updated from chat
- Planner tools are versioned in skill registry
- Prompt includes only active relevant tasks

## WS5: Daily Summary (Cron)

### Goals

- Produce daily digest using OpenClaw cron service

### Tasks

- Define daily summary schema/artifact path
- Implement summary aggregation service (messages/tasks/memory/metrics)
- Integrate with `src/cron` service/job definitions
- Add summary generator tool/job runner
- Add optional LINE push delivery path
- Add idempotency guard per date

### Acceptance Criteria

- Cron job runs locally and persists one summary per day
- Re-run same day does not duplicate summaries
- LINE push optional and configurable

## WS7: LINE Integration Hardening

### Goals

- Ensure Personal AI behavior works reliably via LINE channel

### Tasks

- Add channel-specific token and verbosity budgets
- Verify reply/push fallback behavior with personal tools enabled
- Add quick-reply actions for feedback (useful/not useful) if feasible
- Add task shortcuts (e.g., "Today tasks", "Daily summary")
- Add webhook/idempotency regression tests for personal plugin path

### Acceptance Criteria

- LINE conversations use personal features without breaking existing reply flow
- Large outputs chunk safely
- Feedback/task actions update local stores correctly

## WS8: Full Test Platform (Unit + Integration + E2E + Load + Regression)

### Goals

- Ship with repeatable confidence and cost-quality tracking

### Tasks

- Unit tests for each service (memory/task/registry/routing policy)
- Hook integration tests (before_model_resolve, before_prompt_build, compaction hooks)
- LINE integration tests using existing test harness patterns
- Cron daily summary integration tests
- E2E local flow tests (mock LINE webhook -> response -> state updates)
- Regression golden tests (token usage + output shape)
- Load test harness (local synthetic messages, concurrent sessions)
- Failure injection tests (memory failure, model fallback, line reply token failure)

### Acceptance Criteria

- `pnpm test` passes for new tests
- Personal AI regression suite produces baseline report
- Load test completes with no crashes and bounded latency targets

## Cross-Cutting Non-Functional Tasks

- Config documentation for personal-ai extension
- Data retention and local privacy notes
- Migration plan from file-first to Postgres/pgvector
- Rollback plan (disable personal-ai plugin cleanly)
- Change log entries for user-visible behavior

## Milestones (Suggested)

1. M1: Baseline + plugin skeleton + metrics
2. M2: Token optimization + hybrid routing
3. M3: Preference memory + retrieval
4. M4: Skill registry/versioning + task planner
5. M5: Daily summary + cron + LINE shortcuts
6. M6: Full test suite + regression/load reports

## Definition of Done (Project)

- Personal AI plugin can run locally on LINE
- Token optimization is active and measurable
- Preference memory persists and is used in prompts
- Task planner and daily summary work end-to-end
- Skill registry/versioning controls personal tools
- Full automated test layers exist (unit/integration/e2e/regression/load)
