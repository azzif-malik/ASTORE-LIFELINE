import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAstoreRoadContext, normalizeAstoreRoadWays, registerAstoreRoadContextEndpoint, resetAstoreRoadContextCacheForTests } from "./roadContext";

const way = (id: number, more: Record<string, string> = {}) => ({
  type: "way",
  id,
  tags: { highway: "tertiary", name: `Mapped way ${id}`, ...more },
  geometry: [{ lat: 35.3, lon: 74.8 }, { lat: 35.31, lon: 74.81 }],
});
const okFetch = (elements: unknown[], timestamp = "2026-09-27T02:25:01Z"): typeof fetch =>
  vi.fn(async () => new Response(JSON.stringify({ elements, osm3s: { timestamp_osm_base: timestamp } }), { status: 200 })) as unknown as typeof fetch;

afterEach(() => resetAstoreRoadContextCacheForTests());

describe("bounded Astore OSM road context", () => {
  it("accepts only valid ways and preserves OSM GeoJSON coordinate order and attribution", () => {
    const features = normalizeAstoreRoadWays([
      way(1),
      way(1, { name: "duplicate" }),
      { ...way(2), geometry: [{ lat: 92, lon: 70 }, { lat: 93, lon: 71 }] },
      { ...way(3), tags: { name: "Not a highway" } },
      { ...way(4), geometry: [{ lat: 35.3, lon: 74.8 }] },
      { ...way(5), type: "node" },
    ]);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: "way/1",
      geometry: { type: "LineString", coordinates: [[74.8, 35.3], [74.81, 35.31]] },
      properties: { osmType: "way", osmId: 1, highway: "tertiary", osmUrl: "https://www.openstreetmap.org/way/1" },
    });
  });

  it("makes one bounded 7-day-cached request and records the OSM timestamp", async () => {
    const fetcher = okFetch([way(1), way(2)]);
    const now = Date.UTC(2026, 8, 27, 4);
    const first = await getAstoreRoadContext({ now, fetcher });
    const cached = await getAstoreRoadContext({ now: now + 60_000, fetcher });
    expect(first).toMatchObject({ status: "fresh", provider: "OpenStreetMap", license: "ODbL-1.0", wayFeatureCount: 2, osmDataTimestamp: "2026-09-27T02:25:01Z" });
    expect(first.queryBounds).toEqual({ south: 35.3166152, west: 74.8169804, north: 35.3966152, east: 74.8969804 });
    expect(cached.status).toBe("cached");
    expect(Date.parse(first.freshUntil!) - Date.parse(first.fetchedAt)).toBe(7 * 24 * 60 * 60 * 1000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetcher).mock.calls[0] as unknown as [string, RequestInit];
    const query = new URLSearchParams(init.body as string).get("data") ?? "";
    expect(query).toContain("way(35.3166152,74.8169804,35.3966152,74.8969804)[highway]");
    expect(query).toContain("out geom 350");
    expect(init.method).toBe("POST");
  });

  it("preserves last known geometry as stale after an upstream failure", async () => {
    const now = Date.UTC(2026, 8, 27, 3);
    await getAstoreRoadContext({ now, fetcher: okFetch([way(1)]) });
    const failure = vi.fn(async () => new Response("busy", { status: 429 })) as unknown as typeof fetch;
    const result = await getAstoreRoadContext({ now: now + 8 * 24 * 60 * 60 * 1000, fetcher: failure });
    expect(result).toMatchObject({ status: "stale", wayFeatureCount: 1, features: [{ id: "way/1" }] });
    expect(result.checkedAt).toBe(new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString());
  });

  it("serves the read-only endpoint with attribution and safe headers", async () => {
    const app = express();
    const feed = await getAstoreRoadContext({ now: Date.UTC(2026, 8, 27, 4), fetcher: okFetch([way(1)]) });
    registerAstoreRoadContextEndpoint(app, async () => feed);
    const server = await new Promise<import("node:http").Server>((resolve) => { const running = app.listen(0, () => resolve(running)); });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind to TCP port");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/local-places/astore/roads`);
      const result = await response.json() as typeof feed;
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(result).toMatchObject({ provider: "OpenStreetMap", attribution: "© OpenStreetMap contributors", features: [{ properties: { osmUrl: "https://www.openstreetmap.org/way/1" } }] });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
