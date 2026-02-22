import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MetricsWriter } from "./metrics.js";
import { PreferenceStore } from "./preference-store.js";
import { clearPersonalAiRuntimeState, setPersonalAiRuntimeState } from "./runtime-state.js";
import { SkillRegistryStore } from "./skill-registry.js";
import { TaskStore } from "./task-store.js";
import { DailySummaryStore } from "./daily-summary-store.js";
import { registerSurapPersonalAiHooks } from "./hooks.js";

const tempDirs: string[] = [];

afterEach(async () => {
  clearPersonalAiRuntimeState();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function setupState() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-hooks-it-"));
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

type HookMap = Record<string, (event: unknown, ctx: unknown) => unknown>;

function createFakeApi(hooks: HookMap) {
  return {
    pluginConfig: {
      modelRouting: {
        small: { provider: "openai", model: "gpt-small" },
        large: { provider: "openai", model: "gpt-large" },
        forceLargeKeywords: ["วางแผน"],
        complexityThreshold: 100,
      },
    },
    on(name: string, handler: (event: unknown, ctx: unknown) => unknown) {
      hooks[name] = handler;
    },
  } as unknown;
}

describe("surap-personal-ai hook integration", () => {
  it("extracts preferences and prepends prompt context", async () => {
    await setupState();
    const hooks: HookMap = {};
    registerSurapPersonalAiHooks(createFakeApi(hooks) as never);

    await hooks.message_received?.(
      { from: "u1", content: "ผมชอบกาแฟ", timestamp: Date.now() },
      { channelId: "line", conversationId: "c1" },
    );

    const prepend = await hooks.before_prompt_build?.(
      { prompt: "ช่วยตอบหน่อย", messages: [] },
      { sessionKey: "s1", sessionId: "sid1", messageProvider: "line" },
    );

    expect(prepend).toMatchObject({
      prependContext: expect.stringContaining("Known user preferences"),
    });
    expect((prepend as { prependContext: string }).prependContext).toContain("กาแฟ");
  });

  it("returns model override from routing hook", async () => {
    await setupState();
    const hooks: HookMap = {};
    registerSurapPersonalAiHooks(createFakeApi(hooks) as never);
    const route = await hooks.before_model_resolve?.(
      { prompt: "ช่วยวางแผนระบบนี้" },
      { sessionKey: "s1" },
    );
    expect(route).toMatchObject({
      providerOverride: "openai",
      modelOverride: "gpt-large",
    });
  });
});
