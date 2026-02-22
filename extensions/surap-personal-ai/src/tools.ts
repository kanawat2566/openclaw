import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../../../src/agents/tools/common.js";
import {
  jsonResult,
  readStringArrayParam,
  readStringParam,
} from "../../../src/agents/tools/common.js";
import { getPersonalAiRuntimeState } from "./runtime-state.js";
import { generateAndPersistDailySummary } from "./daily-summary-runner.js";

const TASK_STATUS_VALUES = ["open", "in_progress", "done", "cancelled"] as const;

function requireState() {
  const state = getPersonalAiRuntimeState();
  if (!state) {
    throw new Error("surap-personal-ai state is not initialized");
  }
  return state;
}

export function createSurapPersonalAiTools(): AnyAgentTool[] {
  return [
    {
      name: "surap_preference_memory_write",
      description: "Write or update a user preference in personal memory.",
      label: "Preference Memory Write",
      parameters: Type.Object({
        key: Type.String(),
        value: Type.String(),
        source: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const item = await state.stores.preferences.upsert({
          key: readStringParam(params, "key", { required: true }),
          value: readStringParam(params, "value", { required: true }),
          source: readStringParam(params, "source"),
          tags: readStringArrayParam(params, "tags"),
        });
        return jsonResult({ ok: true, item });
      },
    },
    {
      name: "surap_preference_memory_list",
      description: "List top relevant personal preference memories.",
      label: "Preference Memory List",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const limitRaw = params.limit;
        const limit =
          typeof limitRaw === "number" && Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(20, Math.trunc(limitRaw)))
            : 10;
        const items = await state.stores.preferences.topRelevant(limit);
        return jsonResult({ ok: true, count: items.length, items });
      },
    },
    {
      name: "surap_task_create",
      description: "Create a personal task.",
      label: "Task Create",
      parameters: Type.Object({
        title: Type.String(),
        dueAt: Type.Optional(Type.String()),
        nextAction: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const item = await state.stores.tasks.create({
          title: readStringParam(params, "title", { required: true }),
          dueAt: readStringParam(params, "dueAt"),
          nextAction: readStringParam(params, "nextAction"),
          tags: readStringArrayParam(params, "tags"),
        });
        return jsonResult({ ok: true, item });
      },
    },
    {
      name: "surap_task_update",
      description: "Update a personal task fields/status.",
      label: "Task Update",
      parameters: Type.Object({
        id: Type.String(),
        title: Type.Optional(Type.String()),
        dueAt: Type.Optional(Type.String()),
        nextAction: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        status: Type.Optional(Type.String()),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const id = readStringParam(params, "id", { required: true });
        const statusRaw = readStringParam(params, "status");
        if (statusRaw && !TASK_STATUS_VALUES.includes(statusRaw as (typeof TASK_STATUS_VALUES)[number])) {
          throw new Error(`Invalid status: ${statusRaw}`);
        }
        const item = await state.stores.tasks.update(id, {
          title: readStringParam(params, "title"),
          dueAt: readStringParam(params, "dueAt"),
          nextAction: readStringParam(params, "nextAction"),
          tags: readStringArrayParam(params, "tags"),
          status: statusRaw as (typeof TASK_STATUS_VALUES)[number] | undefined,
        });
        if (!item) {
          throw new Error(`Task not found: ${id}`);
        }
        return jsonResult({ ok: true, item });
      },
    },
    {
      name: "surap_task_complete",
      description: "Mark a personal task as done.",
      label: "Task Complete",
      parameters: Type.Object({
        id: Type.String(),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const id = readStringParam(params, "id", { required: true });
        const item = await state.stores.tasks.update(id, { status: "done" });
        if (!item) {
          throw new Error(`Task not found: ${id}`);
        }
        return jsonResult({ ok: true, item });
      },
    },
    {
      name: "surap_task_list",
      description: "List personal tasks.",
      label: "Task List",
      parameters: Type.Object({
        mode: Type.Optional(Type.String({ default: "active" })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const mode = readStringParam(params, "mode") ?? "active";
        const limitRaw = params.limit;
        const limit =
          typeof limitRaw === "number" && Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(50, Math.trunc(limitRaw)))
            : 20;
        const items =
          mode === "all" ? (await state.stores.tasks.list()).slice(0, limit) : await state.stores.tasks.active(limit);
        return jsonResult({ ok: true, mode, count: items.length, items });
      },
    },
    {
      name: "surap_task_plan_today",
      description: "Return a compact plan for today's active tasks.",
      label: "Task Plan Today",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const limitRaw = params.limit;
        const limit =
          typeof limitRaw === "number" && Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(10, Math.trunc(limitRaw)))
            : 5;
        const tasks = await state.stores.tasks.active(limit);
        const plan = tasks.map((task, index) => ({
          rank: index + 1,
          taskId: task.id,
          title: task.title,
          dueAt: task.dueAt,
          nextAction: task.nextAction ?? `Start ${task.title}`,
        }));
        return jsonResult({ ok: true, count: plan.length, plan });
      },
    },
    {
      name: "surap_daily_summary_generate",
      description: "Generate and persist a file-first daily summary (manual trigger).",
      label: "Daily Summary Generate",
      parameters: Type.Object({
        date: Type.Optional(Type.String({ description: "YYYY-MM-DD (optional)" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const date = readStringParam(params, "date");
        const saved = await generateAndPersistDailySummary({
          date,
          tasks: state.stores.tasks,
          preferences: state.stores.preferences,
          dailySummaries: state.stores.dailySummaries,
        });
        return jsonResult({ ok: true, item: saved });
      },
    },
    {
      name: "surap_daily_summary_list",
      description: "List saved daily summaries.",
      label: "Daily Summary List",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 30 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const state = requireState();
        const limitRaw = params.limit;
        const limit =
          typeof limitRaw === "number" && Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(30, Math.trunc(limitRaw)))
            : 10;
        const items = (await state.stores.dailySummaries.list()).slice(0, limit);
        return jsonResult({ ok: true, count: items.length, items });
      },
    },
  ];
}
