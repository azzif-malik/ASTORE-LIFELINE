import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAstorePlaces, normalizeOverpassPlaces, registerAstorePlacesEndpoint, resetAstorePlacesCacheForTests } from "./localPlaces";
import type { AstorePlacesFeed } from "../shared/localPlaces";

const withTags = (id: number, name: string, latitude = 35.3562, longitude = 74.8637, more: Record<string, string> = {}) => ({
  type: "node" as const,
  id,
  lat: latitude,
  lon: longitude,
  tags: { name, amenity: "bank", ...more },
});

const okFetch = (records: unknown[], timestamp = "2026-09-27T00:00:00Z"): typeof fetch => vi.fn(async () => new Response(JSON.stringify({ elements: records, osm3s: { timestamp_osm_base: timestamp } }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

function feedPayload(feed: AstorePlacesFeed) {
  expect(feed.provider).toBe("OpenStreetMap");
  expect(feed.license).toBe("ODbL-1.0");
  expect(feed.attribution).toContain("OpenStreetMap contributors");
  return feed;
}

afterEach(() => resetAstorePlacesCacheForTests());

describe("Astore OpenStreetMap place feed", () => {
  it("normalizes nodes and way centers, classifies places, sorts by straight-line distance and excludes nameless/out-of-area results", () => {
    const places = normalizeOverpassPlaces([
      { type: "way", id: 72, center: { lat: 35.3584731, lon: 74.8092441 }, tags: { name: "Forest Rest House", tourism: "hotel" } },
      withTags(55, "Allied bank"),
      withTags(54, "", 35.35, 74.86),
      withTags(53, "Far-away result", 42, 75),
      { type: "relation", id: 89, center: { lat: 35.35, lon: 74.86 }, tags: { name: "Corner market", shop: "convenience" } },
    ]);

    expect(places.map((place) => [place.name, place.group])).toEqual([
      ["Allied bank", "BANKING"],
      ["Corner market", "SHOPPING"],
      ["Forest Rest House", "ACCOMMODATION"],
    ]);
    expect(places[0]).toMatchObject({ osmId: 55, osmUrl: "https://www.openstreetmap.org/node/55", distanceKm: 0.6 });
    expect(places.find((place) => place.osmId === 89)?.osmUrl).toBe("https://www.openstreetmap.org/relation/89");
    expect(places.every((place) => Number.isFinite(place.distanceKm))).toBe(true);
  });

  it("requests one bounded town-area query and serves the successful result from cache for 24 hours", async () => {
    const fetcher = okFetch([withTags(55, "Allied bank")]);
    const initial = feedPayload(await getAstorePlaces({ now: Date.UTC(2026, 8, 27, 4), fetcher }));
    const cached = await getAstorePlaces({ now: Date.UTC(2026, 8, 27, 4, 1), fetcher });

    expect(initial).toMatchObject({ status: "fresh", radiusMeters: 5000, places: [{ name: "Allied bank" }] });
    expect(initial.osmDataTimestamp).toBe("2026-09-27T00:00:00Z");
    expect(cached.status).toBe("cached");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetcher).mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("overpass-api.de/api/interpreter");
    expect(init.method).toBe("POST");
    const query = new URLSearchParams(init.body as string).get("data") ?? "";
    expect(query).toContain("around:5000,35.3566152,74.8569804");
    expect(query).toContain("[timeout:15]");
    expect(new Date(initial.freshUntil!).getTime() - Date.parse(initial.fetchedAt)).toBe(24 * 60 * 60 * 1000);
  });

  it("preserves the last successful records as stale if Overpass later fails", async () => {
    const now = Date.UTC(2026, 8, 27, 1, 30);
    const first = await getAstorePlaces({ now, fetcher: okFetch([withTags(55, "Allied bank")]) });
    const failedFetcher: typeof fetch = vi.fn(async () => new Response("upstream down", { status: 504 })) as unknown as typeof fetch;
    const stale = await getAstorePlaces({ now: now + 25 * 60 * 60 * 1000, fetcher: failedFetcher });
    const throttled = await getAstorePlaces({ now: now + 25 * 60 * 60 * 1000 + 60 * 1000, fetcher: failedFetcher });

    expect(first.status).toBe("fresh");
    expect(stale).toMatchObject({ status: "stale", places: [{ name: "Allied bank" }] });
    expect(stale.checkedAt).not.toBeNull();
    expect(throttled.status).toBe("stale");
    expect(failedFetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back only to a clearly dated OSM snapshot if the first live request fails", async () => {
    const failure: typeof fetch = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    const feed = feedPayload(await getAstorePlaces({ now: Date.UTC(2026, 8, 27, 6), fetcher: failure }));

    expect(feed.status).toBe("snapshot");
    expect(feed.fetchedAt).toBe("2026-09-27T01:54:17.000Z");
    expect(feed.checkedAt).toBe("2026-09-27T06:00:00.000Z");
    expect(feed.freshUntil).toBeNull();
    expect(feed.places.map((place) => place.name)).toContain("PTDC Motel");
    expect(feed.places.length).toBe(4);
    expect(failure).toHaveBeenCalledTimes(1);
  });

  it("serves the public same-origin Express route with data, attribution, cache and content-safety headers", async () => {
    const app = express();
    const feed = await getAstorePlaces({ now: Date.UTC(2026, 8, 27, 7), fetcher: okFetch([withTags(55, "Allied bank")]) });
    registerAstorePlacesEndpoint(app, async () => feed);
    const server = await new Promise<import("node:http").Server>((resolve) => {
      const running = app.listen(0, () => resolve(running));
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/local-places/astore`);
      const result = await response.json() as AstorePlacesFeed;
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(result).toMatchObject({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", places: [{ name: "Allied bank" }] });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("collapses concurrent first loads into one shared Overpass request", async () => {
    let release: ((response: Response) => void) | undefined;
    const fetcher: typeof fetch = vi.fn(() => new Promise<Response>((resolve) => { release = resolve; })) as unknown as typeof fetch;
    const now = Date.UTC(2026, 8, 27, 5);
    const one = getAstorePlaces({ now, fetcher });
    const two = getAstorePlaces({ now, fetcher });
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    release?.(new Response(JSON.stringify({ elements: [withTags(55, "Allied bank")] }), { status: 200 }));
    const [result1, result2] = await Promise.all([one, two]);
    expect(result1.places).toEqual(result2.places);
    expect(result1.status).toBe("fresh");
  });
});
