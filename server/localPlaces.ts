import type { Express } from "express";
import type { AstorePlacesFeed, LocalPlace, LocalPlaceGroup } from "../shared/localPlaces";

const CENTER = { latitude: 35.3566152, longitude: 74.8569804, name: "Astore Town" as const };
const RADIUS_METERS = 5_000;
const CACHE_MS = 24 * 60 * 60 * 1_000;
const RETRY_MS = 10 * 60 * 1_000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_QUERY = `[out:json][timeout:15][maxsize:20000000];(nwr(around:${RADIUS_METERS},${CENTER.latitude},${CENTER.longitude})["name"]["shop"];nwr(around:${RADIUS_METERS},${CENTER.latitude},${CENTER.longitude})["name"]["craft"];nwr(around:${RADIUS_METERS},${CENTER.latitude},${CENTER.longitude})["name"]["amenity"~"^(marketplace|cafe|restaurant|bank|pharmacy|fuel|post_office|clinic|hospital)$"];nwr(around:${RADIUS_METERS},${CENTER.latitude},${CENTER.longitude})["name"]["tourism"~"^(hotel|guest_house|hostel|motel)$"];);out center tags 80;`;

// This last-resort seed is precisely the set of four named business records returned by
// the successful 5-km Overpass query run on 2026-09-27 at 01:54:17Z. It is always labeled a snapshot.
const verifiedSeed = [
  { osmType: "node", osmId: 3531036979, name: "PTDC Motel", category: "Motel", group: "ACCOMMODATION", latitude: 35.3549921, longitude: 74.806771 },
  { osmType: "node", osmId: 3531039698, name: "Forest Rest House", category: "Hotel / guest accommodation", group: "ACCOMMODATION", latitude: 35.3584731, longitude: 74.8092441 },
  { osmType: "node", osmId: 9772914720, name: "Allied bank (no ATM)", category: "Bank · ATM not mapped", group: "BANKING", latitude: 35.3561563, longitude: 74.8637641 },
  { osmType: "node", osmId: 9772918319, name: "بینک آف پنجاب", category: "Bank", group: "BANKING", latitude: 35.3549285, longitude: 74.85935 },
] as const;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};
type OverpassResponse = { elements?: OverpassElement[]; osm3s?: { timestamp_osm_base?: string } };

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function categorize(tags: Record<string, string>): { group: LocalPlaceGroup; category: string } {
  if (tags.amenity === "bank") return { group: "BANKING", category: tags.name?.toLowerCase().includes("no atm") ? "Bank · ATM not mapped" : "Bank" };
  if (tags.amenity === "fuel") return { group: "SERVICES", category: "Fuel" };
  if (tags.tourism) return { group: "ACCOMMODATION", category: tags.tourism.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()) };
  if (tags.shop) return { group: "SHOPPING", category: `${tags.shop.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())} shop` };
  if (["cafe", "restaurant"].includes(tags.amenity ?? "")) return { group: "FOOD", category: tags.amenity === "cafe" ? "Café" : "Restaurant" };
  if (["clinic", "hospital", "pharmacy"].includes(tags.amenity ?? "")) return { group: "SERVICES", category: tags.amenity.replace(/^./, (letter) => letter.toUpperCase()) };
  if (tags.amenity === "post_office") return { group: "SERVICES", category: "Post office" };
  if (tags.amenity === "marketplace") return { group: "SHOPPING", category: "Marketplace" };
  return { group: "SERVICES", category: tags.craft ? `${tags.craft.replaceAll("_", " ")} service` : "Local business" };
}

export function normalizeOverpassPlaces(records: OverpassElement[]): LocalPlace[] {
  const deduped = new Map<string, LocalPlace>();
  for (const element of records) {
    const tags = element.tags;
    const name = tags?.name?.trim();
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!name || !latitude || !longitude || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !tags || latitude < 34 || latitude > 37 || longitude < 73 || longitude > 77) continue;
    const { group, category } = categorize(tags);
    const osmUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
    deduped.set(`${element.type}/${element.id}`, {
      osmType: element.type,
      osmId: element.id,
      name,
      category,
      group,
      latitude,
      longitude,
      distanceKm: Number(distanceKm(CENTER.latitude, CENTER.longitude, latitude, longitude).toFixed(1)),
      osmUrl,
    });
  }
  return Array.from(deduped.values()).sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
}

function seedFeed(): AstorePlacesFeed {
  const fetchedAt = "2026-09-27T01:54:17.000Z";
  const places = verifiedSeed.map((place) => ({
    ...place,
    osmType: place.osmType as LocalPlace["osmType"],
    group: place.group as LocalPlaceGroup,
    distanceKm: Number(distanceKm(CENTER.latitude, CENTER.longitude, place.latitude, place.longitude).toFixed(1)),
    osmUrl: `https://www.openstreetmap.org/node/${place.osmId}`,
  }));
  return { provider: "OpenStreetMap", license: "ODbL-1.0", attribution: "© OpenStreetMap contributors", center: CENTER, radiusMeters: RADIUS_METERS, places, status: "snapshot", fetchedAt, osmDataTimestamp: null, checkedAt: null, freshUntil: null };
}

let cachedFeed: AstorePlacesFeed | null = null;
let inFlight: Promise<AstorePlacesFeed> | null = null;
let lastAttemptAt = 0;

export async function getAstorePlaces(options: { now?: number; fetcher?: typeof fetch } = {}): Promise<AstorePlacesFeed> {
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  if (cachedFeed?.freshUntil && Date.parse(cachedFeed.freshUntil) > now) return { ...cachedFeed, status: "cached" };
  if (inFlight) return inFlight;
  if (lastAttemptAt && now - lastAttemptAt < RETRY_MS) return { ...(cachedFeed ?? seedFeed()), status: cachedFeed && cachedFeed.status !== "snapshot" ? "stale" : "snapshot" };

  lastAttemptAt = now;
  inFlight = (async () => {
    try {
      const response = await fetcher(OVERPASS_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8", "user-agent": "AstoreLifeline/1.0 (read-only community-place display; https://www.openstreetmap.org/copyright)" },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const payload = await response.json() as OverpassResponse;
      if (!Array.isArray(payload.elements)) throw new Error("Overpass returned no element list");
      const fetchedAt = new Date(now).toISOString();
      const feed: AstorePlacesFeed = {
        provider: "OpenStreetMap", license: "ODbL-1.0", attribution: "© OpenStreetMap contributors", center: CENTER,
        radiusMeters: RADIUS_METERS, places: normalizeOverpassPlaces(payload.elements), status: "fresh", fetchedAt,
        osmDataTimestamp: payload.osm3s?.timestamp_osm_base ?? null, checkedAt: fetchedAt,
        freshUntil: new Date(now + CACHE_MS).toISOString(),
      };
      cachedFeed = feed;
      return feed;
    } catch (error) {
      console.warn("[Local places] Overpass refresh failed; preserving last known records.", error instanceof Error ? error.message : "unknown upstream error");
      const snapshot = cachedFeed ?? seedFeed();
      return {
        ...snapshot,
        status: snapshot.status === "snapshot" ? "snapshot" : "stale",
        checkedAt: new Date(now).toISOString(),
      };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function resetAstorePlacesCacheForTests() {
  cachedFeed = null;
  inFlight = null;
  lastAttemptAt = 0;
}

export function registerAstorePlacesEndpoint(app: Express, loadFeed: () => Promise<AstorePlacesFeed> = () => getAstorePlaces()) {
  app.get("/api/local-places/astore", async (_request, response) => {
    try {
      const places = await loadFeed();
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.json(places);
    } catch {
      // The UI has explicit error and last-snapshot states; do not leak upstream details.
      response.status(503).json({ error: "Community place data is temporarily unavailable." });
    }
  });
}
