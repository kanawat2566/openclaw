import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MetricsWriter } from "./metrics.js";
import { DailySummaryStore } from "./daily-summary-store.js";
import { PreferenceStore } from "./preference-store.js";
import { clearPersonalAiRuntimeState, setPersonalAiRuntimeState } from "./runtime-state.js";
import { SkillRegistryStore } from "./skill-registry.js";
import { TaskStore } from "./task-store.js";
import { createSurapPersonalAiTools } from "./tools.js";

const tempDirs: string[] = [];

afterEach(async () => {
  clearPersonalAiRuntimeState();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function setupState() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-tools-"));
  tempDirs.push(dir);
  setPersonalAiRuntimeState({
    initializedAt: Date.now(),
    channelHints: new Map(),
    stores: {
      preferences: new PreferenceStore(path.join(dir, "preferences.json")),
      tasks: new TaskStore(path.join(dir, "tasks.json")),
      skills: new SkillRegistryStore(path.join(dir, "skills.json")),
      dailySummaries: new DailySummaryStore(path.join(dir, "daily-summaries.json")),
    },
    metrics: new MetricsWriter(path.join(dir, "metrics.jsonl")),
  });
}

function getTool(name: string) {
  const tool = createSurapPersonalAiTools().find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  return tool;
}

describe("surap-personal-ai tools", () => {
  it("writes and lists preferences", async () => {
    await setupState();
    const write = getTool("surap_preference_memory_write");
    const list = getTool("surap_preference_memory_list");
    await write.execute?.("1", { key: "response.style", value: "ตอบสั้น" });
    const result = await list.execute?.("2", { limit: 5 });
    const details = (result as { details?: { count?: number; items?: Array<{ key: string }> } })?.details;
    expect(details?.count).toBe(1);
    expect(details?.items?.[0]?.key).toBe("response.style");
  });

  it("creates and plans tasks", async () => {
    await setupState();
    const create = getTool("surap_task_create");
    const plan = getTool("surap_task_plan_today");
    await create.execute?.("1", { title: "Prepare report", nextAction: "Draft outline" });
    const result = await plan.execute?.("2", { limit: 3 });
    const details = (result as { details?: { plan?: Array<{ title: string }> } })?.details;
    expect(details?.plan?.[0]?.title).toBe("Prepare report");
  });

  it("generates and lists daily summaries", async () => {
    await setupState();
    const createTask = getTool("surap_task_create");
    const writePref = getTool("surap_preference_memory_write");
    const gen = getTool("surap_daily_summary_generate");
    const list = getTool("surap_daily_summary_list");

    await createTask.execute?.("1", { title: "Review code", nextAction: "Open PR diff" });
    await writePref.execute?.("2", { key: "response.style", value: "ตอบสั้น" });
    await gen.execute?.("3", { date: "2026-02-22" });
    const result = await list.execute?.("4", { limit: 5 });

    const details = (result as { details?: { count?: number; items?: Array<{ date: string }> } })?.details;
    expect(details?.count).toBe(1);
    expect(details?.items?.[0]?.date).toBe("2026-02-22");
  });
});
