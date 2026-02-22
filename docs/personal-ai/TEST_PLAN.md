# Personal AI on OpenClaw: Test Plan (Full)

## Test Objectives

- Verify correctness of personal-ai features
- Protect existing OpenClaw channel/runtime behavior
- Track token-cost improvements and regressions
- Validate local reliability under concurrency/load

## Test Layers

1. Unit tests
2. Integration tests
3. E2E tests (mock external surfaces)
4. Regression tests (golden scenarios)
5. Load tests (local synthetic)
6. Fault-injection/resilience tests

## Test Areas (Mapped to Requirements)

- Token optimization
- Memory preference persistence + retrieval
- Skill registry/versioning
- Task planner
- Daily summary cron
- LINE channel integration
- Hybrid model routing

## Unit Test Matrix

### Token Optimization

- Budget calculation per channel (`LINE` strict)
- Model routing policy chooses small model for simple prompts
- Escalation policy chooses large model on complexity/fallback condition
- Context assembler respects max item counts and ordering
- Compaction metrics collector handles missing usage data

### Preference Memory

- Candidate extraction (positive/negative cases)
- Dedupe merge rules
- Scoring updates (importance/confidence/recency)
- Retrieval threshold/top-k
- Feedback scoring adjustments
- Pruning policy

### Skill Registry / Versioning

- Schema validation
- Version resolution (exact / latest enabled)
- Lifecycle transitions allowed/blocked
- Permission checks by channel/user
- Invocation log writes include skill version

### Task Planner

- Task create/update/complete/list
- Due date parsing normalization
- Status transitions and validation
- `plan_today` prioritization
- `next_action` suggestion logic

### Daily Summary

- Aggregation window selection
- Idempotency key generation (per day)
- Summary artifact write/read
- Optional LINE delivery payload formatting

## Integration Test Matrix

### Plugin Hook Wiring

- `before_model_resolve` modifies model choice
- `before_prompt_build` injects memory/task context without breaking base prompt
- `after_tool_call` persists task/memory side effects
- `before_compaction`/`after_compaction` produce metrics

### OpenClaw Memory Integration

- Memory retrieval adapter works with existing memory search config
- Retrieval failure does not fail user reply path
- Session summary + preference memory coexist in prompt assembly

### Cron Integration

- Daily summary job registered, scheduled, and persisted
- Duplicate run same day prevented
- Failed summary run retries / marks failure

### LINE Integration

- Webhook -> personal-ai plugin -> reply success path
- Long reply chunking and formatting preserved
- Reply token failure falls back to push and still logs metrics
- Feedback quick action updates preference scoring (if implemented)

## E2E Test Scenarios (Local, Mocked APIs)

1. Preference learning
- User states preference
- AI stores preference
- Later question retrieves and applies preference

2. Task planning loop
- User creates tasks in natural language
- AI extracts and stores tasks
- User asks "what should I do today"
- AI returns prioritized plan using planner state

3. Daily summary generation
- Simulate day messages + task updates
- Trigger cron run
- Summary stored and optionally delivered to LINE mock

4. Token optimization regression
- Same conversation corpus with feature off/on
- Compare token usage and output structure

5. Hybrid routing
- Simple query uses small model
- Complex planning query escalates to large model

## Regression Suite (Golden)

### Golden Inputs

- Curated conversation fixtures (short, medium, long, tool-heavy)
- Memory stores with seeded preferences/tasks
- Channel variants (LINE-focused at minimum)

### Golden Assertions

- Selected model (small/large)
- Prompt context composition (counts/types, not exact full prompt text)
- Tool invocation sequence
- Output shape / critical phrases
- Token usage threshold relative to baseline
- Latency envelope (best-effort local)

### Output Artifacts

- `baseline.json`
- `current.json`
- diff report:
  - token delta
  - latency delta
  - route/model delta
  - response regression markers

## Load Test Plan (Local)

## Purpose

- Validate stability under local concurrency
- Detect race conditions in file-first stores

## Scenarios

- 10 concurrent sessions x 20 turns (mixed simple/planning)
- Burst webhook simulation for LINE (small messages)
- Cron run during active chat load
- Memory write-heavy run (frequent preference/task updates)

## Metrics

- p50/p95 latency
- error rate
- file write conflicts/retries
- compaction rate
- memory retrieval latency

## Pass Criteria (initial)

- No process crash
- Error rate < 2% (excluding injected failures)
- No corrupted JSON/JSONL state files
- Latency remains bounded and recovers after burst

## Fault Injection / Resilience Tests

- Memory backend unavailable or malformed file
- Skill registry file corruption (recover/backup)
- Model provider timeout on small model -> fallback large model
- LINE reply token invalid -> push fallback
- Cron job interrupted mid-write -> idempotent rerun

## Tooling and Repo Alignment

- Use Vitest patterns already present in `src/*/*.test.ts`
- Prefer existing OpenClaw test harnesses for channel/plugin tests
- Add dedicated personal-ai test harness for fixture setup and local state dirs
- Keep load tests opt-in (separate command/profile)

## Proposed Commands (to add during implementation)

- `pnpm test:personal-ai:unit`
- `pnpm test:personal-ai:integration`
- `pnpm test:personal-ai:e2e`
- `pnpm test:personal-ai:regression`
- `pnpm test:personal-ai:load`
- `pnpm test:personal-ai:all`

## Exit Criteria Before "Daily Use" Local Rollout

- All personal-ai unit/integration/e2e tests green
- Regression suite shows token reduction target met
- Load suite passes without state corruption
- LINE webhook path validated with real credentials in local environment
