import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { resolvePluginConfig, resolveRoutingModels, resolveTokenBudgetPolicy } from "./config.js";
import { extractPreferenceCandidates } from "./preference-extractor.js";
import { buildPrependContext } from "./prompt-context.js";
import { getPersonalAiRuntimeState } from "./runtime-state.js";
import { buildModelOverride, chooseModelLane } from "./token-optimization.js";

export function registerSurapPersonalAiHooks(api: OpenClawPluginApi): void {
  const pluginCfg = resolvePluginConfig(api.pluginConfig);
  const tokenPolicy = resolveTokenBudgetPolicy(pluginCfg);
  const routing = resolveRoutingModels(pluginCfg);

  api.on("message_received", async (event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    const conversationId = ctx.conversationId;
    await runtimeState.metrics.write({
      type: "message_received",
      at: Date.now(),
      channelId: ctx.channelId,
      contentLength: event.content.length,
      conversationId,
    });

    for (const candidate of extractPreferenceCandidates(event.content)) {
      await runtimeState.stores.preferences.upsert({
        key: candidate.key,
        value: candidate.value,
        confidence: candidate.confidence,
        importance: candidate.importance,
        source: ctx.channelId,
        tags: candidate.tags,
      });
    }
  });

  api.on("before_model_resolve", async (event, ctx) => {
    const decision = chooseModelLane(event.prompt, routing);
    const overrides = buildModelOverride(decision.lane, routing);
    const runtimeState = getPersonalAiRuntimeState();
    if (runtimeState) {
      await runtimeState.metrics.write({
        type: "model_route",
        at: Date.now(),
        sessionKey: ctx.sessionKey,
        complexity: decision.complexity,
        selectedLane: decision.lane,
        providerOverride: overrides.providerOverride,
        modelOverride: overrides.modelOverride,
        reason: decision.reason,
      });
    }
    return overrides;
  });

  api.on("before_prompt_build", async (_event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    const channelId = ctx.messageProvider;
    const [preferences, tasks] = await Promise.all([
      runtimeState.stores.preferences.topRelevant(tokenPolicy.prependPreferenceLimit),
      runtimeState.stores.tasks.active(tokenPolicy.prependTaskLimit),
    ]);
    const prependContext = buildPrependContext({
      channelId,
      policy: tokenPolicy,
      preferences,
      tasks,
    });
    await runtimeState.metrics.write({
      type: "prompt_context",
      at: Date.now(),
      sessionKey: ctx.sessionKey,
      channelId,
      preferenceCount: preferences.length,
      taskCount: tasks.length,
      charCount: prependContext.length,
    });
    return prependContext ? { prependContext } : undefined;
  });

  api.on("before_compaction", async (event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    await runtimeState.metrics.write({
      type: "compaction",
      at: Date.now(),
      phase: "before",
      sessionKey: ctx.sessionKey,
      messageCount: event.messageCount,
      tokenCount: event.tokenCount,
    });
  });

  api.on("after_compaction", async (event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    await runtimeState.metrics.write({
      type: "compaction",
      at: Date.now(),
      phase: "after",
      sessionKey: ctx.sessionKey,
      messageCount: event.messageCount,
      compactedCount: event.compactedCount,
      tokenCount: event.tokenCount,
    });
  });

  api.on("llm_output", async (event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    await runtimeState.metrics.write({
      type: "llm_usage",
      at: Date.now(),
      sessionKey: ctx.sessionKey,
      provider: event.provider,
      model: event.model,
      usage: event.usage,
    });
  });

  api.on("after_tool_call", async (event, ctx) => {
    const runtimeState = getPersonalAiRuntimeState();
    if (!runtimeState) {
      return;
    }
    await runtimeState.metrics.write({
      type: "tool_call",
      at: Date.now(),
      sessionKey: ctx.sessionKey,
      toolName: event.toolName,
      success: !event.error,
      durationMs: event.durationMs,
    });
  });
}
