import { describe, expect, it } from "vitest";
import { mainValleyRoadReference } from "./referenceScenario";

describe("Main Valley Road reference scenario", () => {
  it("preserves the user's supplied example figures as a reference, not as calculated graph output", () => {
    expect(mainValleyRoadReference).toMatchObject({
      title: "Main Valley Road",
      state: "FAILED",
      affected: { communities: 4, essentialAccessPoints: 2, businessZones: 1, tourismPoints: 2 },
      cascadeDepthHops: 3,
      alternativeRoute: { name: "Southern Connector", status: "AVAILABLE" },
      impact: "CRITICAL",
      calculatedFromDemoGraph: false,
    });
    expect(mainValleyRoadReference.provenance).toBe("User-supplied example values");
    expect(mainValleyRoadReference).not.toHaveProperty("connectionId");
  });
});
