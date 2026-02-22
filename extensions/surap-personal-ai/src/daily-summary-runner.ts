import { buildDailySummaryText } from "./daily-summary.js";
import type { DailySummaryStore } from "./daily-summary-store.js";
import type { PreferenceStore } from "./preference-store.js";
import type { TaskStore } from "./task-store.js";

export async function generateAndPersistDailySummary(params: {
  date?: string;
  tasks: TaskStore;
  preferences: PreferenceStore;
  dailySummaries: DailySummaryStore;
}): Promise<{
  date: string;
  content: string;
  taskIds: string[];
  preferenceIds: string[];
}> {
  const [tasks, preferences] = await Promise.all([
    params.tasks.list(),
    params.preferences.topRelevant(10),
  ]);
  const summary = buildDailySummaryText({
    date: params.date,
    tasks,
    preferences,
  });
  await params.dailySummaries.upsertByDate(summary);
  return summary;
}
