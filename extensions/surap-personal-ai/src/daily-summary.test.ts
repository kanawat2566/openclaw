import { describe, expect, it } from "vitest";
import { buildDailySummaryText } from "./daily-summary.js";

describe("buildDailySummaryText", () => {
  it("builds deterministic summary payload", () => {
    const result = buildDailySummaryText({
      date: "2026-02-22",
      tasks: [
        {
          id: "t1",
          title: "Write tests",
          status: "open",
          createdAt: 1,
          updatedAt: 1,
          nextAction: "Add integration cases",
        },
      ],
      preferences: [
        {
          id: "p1",
          key: "response.style",
          value: "concise",
          confidence: 0.8,
          importance: 0.9,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    expect(result.date).toBe("2026-02-22");
    expect(result.content).toContain("Write tests");
    expect(result.content).toContain("response.style");
  });
});
