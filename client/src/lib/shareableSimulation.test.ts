import { describe, expect, it } from "vitest";
import { buildScenarioShareUrl, readSharedSimulation } from "./shareableSimulation";

const validIds = ["c1", "c4", "c5", "c6"];

describe("shareable simulation links", () => {
  it("opens the selected valid edge as an active deterministic failure", () => {
    expect(readSharedSimulation("?fail=c1", "c6", validIds)).toEqual({ selectedConnectionId: "c1", activeFailureId: "c1" });
  });

  it("ignores missing, malformed and unknown edge IDs", () => {
    expect(readSharedSimulation("", "c6", validIds)).toEqual({ selectedConnectionId: "c6", activeFailureId: null });
    expect(readSharedSimulation("?fail=../../network", "c6", validIds)).toEqual({ selectedConnectionId: "c6", activeFailureId: null });
    expect(readSharedSimulation("?fail=not-a-link", "c6", validIds)).toEqual({ selectedConnectionId: "c6", activeFailureId: null });
  });

  it("builds a reproducible clean network deep link", () => {
    expect(buildScenarioShareUrl("https://demo.example", "c6")).toBe("https://demo.example/network?fail=c6");
  });
});
