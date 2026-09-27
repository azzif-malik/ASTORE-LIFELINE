export type RoadFeedStatus = "fresh" | "cached" | "stale";

export interface AstoreRoadWayFeature {
  type: "Feature";
  id: string;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    osmType: "way";
    osmId: number;
    highway: string;
    name: string | null;
    osmUrl: string;
  };
}

export interface AstoreRoadContextFeed {
  provider: "OpenStreetMap";
  license: "ODbL-1.0";
  attribution: "© OpenStreetMap contributors";
  queryBounds: { south: number; west: number; north: number; east: number };
  features: AstoreRoadWayFeature[];
  status: RoadFeedStatus;
  fetchedAt: string;
  osmDataTimestamp: string | null;
  checkedAt: string | null;
  freshUntil: string | null;
  /** This number is mapped OpenStreetMap way features, not unique or verified physical roads. */
  wayFeatureCount: number;
}
