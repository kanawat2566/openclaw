import type { PreferenceMemoryItem, TaskItem, TokenBudgetPolicy } from "./types.js";
import { resolveChannelTokenBudget } from "./token-optimization.js";

export function buildPrependContext(params: {
  channelId?: string;
  policy: TokenBudgetPolicy;
  preferences: PreferenceMemoryItem[];
  tasks: TaskItem[];
}): string {
  const budget = resolveChannelTokenBudget(params.policy, params.channelId);
  const prefLimit = Math.max(0, params.policy.prependPreferenceLimit);
  const taskLimit = Math.max(0, params.policy.prependTaskLimit);
  const prefs = params.preferences.slice(0, prefLimit);
  const tasks = params.tasks.slice(0, taskLimit);

  const lines: string[] = [];
  lines.push(`Token budget for this channel: ~${budget}`);
  if (prefs.length > 0) {
    lines.push("Known user preferences:");
    for (const pref of prefs) {
      lines.push(`- ${pref.key}: ${pref.value}`);
    }
  }
  if (tasks.length > 0) {
    lines.push("Active tasks:");
    for (const task of tasks) {
      const due = task.dueAt ? ` (due ${task.dueAt})` : "";
      const next = task.nextAction ? ` -> ${task.nextAction}` : "";
      lines.push(`- [${task.status}] ${task.title}${due}${next}`);
    }
  }

  return lines.join("\n").trim();
}
