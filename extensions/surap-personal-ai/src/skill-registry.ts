import { readJsonFile, writeJsonFileAtomic } from "./json-store.js";
import type { SkillLifecycle, SkillRegistryItem } from "./types.js";

type SkillStoreShape = {
  items: SkillRegistryItem[];
};

const EMPTY_STORE: SkillStoreShape = { items: [] };

const ALLOWED_TRANSITIONS: Record<SkillLifecycle, SkillLifecycle[]> = {
  draft: ["testing", "deprecated"],
  testing: ["enabled", "deprecated", "draft"],
  enabled: ["deprecated", "testing"],
  deprecated: ["testing"],
};

export class SkillRegistryStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<SkillRegistryItem[]> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    return data.items;
  }

  async upsert(input: {
    id: string;
    version: string;
    status: SkillLifecycle;
    description?: string;
    permissions?: SkillRegistryItem["permissions"];
  }): Promise<SkillRegistryItem> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const now = Date.now();
    const existing = data.items.find((x) => x.id === input.id && x.version === input.version);
    if (existing) {
      existing.description = input.description ?? existing.description;
      existing.permissions = input.permissions ?? existing.permissions;
      existing.status = input.status;
      existing.updatedAt = now;
      await writeJsonFileAtomic(this.filePath, data);
      return existing;
    }
    const created: SkillRegistryItem = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    data.items.push(created);
    await writeJsonFileAtomic(this.filePath, data);
    return created;
  }

  async transition(id: string, version: string, next: SkillLifecycle): Promise<SkillRegistryItem> {
    const data = await readJsonFile(this.filePath, EMPTY_STORE);
    const item = data.items.find((x) => x.id === id && x.version === version);
    if (!item) {
      throw new Error(`Skill not found: ${id}@${version}`);
    }
    const allowed = ALLOWED_TRANSITIONS[item.status] ?? [];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid skill transition: ${item.status} -> ${next}`);
    }
    item.status = next;
    item.updatedAt = Date.now();
    await writeJsonFileAtomic(this.filePath, data);
    return item;
  }

  async resolveEnabled(id: string): Promise<SkillRegistryItem | null> {
    const items = await this.list();
    const enabled = items.filter((x) => x.id === id && x.status === "enabled");
    if (enabled.length === 0) {
      return null;
    }
    return [...enabled].sort((a, b) => compareSemverDesc(a.version, b.version))[0] ?? null;
  }
}

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) {
      return bv - av;
    }
  }
  return 0;
}
