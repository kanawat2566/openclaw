import type { SurapPersonalAiConfig, RoutingModels, TokenBudgetPolicy } from "./types.js";

const DEFAULT_CHANNEL_BUDGETS: Record<string, number> = {
  line: 1_600,
  discord: 3_200,
  telegram: 2_400,
  default: 2_000,
};

export function resolvePluginConfig(raw: unknown): SurapPersonalAiConfig {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as SurapPersonalAiConfig;
}

export function resolveTokenBudgetPolicy(cfg: SurapPersonalAiConfig): TokenBudgetPolicy {
  const tokenCfg = cfg.tokenOptimization ?? {};
  return {
    defaultBudget: DEFAULT_CHANNEL_BUDGETS.default,
    byChannel: {
      ...DEFAULT_CHANNEL_BUDGETS,
      ...(tokenCfg.channelBudgets ?? {}),
    },
    prependPreferenceLimit: tokenCfg.prependPreferenceLimit ?? 3,
    prependTaskLimit: tokenCfg.prependTaskLimit ?? 3,
  };
}

export function resolveRoutingModels(cfg: SurapPersonalAiConfig): RoutingModels {
  const routing = cfg.modelRouting ?? {};
  return {
    small: routing.small,
    large: routing.large,
    complexityThreshold: Math.max(1, routing.complexityThreshold ?? 8),
    forceLargeKeywords: (routing.forceLargeKeywords ?? [
      "plan",
      "strategy",
      "debug",
      "analyze",
      "ออกแบบ",
      "วางแผน",
      "สรุปหลายอย่าง",
    ]).map((s) => s.toLowerCase()),
  };
}

export function resolveDailySummaryAutoConfig(cfg: SurapPersonalAiConfig): {
  enabled: boolean;
  intervalMs: number;
} {
  const auto = cfg.dailySummary?.auto;
  return {
    enabled: auto?.enabled === true,
    intervalMs: Math.max(60_000, auto?.intervalMs ?? 6 * 60 * 60 * 1000),
  };
}
