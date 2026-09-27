export const mainValleyRoadReference = {
  title: "Main Valley Road",
  state: "FAILED",
  affected: {
    communities: 4,
    essentialAccessPoints: 2,
    businessZones: 1,
    tourismPoints: 2,
  },
  cascadeDepthHops: 3,
  alternativeRoute: {
    name: "Southern Connector",
    status: "AVAILABLE",
  },
  impact: "CRITICAL",
  provenance: "User-supplied example values",
  calculatedFromDemoGraph: false,
} as const;
