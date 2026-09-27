import type { Express } from "express";
import type { AstoreRoadContextFeed, AstoreRoadWayFeature } from "../shared/roadContext";

const BOUNDS = { south: 35.3166152, west: 74.8169804, north: 35.3966152, east: 74.8969804 } as const;
const CACHE_MS = 7 * 24 * 60 * 60 * 1_000;
const RETRY_MS = 10 * 60 * 1_000;
const MAX_WAYS = 350;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const QUERY = `[out:json][timeout:25][maxsize:30000000];way(${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east})[highway];out geom ${MAX_WAYS};`;

type OverpassWay = {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
  geometry?: { lat?: number; lon?: number }[];
};
type OverpassResponse = { elements?: OverpassWay[]; osm3s?: { timestamp_osm_base?: string } };

export function normalizeAstoreRoadWays(elements: OverpassWay[]): AstoreRoadWayFeature[] {
  const seen = new Set<number>();
  const features: AstoreRoadWayFeature[] = [];
  for (const element of elements) {
    const id = element.id;
    const highway = element.tags?.highway;
    const geometry = element.geometry;
    if (element.type !== "way" || !Number.isSafeInteger(id) || id! <= 0 || seen.has(id!)) continue;
    if (!highway || !Array.isArray(geometry) || geometry.length < 2 || geometry.length > 5_000) continue;
    if (!geometry.every((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat) && point.lon! >= -180 && point.lon! <= 180 && point.lat! >= -90 && point.lat! <= 90)) continue;
    seen.add(id!);
    features.push({
      type: "Feature",
      id: `way/${id}`,
      geometry: { type: "LineString", coordinates: geometry.map((point) => [point.lon!, point.lat!] as [number, number]) },
      properties: {
        osmType: "way",
        osmId: id!,
        highway,
        name: element.tags?.name?.trim() || null,
        osmUrl: `https://www.openstreetmap.org/way/${id}`,
      },
    });
    if (features.length >= MAX_WAYS) break;
  }
  return features;
}

function toFeed(features: AstoreRoadWayFeature[], details: Pick<AstoreRoadContextFeed, "status" | "fetchedAt" | "osmDataTimestamp" | "checkedAt" | "freshUntil">): AstoreRoadContextFeed {
  return { provider: "OpenStreetMap", license: "ODbL-1.0", attribution: "© OpenStreetMap contributors", queryBounds: BOUNDS, features, ...details, wayFeatureCount: features.length };
}

let cachedFeed: AstoreRoadContextFeed | null = null;
let inFlight: Promise<AstoreRoadContextFeed> | null = null;
let lastAttemptAt = 0;

export async function getAstoreRoadContext(options: { now?: number; fetcher?: typeof fetch } = {}): Promise<AstoreRoadContextFeed> {
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  if (cachedFeed?.freshUntil && Date.parse(cachedFeed.freshUntil) > now) return { ...cachedFeed, status: "cached" };
  if (inFlight) return inFlight;
  if (lastAttemptAt && now - lastAttemptAt < RETRY_MS) {
    if (cachedFeed) return { ...cachedFeed, status: "stale" };
    throw new Error("A recent OSM road query failed; retry later.");
  }
  lastAttemptAt = now;
  inFlight = (async () => {
    try {
      const response = await fetcher(OVERPASS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "AstoreLifeline/1.0 (on-demand, cached community map context; https://www.openstreetmap.org/copyright)",
        },
        body: new URLSearchParams({ data: QUERY }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      const payload = await response.json() as OverpassResponse;
      if (!Array.isArray(payload.elements)) throw new Error("Overpass returned no road geometry list");
      const features = normalizeAstoreRoadWays(payload.elements);
      const fetchedAt = new Date(now).toISOString();
      cachedFeed = toFeed(features, {
        status: "fresh", fetchedAt, osmDataTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
        checkedAt: fetchedAt, freshUntil: new Date(now + CACHE_MS).toISOString(),
      });
      return cachedFeed;
    } catch (error) {
      console.warn("[Astore roads] Optional OSM road context refresh failed.", error instanceof Error ? error.message : "unknown upstream error");
      if (!cachedFeed) throw error;
      const checkedAt = new Date(now).toISOString();
      cachedFeed = { ...cachedFeed, status: "stale", checkedAt };
      return cachedFeed;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function resetAstoreRoadContextCacheForTests() {
  cachedFeed = null;
  inFlight = null;
  lastAttemptAt = 0;
}

export function registerAstoreRoadContextEndpoint(app: Express, loadFeed: () => Promise<AstoreRoadContextFeed> = () => getAstoreRoadContext()) {
  app.get("/api/local-places/astore/roads", async (_request, response) => {
    try {
      const feed = await loadFeed();
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.json(feed);
    } catch {
      response.status(503).json({ error: "Optional community-mapped road geometry is temporarily unavailable." });
    }
  });
}
