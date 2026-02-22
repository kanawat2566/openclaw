import { readJsonFile, writeJsonFileAtomic } from "./json-store.js";
import type { DailySummaryItem } from "./types.js";

type DailySummaryStoreShape = {
  items: DailySummaryItem[];
};

const EMPTY_STORE: DailySummaryStoreShape = { items: [] };

export class DailySummaryStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<DailySummaryItem[]> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    return data.items;
  }

  async upsertByDate(input: Omit<DailySummaryItem, "createdAt">): Promise<DailySummaryItem> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const existing = data.items.find((x) => x.date === input.date);
    if (existing) {
      existing.content = input.content;
      existing.taskIds = input.taskIds;
      existing.preferenceIds = input.preferenceIds;
      await writeJsonFileAtomic(this.filePath, data);
      return existing;
    }
    const created: DailySummaryItem = {
      ...input,
      createdAt: Date.now(),
    };
    data.items.push(created);
    data.items.sort((a, b) => b.date.localeCompare(a.date));
    await writeJsonFileAtomic(this.filePath, data);
    return created;
  }

  async getByDate(date: string): Promise<DailySummaryItem | null> {
    const items = await this.list();
    return items.find((x) => x.date === date) ?? null;
  }
}
