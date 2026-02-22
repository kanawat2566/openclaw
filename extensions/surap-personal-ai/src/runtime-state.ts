import type { MetricsWriter } from "./metrics.js";
import type { PreferenceStore } from "./preference-store.js";
import type { SkillRegistryStore } from "./skill-registry.js";
import type { TaskStore } from "./task-store.js";

export type PersonalAiRuntimeState = {
  initializedAt: number;
  channelHints: Map<string, string>;
  stores: {
    preferences: PreferenceStore;
    tasks: TaskStore;
    skills: SkillRegistryStore;
  };
  metrics: MetricsWriter;
};

let state: PersonalAiRuntimeState | null = null;

export function setPersonalAiRuntimeState(next: PersonalAiRuntimeState): void {
  state = next;
}

export function getPersonalAiRuntimeState(): PersonalAiRuntimeState | null {
  return state;
}

export function clearPersonalAiRuntimeState(): void {
  state = null;
}
