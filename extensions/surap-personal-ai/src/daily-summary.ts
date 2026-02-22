import type { PreferenceMemoryItem, TaskItem } from "./types.js";

function currentDateUtcString(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function buildDailySummaryText(params: {
  date?: string;
  tasks: TaskItem[];
  preferences: PreferenceMemoryItem[];
}): {
  date: string;
  content: string;
  taskIds: string[];
  preferenceIds: string[];
} {
  const date = params.date ?? currentDateUtcString(Date.now());
  const activeTasks = params.tasks.filter((t) => t.status === "open" || t.status === "in_progress");
  const doneTasks = params.tasks.filter((t) => t.status === "done");
  const topPrefs = params.preferences.slice(0, 5);

  const lines: string[] = [];
  lines.push(`Daily summary for ${date}`);
  lines.push("");
  lines.push(`Tasks: ${params.tasks.length} total (${activeTasks.length} active, ${doneTasks.length} done)`);
  if (activeTasks.length > 0) {
    lines.push("Active priorities:");
    for (const task of activeTasks.slice(0, 5)) {
      lines.push(`- ${task.title}${task.nextAction ? ` -> ${task.nextAction}` : ""}`);
    }
  }
  if (topPrefs.length > 0) {
    lines.push("Known preferences:");
    for (const pref of topPrefs) {
      lines.push(`- ${pref.key}: ${pref.value}`);
    }
  }

  return {
    date,
    content: lines.join("\n").trim(),
    taskIds: params.tasks.map((t) => t.id),
    preferenceIds: topPrefs.map((p) => p.id),
  };
}
