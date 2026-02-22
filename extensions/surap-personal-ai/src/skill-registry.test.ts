import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SkillRegistryStore } from "./skill-registry.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeStore(): Promise<SkillRegistryStore> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-skill-reg-"));
  tempDirs.push(dir);
  return new SkillRegistryStore(path.join(dir, "skills.json"));
}

describe("SkillRegistryStore", () => {
  it("supports lifecycle transitions and enabled resolution", async () => {
    const store = await makeStore();
    await store.upsert({ id: "task_planner", version: "0.1.0", status: "draft" });
    await store.transition("task_planner", "0.1.0", "testing");
    await store.transition("task_planner", "0.1.0", "enabled");
    await store.upsert({ id: "task_planner", version: "0.2.0", status: "testing" });
    const enabled = await store.resolveEnabled("task_planner");
    expect(enabled?.version).toBe("0.1.0");
  });

  it("rejects invalid transitions", async () => {
    const store = await makeStore();
    await store.upsert({ id: "daily_summary", version: "0.1.0", status: "draft" });
    await expect(store.transition("daily_summary", "0.1.0", "enabled")).rejects.toThrow(
      "Invalid skill transition",
    );
  });
});
