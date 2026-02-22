import { describe, expect, it } from "vitest";
import { buildModelOverride, chooseModelLane, estimatePromptComplexity } from "./token-optimization.js";

describe("surap-personal-ai token optimization", () => {
  it("scores simple prompts lower than planning prompts", () => {
    const simple = estimatePromptComplexity("สรุปให้หน่อย");
    const complex = estimatePromptComplexity(
      "ช่วยออกแบบ architecture และวางแผน implementation พร้อม task list, timeline, test strategy 1. phase one 2. phase two",
    );
    expect(complex).toBeGreaterThan(simple);
  });

  it("routes to large model on force keyword", () => {
    const decision = chooseModelLane(
      "ช่วยวางแผนงานทั้งระบบ",
      {
        complexityThreshold: 9,
        forceLargeKeywords: ["วางแผน"],
        small: { provider: "openai", model: "gpt-small" },
        large: { provider: "openai", model: "gpt-large" },
      },
    );
    expect(decision.lane).toBe("large");
    expect(decision.reason).toBe("force_large_keyword");
  });

  it("builds overrides from selected lane", () => {
    const override = buildModelOverride("small", {
      complexityThreshold: 8,
      forceLargeKeywords: [],
      small: { provider: "openai", model: "gpt-small" },
      large: { provider: "openai", model: "gpt-large" },
    });
    expect(override).toEqual({
      providerOverride: "openai",
      modelOverride: "gpt-small",
    });
  });
});
