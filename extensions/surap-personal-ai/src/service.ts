import fs from "node:fs/promises";
import type { OpenClawPluginApi, OpenClawPluginService } from "openclaw/plugin-sdk";
import { resolveDailySummaryAutoConfig, resolvePluginConfig } from "./config.js";
import { DailySummaryStore } from "./daily-summary-store.js";
import { generateAndPersistDailySummary } from "./daily-summary-runner.js";
import { MetricsWriter } from "./metrics.js";
import { PreferenceStore } from "./preference-store.js";
import {
  clearPersonalAiRuntimeState,
  getPersonalAiRuntimeState,
  setPersonalAiRuntimeState,
} from "./runtime-state.js";
import { SkillRegistryStore } from "./skill-registry.js";
import { resolvePersonalAiPaths } from "./state-paths.js";
import { TaskStore } from "./task-store.js";

export function createSurapPersonalAiService(api: OpenClawPluginApi): OpenClawPluginService {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const runAutoSummary = async () => {
    if (running) {
      return;
    }
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    running = true;
    try {
      const item = await generateAndPersistDailySummary({
        tasks: runtimeState.stores.tasks,
        preferences: runtimeState.stores.preferences,
        dailySummaries: runtimeState.stores.dailySummaries,
      });
      await runtimeState.metrics.write({
        type: "tool_call",
        at: Date.now(),
        toolName: "surap_daily_summary_generate:auto",
        success: true,
      });
      api.logger.info(`surap-personal-ai: auto daily summary updated ${item.date}`);
    } catch (err) {
      api.logger.warn(`surap-personal-ai: auto daily summary failed: ${String(err)}`);
    } finally {
      running = false;
    }
  };

  return {
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
          dailySummaries: new DailySummaryStore(paths.dailySummariesFile),
        },
        metrics: new MetricsWriter(paths.metricsFile),
      });
      await Promise.all([
        setDefaultSkills(paths.skillRegistryFile),
        new TaskStore(paths.tasksFile).list(),
        new PreferenceStore(paths.preferencesFile).list(),
        new DailySummaryStore(paths.dailySummariesFile).list(),
      ]);

      const pluginCfg = resolvePluginConfig(api.pluginConfig);
      const autoCfg = resolveDailySummaryAutoConfig(pluginCfg);
      if (autoCfg.enabled) {
        await runAutoSummary().catch(() => {});
        timer = setInterval(() => {
          runAutoSummary().catch(() => {});
        }, autoCfg.intervalMs);
        timer.unref?.();
      }
      ctx.logger.info("surap-personal-ai state initialized");
    },
    async stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      clearPersonalAiRuntimeState();
    },
  };
}

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
