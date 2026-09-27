import { describe, expect, it } from "vitest";
import { findPath, simulateFailure } from "./simulation";

describe("Astore demo network simulation", () => {
  it("recalculates a real alternative route after a road blockage", () => {
    const result = simulateFailure("c4");
    expect(result).not.toBeNull();
    expect(result?.affectedNodeIds).toEqual([]);
    expect(result?.alternativePath).toEqual({
      nodeIds: ["community-b", "community-a", "community-c"],
      edgeIds: ["c3", "c5"],
    });
    expect(result?.severity).toBe("MODERATE");
  });

  it("finds a disconnection cascade from the landslide scenario", () => {
    const result = simulateFailure("c6");
    expect(result?.unreachableNodeIds).toEqual(["community-d", "business-b", "tourism-b"]);
    expect(result?.affectedByType).toEqual({
      COMMUNITY: ["community-d"],
      ESSENTIAL_SERVICE: [],
      BUSINESS: ["business-b"],
      TOURISM: ["tourism-b"],
    });
    expect(result?.alternativePath).toBeNull();
    expect(result?.severity).toBe("HIGH");
    expect(result?.businessImpacts.find((impact) => impact.nodeId === "business-b")).toMatchObject({ severity: "HIGH", hasAlternative: false });
  });

  it("retains an alternate path for the simulated crossing and flood scenarios", () => {
    expect(simulateFailure("c1")?.alternativePath?.edgeIds.length).toBeGreaterThan(1);
    expect(simulateFailure("c5")?.alternativePath?.edgeIds).toEqual(["c3", "c4"]);
  });

  it("returns the same result on every run and handles a missing link", () => {
    expect(simulateFailure("c6")).toEqual(simulateFailure("c6"));
    expect(simulateFailure("not-a-connection")).toBeNull();
    expect(findPath("town", "town")).toEqual({ nodeIds: ["town"], edgeIds: [] });
  });
});
