import { readJsonFile, writeJsonFileAtomic } from "./json-store.js";
import type { PreferenceMemoryItem } from "./types.js";

type PreferenceStoreShape = {
  items: PreferenceMemoryItem[];
};

const EMPTY_STORE: PreferenceStoreShape = { items: [] };

export class PreferenceStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<PreferenceMemoryItem[]> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    return data.items;
  }

  async upsert(params: {
    key: string;
    value: string;
    source?: string;
    importance?: number;
    confidence?: number;
    tags?: string[];
  }): Promise<PreferenceMemoryItem> {
    const now = Date.now();
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const keyNorm = params.key.trim().toLowerCase();
    const valueNorm = params.value.trim();
    const existing = data.items.find(
      (item) => item.key.trim().toLowerCase() === keyNorm && item.value.trim() === valueNorm,
    );
    if (existing) {
      existing.updatedAt = now;
      existing.lastUsedAt = now;
      existing.importance = Math.max(existing.importance, params.importance ?? existing.importance);
      existing.confidence = Math.max(existing.confidence, params.confidence ?? existing.confidence);
      if (params.tags?.length) {
        const merged = new Set([...(existing.tags ?? []), ...params.tags]);
        existing.tags = Array.from(merged);
      }
      await writeJsonFileAtomic(this.filePath, data);
      return existing;
    }

    const created: PreferenceMemoryItem = {
      id: `pref_${now}_${Math.random().toString(36).slice(2, 8)}`,
      key: params.key,
      value: params.value,
      source: params.source,
      tags: params.tags,
      importance: clamp01(params.importance ?? 0.5),
      confidence: clamp01(params.confidence ?? 0.6),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    data.items.push(created);
    await writeJsonFileAtomic(this.filePath, data);
    return created;
  }

  async topRelevant(limit: number): Promise<PreferenceMemoryItem[]> {
    const items = await this.list();
    return [...items]
      .sort((a, b) => {
        const scoreA = a.importance * 0.6 + a.confidence * 0.4;
        const scoreB = b.importance * 0.6 + b.confidence * 0.4;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      })
      .slice(0, Math.max(0, limit));
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
