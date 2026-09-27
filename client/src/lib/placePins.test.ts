import { describe, expect, it } from "vitest";
import type { AstorePlacesFeed, LocalPlace } from "../../../shared/localPlaces";
import { makePlacePins, serializePlacesGeoJSON } from "./placePins";

function place(overrides: Partial<LocalPlace> = {}): LocalPlace {
  return {
    osmType: "node",
    osmId: 11,
    name: "Example place",
    category: "Bank",
    group: "BANKING",
    latitude: 35.35,
    longitude: 74.85,
    distanceKm: 1.2,
    osmUrl: "https://www.openstreetmap.org/node/11",
    ...overrides,
  };
}

const feed: AstorePlacesFeed = {
  provider: "OpenStreetMap",
  license: "ODbL-1.0",
  attribution: "© OpenStreetMap contributors",
  center: { latitude: 35.3566152, longitude: 74.8569804, name: "Astore Town" },
  radiusMeters: 5000,
  places: [place()],
  status: "fresh",
  fetchedAt: "2026-09-27T01:54:17.000Z",
  osmDataTimestamp: "2026-09-27T01:40:00Z",
  checkedAt: "2026-09-27T01:54:17.000Z",
  freshUntil: "2026-09-28T01:54:17.000Z",
};

describe("real OSM map pins", () => {
  it("preserves coordinates and creates stable keys", () => {
    const [pin] = makePlacePins([place()]);
    expect(pin).toMatchObject({ key: "node/11", latitude: 35.35, longitude: 74.85, color: "#e2a879" });
  });

  it("sorts by distance then name and assigns distinct group colors", () => {
    const pins = makePlacePins([
      place({ osmId: 3, name: "B", distanceKm: 1.1, osmUrl: "https://www.openstreetmap.org/node/3" }),
      place({ osmId: 2, name: "C", distanceKm: 1.4, group: "FOOD", osmUrl: "https://www.openstreetmap.org/node/2" }),
      place({ osmId: 1, name: "A", distanceKm: 1.1, group: "SERVICES", osmUrl: "https://www.openstreetmap.org/node/1" }),
    ]);
    expect(pins.map((pin) => pin.key)).toEqual(["node/1", "node/3", "node/2"]);
    expect(new Set(pins.map((pin) => pin.color)).size).toBe(3);
  });

  it("rejects malformed coordinates, distances, names and non-OSM links", () => {
    expect(makePlacePins([
      place({ latitude: Number.NaN, osmId: 1, osmUrl: "https://www.openstreetmap.org/node/1" }),
      place({ longitude: 181, osmId: 2, osmUrl: "https://www.openstreetmap.org/node/2" }),
      place({ distanceKm: Number.NaN, osmId: 3, osmUrl: "https://www.openstreetmap.org/node/3" }),
      place({ name: "  ", osmId: 4, osmUrl: "https://www.openstreetmap.org/node/4" }),
      place({ osmUrl: "javascript:alert(1)" }),
    ])).toEqual([]);
  });

  it("exports GeoJSON in longitude/latitude order with licensing and freshness metadata", () => {
    const exported = JSON.parse(serializePlacesGeoJSON(makePlacePins([place()]), feed));
    expect(exported).toMatchObject({
      type: "FeatureCollection",
      provider: "OpenStreetMap",
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      osmDataTimestamp: "2026-09-27T01:40:00Z",
      feedStatus: "fresh",
      center: feed.center,
      radiusMeters: 5000,
    });
    expect(exported.verification).toContain("not independently verified");
    expect(exported.features[0]).toMatchObject({
      id: "node/11",
      geometry: { type: "Point", coordinates: [74.85, 35.35] },
      properties: { openStreetMapUrl: "https://www.openstreetmap.org/node/11" },
    });
  });
});
