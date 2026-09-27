import type { AstorePlacesFeed, LocalPlace, LocalPlaceGroup } from "../../../shared/localPlaces";

export type PlacePin = Pick<LocalPlace, "osmType" | "osmId" | "name" | "category" | "group" | "latitude" | "longitude" | "distanceKm" | "osmUrl"> & {
  key: string;
  color: string;
};

const groupColors: Record<LocalPlaceGroup, string> = {
  BANKING: "#e2a879",
  ACCOMMODATION: "#a7c6a8",
  SHOPPING: "#ddc298",
  FOOD: "#d89370",
  SERVICES: "#94b8bd",
};

/** Keep exact coordinates, discard malformed records, and return nearest places first. */
export function makePlacePins(places: readonly LocalPlace[]): PlacePin[] {
  return places
    .filter((place) =>
      Number.isFinite(place.latitude) && place.latitude >= -90 && place.latitude <= 90 &&
      Number.isFinite(place.longitude) && place.longitude >= -180 && place.longitude <= 180 &&
      Number.isFinite(place.distanceKm) && place.name.trim().length > 0 &&
      /^https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+$/.test(place.osmUrl),
    )
    .map((place) => ({ ...place, key: `${place.osmType}/${place.osmId}`, color: groupColors[place.group] }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
}

/** Export an honest point dataset with machine-readable provenance. */
export function serializePlacesGeoJSON(pins: readonly PlacePin[], feed: AstorePlacesFeed): string {
  return JSON.stringify({
    type: "FeatureCollection",
    name: "Astore community-mapped places",
    attribution: feed.attribution,
    license: feed.license,
    provider: feed.provider,
    fetchedAt: feed.fetchedAt,
    osmDataTimestamp: feed.osmDataTimestamp,
    feedStatus: feed.status,
    center: feed.center,
    radiusMeters: feed.radiusMeters,
    verification: "Community-mapped; not independently verified. No listing confirms current operation, access or safety.",
    features: pins.map((pin) => ({
      type: "Feature",
      id: pin.key,
      geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] },
      properties: {
        osmType: pin.osmType,
        osmId: pin.osmId,
        name: pin.name,
        category: pin.category,
        group: pin.group,
        distanceFromAstoreTownKm: pin.distanceKm,
        openStreetMapUrl: pin.osmUrl,
      },
    })),
  }, null, 2);
}
