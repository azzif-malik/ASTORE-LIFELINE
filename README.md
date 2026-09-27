# Astore Lifeline

Astore Lifeline is an independent community-resilience prototype for the Banao Imaginathon (Environment & Climate). It demonstrates how **modeled infrastructure disruptions can cascade** through a conceptual Astore-area network.

## Run locally

```bash
pnpm install
pnpm dev
```

## Validate

```bash
pnpm check
pnpm test
pnpm build
```

## Routes

- `/map` — real OpenStreetMap-based Astore basemap; optional cached highway-way geometry; mapped-place list, category filters, map focus and provenance-preserving GeoJSON export
- `/` — product introduction plus a cited Government of Gilgit-Baltistan Astore District Census 2023 reference (clearly separated from the demo graph)
- `/journey` — guided disruption cascade
- `/network` — interactive network explorer and community/business/traveler modes
- `/scenarios` — four modeled scenarios
- `/business` — interactive business-impact workbench plus a live, separately sourced community-mapped business directory around Astore Town
- `/about` — methodology and data boundaries

The network accepts validated, reproducible share links such as `/network?fail=c6`. The selected edge IDs are checked against the known demo graph; opening the link recalculates the result locally. Resetting the simulation clears its failure query parameter.

## Model design

The topology is defined in `client/src/data/astoreNetwork.ts`. `client/src/lib/simulation.ts` removes the selected connection and uses breadth-first search to compute reachability, affected node groups, alternate paths, cascade depth, business-zone severity, and illustrative journey impact. The same deterministic graph powers every simulation result.

All simulation node names and connections are illustrative. They do not constitute a verified road map. The site does not use live road, weather, emergency, government, or AI services; does not report safety or operational conditions; and makes no official-partnership claim. No populations, revenue, travel times, or other real-world impact figures are invented.

The `/scenarios` page also presents the user-supplied “Main Valley Road” / “Southern Connector” example as a separate **reference profile**, not one of the four graph scenarios. Its 4 / 2 / 1 / 2 category counts, 3-hop depth and “CRITICAL” label have not been reconciled to the current graph and are not mapped, validated, or calculated by it. The “failed” and “available” statuses are reproduced from the supplied example only.

## Real geographic basemap

The `/map` view uses MapLibre GL JS with OpenFreeMap's free `dark` vector-tile style (`https://tiles.openfreemap.org/styles/dark`). The rendered streets, place labels, and place point are based on community mapping from [OpenStreetMap](https://www.openstreetmap.org/copyright); the style also credits [OpenMapTiles](https://openmaptiles.org/) and [OpenFreeMap](https://openfreemap.org/). The Astore Town pin corresponds to [OSM node 2777265389](https://www.openstreetmap.org/node/2777265389) at 35.3566152° N, 74.8569804° E. Map labels and road geometry can be incomplete or out of date and do not indicate current access, closures, safety, or passability. The live basemap is never used as input to the separate illustrative graph model.

Tiles load from the selected public provider at runtime and require an internet connection. There are no API keys. Keep the on-map data-provider and licence attribution visible. For higher-volume or production requirements, select a map-tile provider with terms and capacity suitable for the deployment.

The `/map` road overlay is **opt-in**: clicking “Load mapped road lines” triggers one bounded Overpass request against the Astore Town BBOX. The read-only response returns at most 350 `highway` ways and is held in process memory for seven days; concurrent loads share a request, and a previous result can be displayed as stale if Overpass fails. The verified initial query returned 60 OpenStreetMap highway-way features at database snapshot `2026-09-27T02:38:15Z`. A *way feature* is not guaranteed to be a unique physical road, complete inventory, currently open route, or evidence of passability. The map UI displays the database timestamp, query bounds, OSM credit/ODbL link, and an explicit “context only” warning; its geometry is never used to calculate demo-network impact.

## Community-mapped local places

The `/business` directory reads `GET /api/local-places/astore`, served by the Express backend. It makes one bounded Overpass query for named businesses/services within five kilometres of the Astore Town OSM point. Successful data is held in process memory for 24 hours and simultaneous requests share one refresh. If the public Overpass service is temporarily unavailable, the endpoint returns the last successful data marked stale or a four-record snapshot from the verified 2026-09-27 upstream response marked as a dated snapshot. If even the backend is unreachable, the directory shows an explicit unavailable state rather than presenting fictional live listings.

Every entry links to its OpenStreetMap object; the page shows the source, OSM database snapshot time when available, approximate straight-line distance, and visible attribution under [ODbL](https://opendatacommons.org/licenses/odbl/). OpenStreetMap is crowd-sourced: a record is **community-mapped, not independently verified** and does not confirm the business is operating, open, accessible, or reachable. Place records do not create simulation nodes and are never fed into the conceptual network model. The feed does not store data in the project database or require login. As with any public Overpass service, it may be rate-limited or unavailable; do not remove the cache or expand the query to unbounded areas.

The map's place panel uses those same five-kilometre feed records. Clicking a place focuses its mapped coordinates and opens the feature's OSM link; category filters update both the list and pins. GeoJSON export retains the OSM object URL, ODbL credit, feed timestamp/status, center/radius, and a machine-readable non-verification notice. Coordinates are exported as standard GeoJSON longitude/latitude pairs. Only the currently selected category is exported.

## Official district context

The homepage cites the 2023 Astore District total (111,573) from the Statistical & Research Cell, Planning and Development Department, Government of Gilgit-Baltistan, *Gilgit-Baltistan at a Glance 2025*. The same source reports a 2017 total of 95,416. The figure is a district-wide census count, not a village estimate, current population or impact estimate; it is **not** used to weight demo nodes or calculate affected groups. The component links to the [Government of Gilgit-Baltistan publication](https://www.pnd.gog.pk/storage/downloads/AiRIlDEcscWPC1s58oXIgpjlVAS7jd-metaR0IgQVQgR2xhbmNlIDIwMjUuMS5wZGY=-.pdf) and the [PBS National Census Report](https://www.pbs.gov.pk/wp-content/uploads/2020/07/National-Census-Report-2023.pdf). Broader WorldPop or district-raster extracts are deferred because a validated boundary/clipping pipeline is not yet part of the app.

## Deployment

The public site is React and Vite, but the local places feed requires the Express-capable WebDev deployment. The old Vercel static output (`dist/public`) contains the frontend only and cannot provide `/api/local-places/astore`; deploy to the backend-enabled managed project/domain so live and cached OSM data can be served from the same origin. The generated backend scaffold includes database and OAuth capabilities, but this directory does not require or use either feature.
