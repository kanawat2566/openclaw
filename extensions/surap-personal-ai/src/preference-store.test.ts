import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PreferenceStore } from "./preference-store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeStore(): Promise<PreferenceStore> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-pref-"));
  tempDirs.push(dir);
  return new PreferenceStore(path.join(dir, "preferences.json"));
}

describe("PreferenceStore", () => {
  it("deduplicates same key/value and updates metadata", async () => {
    const store = await makeStore();
    const first = await store.upsert({
      key: "response.style",
      value: "ตอบสั้น",
      confidence: 0.6,
      importance: 0.7,
    });
    const second = await store.upsert({
      key: "response.style",
      value: "ตอบสั้น",
      confidence: 0.9,
      importance: 0.8,
      tags: ["manual"],
    });
    expect(second.id).toBe(first.id);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
