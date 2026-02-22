import path from "node:path";

export type PersonalAiPaths = {
  rootDir: string;
  preferencesFile: string;
  tasksFile: string;
  dailySummariesFile: string;
  skillRegistryFile: string;
  metricsFile: string;
};

export function resolvePersonalAiPaths(stateDir: string): PersonalAiPaths {
  const rootDir = path.join(stateDir, "plugins", "surap-personal-ai");
  return {
    rootDir,
    preferencesFile: path.join(rootDir, "preferences.json"),
    tasksFile: path.join(rootDir, "tasks.json"),
    dailySummariesFile: path.join(rootDir, "daily-summaries.json"),
    skillRegistryFile: path.join(rootDir, "skills.json"),
    metricsFile: path.join(rootDir, "metrics.jsonl"),
  };
}
