import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSurapPersonalAiService } from "./service.js";
import { resolvePersonalAiPaths } from "./state-paths.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function logger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

describe("surap-personal-ai service integration", () => {
  it("initializes state and auto-generates daily summary on startup when enabled", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "surap-service-it-"));
    tempDirs.push(stateDir);

    const api = {
      pluginConfig: {
        dailySummary: {
          auto: { enabled: true, intervalMs: 60_000 },
        },
      },
      logger: logger(),
      runtime: {},
    } as never;

    const service = createSurapPersonalAiService(api);
    await service.start?.({
      config: {} as never,
      workspaceDir: undefined,
      stateDir,
      logger: logger(),
    });

    const paths = resolvePersonalAiPaths(stateDir);
    const raw = await fs.readFile(paths.dailySummariesFile, "utf8");
    const parsed = JSON.parse(raw) as { items: Array<{ date: string; content: string }> };
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.items[0]?.content).toContain("Daily summary for");

    await service.stop?.({
      config: {} as never,
      workspaceDir: undefined,
      stateDir,
      logger: logger(),
    } as never);
  });
});
