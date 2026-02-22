import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TaskStore } from "./task-store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeStore(): Promise<TaskStore> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-task-"));
  tempDirs.push(dir);
  return new TaskStore(path.join(dir, "tasks.json"));
}

describe("TaskStore", () => {
  it("creates updates and filters active tasks", async () => {
    const store = await makeStore();
    const a = await store.create({ title: "Task A", dueAt: "2026-02-23" });
    const b = await store.create({ title: "Task B" });
    await store.update(b.id, { status: "done" });
    const active = await store.active(10);
    expect(active.map((t) => t.id)).toEqual([a.id]);
  });
});
