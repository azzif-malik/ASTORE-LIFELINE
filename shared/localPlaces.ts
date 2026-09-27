export type LocalPlaceGroup = "BANKING" | "ACCOMMODATION" | "SHOPPING" | "FOOD" | "SERVICES";
export type PlaceFeedStatus = "fresh" | "cached" | "stale" | "snapshot";

export interface LocalPlace {
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string;
  category: string;
  group: LocalPlaceGroup;
  latitude: number;
  longitude: number;
  distanceKm: number;
  osmUrl: string;
}

export interface AstorePlacesFeed {
  provider: "OpenStreetMap";
  license: "ODbL-1.0";
  attribution: "© OpenStreetMap contributors";
  center: { latitude: number; longitude: number; name: "Astore Town" };
  radiusMeters: 5000;
  places: LocalPlace[];
  status: PlaceFeedStatus;
  /** When the response was last read from Overpass, or the original fallback snapshot capture time. */
  fetchedAt: string;
  /** Timestamp of the OpenStreetMap database snapshot used by Overpass, when supplied. */
  osmDataTimestamp: string | null;
  /** When an unsuccessful upstream refresh was last attempted. */
  checkedAt: string | null;
  /** The latest time at which the successful upstream response is treated as fresh. */
  freshUntil: string | null;
}
