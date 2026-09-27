import { describe, expect, it } from "vitest";
import { astoreCensusContext } from "./censusContext";

describe("Astore Census context", () => {
  it("keeps the official district totals and source attribution explicit", () => {
    expect(astoreCensusContext).toMatchObject({
      unit: "Astore District",
      censusYear: 2023,
      population: 111573,
      previousCensusYear: 2017,
      previousCensusPopulation: 95416,
      reportTitle: "Gilgit-Baltistan at a Glance 2025",
    });
    expect(astoreCensusContext.reportUrl).toMatch(/^https:\/\/www\.pnd\.gog\.pk\//);
    expect(astoreCensusContext.censusReportUrl).toMatch(/^https:\/\/www\.pbs\.gov\.pk\//);
    expect(astoreCensusContext.limitations).toContain("not settlement-level");
    expect(astoreCensusContext.limitations).toContain("not inputs");
  });
});
