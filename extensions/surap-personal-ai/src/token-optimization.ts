import type { RoutingModels, TokenBudgetPolicy } from "./types.js";

export function estimatePromptComplexity(prompt: string): number {
  const text = prompt.trim();
  if (!text) {
    return 0;
  }
  let score = 0;
  const words = text.split(/\s+/).filter(Boolean);
  score += Math.min(8, Math.floor(words.length / 12));
  if (text.length > 280) {
    score += 2;
  }
  if (/\n/.test(text)) {
    score += 1;
  }
  if (/[0-9][\.\)]\s/.test(text)) {
    score += 2;
  }
  if (/```|json|schema|workflow|architecture|timeline/i.test(text)) {
    score += 2;
  }
  if (/[?].*[?]/.test(text)) {
    score += 1;
  }
  return Math.max(0, score);
}

export function resolveChannelTokenBudget(policy: TokenBudgetPolicy, channelId?: string): number {
  if (!channelId) {
    return policy.defaultBudget;
  }
  return policy.byChannel[channelId] ?? policy.defaultBudget;
}

export function chooseModelLane(
  prompt: string,
  routing: RoutingModels,
): {
  lane: "small" | "large" | "noop";
  complexity: number;
  reason: string;
} {
  const complexity = estimatePromptComplexity(prompt);
  const normalized = prompt.toLowerCase();
  const forceLarge = routing.forceLargeKeywords.some((kw) => normalized.includes(kw));
  if (forceLarge && routing.large?.model) {
    return { lane: "large", complexity, reason: "force_large_keyword" };
  }
  if (complexity >= routing.complexityThreshold && routing.large?.model) {
    return { lane: "large", complexity, reason: "complexity_threshold" };
  }
  if (routing.small?.model) {
    return { lane: "small", complexity, reason: "default_small" };
  }
  if (routing.large?.model) {
    return { lane: "large", complexity, reason: "fallback_large_only" };
  }
  return { lane: "noop", complexity, reason: "no_configured_models" };
}

export function buildModelOverride(
  lane: "small" | "large" | "noop",
  routing: RoutingModels,
): { providerOverride?: string; modelOverride?: string } {
  if (lane === "noop") {
    return {};
  }
  const source = lane === "small" ? routing.small : routing.large;
  return {
    providerOverride: source?.provider?.trim() || undefined,
    modelOverride: source?.model?.trim() || undefined,
  };
}
