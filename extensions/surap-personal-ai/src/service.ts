import fs from "node:fs/promises";
import type { OpenClawPluginService } from "openclaw/plugin-sdk";
import { MetricsWriter } from "./metrics.js";
import { PreferenceStore } from "./preference-store.js";
import { clearPersonalAiRuntimeState, setPersonalAiRuntimeState } from "./runtime-state.js";
import { SkillRegistryStore } from "./skill-registry.js";
import { resolvePersonalAiPaths } from "./state-paths.js";
import { TaskStore } from "./task-store.js";

export const surapPersonalAiService: OpenClawPluginService = {
  id: "surap-personal-ai-state",
  async start(ctx) {
    const paths = resolvePersonalAiPaths(ctx.stateDir);
    await fs.mkdir(paths.rootDir, { recursive: true });
    setPersonalAiRuntimeState({
      initializedAt: Date.now(),
      channelHints: new Map(),
      stores: {
        preferences: new PreferenceStore(paths.preferencesFile),
        tasks: new TaskStore(paths.tasksFile),
        skills: new SkillRegistryStore(paths.skillRegistryFile),
      },
      metrics: new MetricsWriter(paths.metricsFile),
    });
    await Promise.all([
      setDefaultSkills(paths.skillRegistryFile),
      new TaskStore(paths.tasksFile).list(),
      new PreferenceStore(paths.preferencesFile).list(),
    ]);
    ctx.logger.info("surap-personal-ai state initialized");
  },
  async stop() {
    clearPersonalAiRuntimeState();
  },
};

async function setDefaultSkills(skillRegistryFile: string): Promise<void> {
  const registry = new SkillRegistryStore(skillRegistryFile);
  await registry.upsert({
    id: "token_optimization",
    version: "0.1.0",
    status: "enabled",
    description: "Token budget + hybrid model routing hooks",
  });
  await registry.upsert({
    id: "preference_memory",
    version: "0.1.0",
    status: "testing",
    description: "Preference extraction and file-first memory store",
  });
  await registry.upsert({
    id: "task_planner",
    version: "0.1.0",
    status: "draft",
    description: "Task planner service and tools",
  });
  await registry.upsert({
    id: "daily_summary",
    version: "0.1.0",
    status: "draft",
    description: "Cron-based daily summary generator",
  });
}
