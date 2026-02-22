import { readJsonFile, writeJsonFileAtomic } from "./json-store.js";
import type { TaskItem } from "./types.js";

type TaskStoreShape = {
  items: TaskItem[];
};

const EMPTY_STORE: TaskStoreShape = { items: [] };

export class TaskStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<TaskItem[]> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    return data.items;
  }

  async create(input: {
    title: string;
    dueAt?: string;
    nextAction?: string;
    tags?: string[];
  }): Promise<TaskItem> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const now = Date.now();
    const item: TaskItem = {
      id: `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: input.title.trim(),
      dueAt: input.dueAt,
      nextAction: input.nextAction,
      tags: input.tags,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    data.items.push(item);
    await writeJsonFileAtomic(this.filePath, data);
    return item;
  }

  async update(
    id: string,
    patch: Partial<Pick<TaskItem, "title" | "dueAt" | "nextAction" | "tags" | "status">>,
  ): Promise<TaskItem | null> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const item = data.items.find((x) => x.id === id);
    if (!item) {
      return null;
    }
    if (patch.title !== undefined) {
      item.title = patch.title;
    }
    if (patch.dueAt !== undefined) {
      item.dueAt = patch.dueAt;
    }
    if (patch.nextAction !== undefined) {
      item.nextAction = patch.nextAction;
    }
    if (patch.tags !== undefined) {
      item.tags = patch.tags;
    }
    if (patch.status !== undefined) {
      item.status = patch.status;
    }
    item.updatedAt = Date.now();
    await writeJsonFileAtomic(this.filePath, data);
    return item;
  }

  async active(limit: number): Promise<TaskItem[]> {
    const items = await this.list();
    return items
      .filter((item) => item.status === "open" || item.status === "in_progress")
      .sort((a, b) => {
        if (a.dueAt && b.dueAt) {
          return a.dueAt.localeCompare(b.dueAt);
        }
        if (a.dueAt) {
          return -1;
        }
        if (b.dueAt) {
          return 1;
        }
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, Math.max(0, limit));
  }
}
