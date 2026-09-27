import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, Popup, ScaleControl, setWorkerUrl } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowDownRight, ArrowUpRight, Building2, Compass, Download, LoaderCircle, MapPin, MapPinned, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import type { AstorePlacesFeed, LocalPlaceGroup } from "../../../shared/localPlaces";
import type { AstoreRoadContextFeed } from "../../../shared/roadContext";
import { makePlacePins, serializePlacesGeoJSON, type PlacePin } from "../lib/placePins";

const ASTORE_TOWN = { longitude: 74.8569804, latitude: 35.3566152 };
const ASTORE_NODE = "https://www.openstreetmap.org/node/2777265389";
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const groupLabels: Record<LocalPlaceGroup, string> = {
  BANKING: "Banking",
  ACCOMMODATION: "Lodging",
  SHOPPING: "Shopping",
  FOOD: "Food & drink",
  SERVICES: "Services",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "time not provided";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function makePopup(pin: PlacePin) {
  const wrapper = document.createElement("div");
  wrapper.className = "astore-map-popup";
  const name = document.createElement("strong");
  name.textContent = pin.name;
  const detail = document.createElement("span");
  detail.textContent = `${pin.category} · ${pin.distanceKm.toFixed(1)} km straight-line from Astore Town`;
  const source = document.createElement("a");
  source.href = pin.osmUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "View OpenStreetMap record";
  wrapper.append(name, detail, source);
  return new Popup({ closeButton: true, offset: 16, maxWidth: "280px" }).setDOMContent(wrapper);
}

function makeMarkerAccessible(marker: Marker, label: string) {
  const element = marker.getElement();
  element.setAttribute("aria-label", label);
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-expanded", "false");
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      marker.togglePopup();
    }
  });
  marker.getPopup()?.on("open", () => element.setAttribute("aria-expanded", "true"));
  marker.getPopup()?.on("close", () => element.setAttribute("aria-expanded", "false"));
}

// MapLibre v6 requires its worker to pass through Vite's worker bundler pipeline.
setWorkerUrl(mapLibreWorkerUrl);

export default function RealMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placeMarkers = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [feed, setFeed] = useState<AstorePlacesFeed | null>(null);
  const [roadFeed, setRoadFeed] = useState<AstoreRoadContextFeed | null>(null);
  const [roadState, setRoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [roadVisible, setRoadVisible] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeGroup, setActiveGroup] = useState<LocalPlaceGroup | "ALL">("ALL");
  const [activePlace, setActivePlace] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPlacesLoading(true);
    setPlacesError(false);
    fetch("/api/local-places/astore", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Place feed returned ${response.status}`);
        return response.json() as Promise<AstorePlacesFeed>;
      })
      .then((result) => {
        if (result.provider !== "OpenStreetMap" || !Array.isArray(result.places)) throw new Error("Invalid community-place response");
        setFeed(result);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPlacesError(true);
        console.warn("[Astore map] Community-mapped places are temporarily unavailable.", reason);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPlacesLoading(false);
          setRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [reloadToken]);

  const allPins = useMemo(() => makePlacePins(feed?.places ?? []), [feed]);
  const availableGroups = useMemo(() => Array.from(new Set(allPins.map((pin) => pin.group))), [allPins]);
  const visiblePins = useMemo(
    () => activeGroup === "ALL" ? allPins : allPins.filter((pin) => pin.group === activeGroup),
    [activeGroup, allPins],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const markers = visiblePins.map((pin) => {
      const popup = makePopup(pin);
      const marker = new Marker({ color: pin.color, scale: 0.92, anchor: "bottom" })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(popup)
        .addTo(map);
      makeMarkerAccessible(marker, `${pin.name}, ${pin.category}, a community-mapped OpenStreetMap place`);
      marker.getElement().setAttribute("title", `${pin.name} · ${pin.category}`);
      placeMarkers.current.set(pin.key, marker);
      return marker;
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      visiblePins.forEach((pin) => placeMarkers.current.delete(pin.key));
    };
  }, [mapReady, visiblePins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !roadFeed || !roadVisible || !map.isStyleLoaded()) return;
    const sourceId = "astore-osm-road-context-source";
    const layerId = "astore-osm-road-context-lines";
    map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: roadFeed.features } });
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#efb17c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 11, 2.25, 15, 3.5],
        "line-opacity": 0.82,
        "line-dasharray": [1.3, 1.6],
      },
    });
    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [mapReady, roadFeed, roadVisible]);

  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: STYLE_URL,
      center: [ASTORE_TOWN.longitude, ASTORE_TOWN.latitude],
      zoom: 11.25,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: { compact: false },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    map.once("load", () => {
      setMapReady(true);
      setMapError(false);
      const popup = new Popup({ closeButton: true, offset: 18, maxWidth: "260px" });
      const popupContent = document.createElement("div");
      popupContent.className = "astore-map-popup";
      const title = document.createElement("strong");
      title.textContent = "Astore Town";
      const detail = document.createElement("span");
      detail.textContent = "OpenStreetMap mapped place point";
      const link = document.createElement("a");
      link.href = ASTORE_NODE;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View this place in OpenStreetMap";
      popupContent.append(title, detail, link);
      popup.setDOMContent(popupContent);
      const townMarker = new Marker({ color: "#e0a170", scale: 1.12, anchor: "bottom" })
        .setLngLat([ASTORE_TOWN.longitude, ASTORE_TOWN.latitude])
        .setPopup(popup)
        .addTo(map);
      makeMarkerAccessible(townMarker, "Astore Town, mapped OpenStreetMap place point");
    });

    map.on("error", () => {
      if (!map.isStyleLoaded()) setMapError(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      placeMarkers.current.clear();
    };
  }, []);

  const recenter = () => {
    mapRef.current?.flyTo({ center: [ASTORE_TOWN.longitude, ASTORE_TOWN.latitude], zoom: 11.25, duration: 650 });
  };

  const focusPlace = (pin: PlacePin) => {
    setActivePlace(pin.key);
    mapRef.current?.flyTo({ center: [pin.longitude, pin.latitude], zoom: 15, duration: 550 });
    placeMarkers.current.get(pin.key)?.togglePopup();
  };

  const downloadPlaces = () => {
    if (!feed || visiblePins.length === 0) return;
    const blob = new Blob([serializePlacesGeoJSON(visiblePins, feed)], { type: "application/geo+json;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `astore-community-places-${activeGroup.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  };

  const loadRoadContext = async () => {
    if (roadFeed || roadState === "loading") return;
    setRoadState("loading");
    try {
      const response = await fetch("/api/local-places/astore/roads", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Road context returned ${response.status}`);
      const result = await response.json() as AstoreRoadContextFeed;
      if (result.provider !== "OpenStreetMap" || !Array.isArray(result.features) || result.features.length !== result.wayFeatureCount) throw new Error("Invalid mapped-road response");
      setRoadFeed(result);
      setRoadState("ready");
    } catch (reason) {
      console.warn("[Astore map] Optional community-mapped road context is unavailable.", reason);
      setRoadState("error");
    }
  };

  return (
    <div className="real-map-page">
      <header className="real-map-intro">
        <div>
          <span className="eyebrow real-map-kicker"><i className="eyebrow-pip" /> OPEN GEOGRAPHIC MAP</span>
          <h1>Explore Astore<br /><em>on a real map.</em></h1>
          <p>See community-mapped roads, settlements, and place labels across shaded mountain terrain. This geographic basemap is separate from the illustrative resilience simulation.</p>
        </div>
        <div className="real-map-index"><MapPinned size={18} /><span>ASTORE TOWN<br />GILGIT-BALTISTAN, PAKISTAN</span></div>
      </header>

      <section className="real-map-card" aria-label="Interactive real map of Astore and surrounding area">
        <div className="real-map-toolbar">
          <div className="real-map-provider"><span className={`real-map-status ${mapReady ? "map-status-ready" : mapError ? "map-status-error" : ""}`} />
            <span><b>{mapReady ? "OPEN MAP" : mapError ? "MAP UNAVAILABLE" : "LOADING MAP"}</b><small>OPENSTREETMAP-BASED · ASTORE AREA</small></span>
          </div>
          <button className="real-map-recenter" type="button" onClick={recenter} aria-label="Center the map on Astore Town"><Compass size={15} /> Center on Astore</button>
        </div>

        <div className="real-map-stage">
          <div ref={containerRef} className="real-map-canvas" role="application" aria-label="Interactive OpenStreetMap-based map. Use plus and minus controls to zoom, or drag to pan." />
          {!mapReady && !mapError && <div className="real-map-loading" role="status"><span className="map-loader" />Loading real map tiles…</div>}
          {mapError && <div className="real-map-error" role="alert"><MapPinned size={22} /><b>The live basemap could not load.</b><span>Check your connection and try again. The simulation remains a separate demo network.</span><button type="button" onClick={() => { setMapError(false); mapRef.current?.setStyle(STYLE_URL); }}>Retry map</button></div>}
          <div className="map-data-badge"><span className="map-data-pip" /> COMMUNITY-MAPPED GEOGRAPHY{roadFeed && roadVisible && <><span className="map-layer-divider">/</span><span className="map-data-pip road-data-pip"/> OPTIONAL OSM WAY GEOMETRY</>}</div>
        </div>

        <div className="real-map-caption">
          <span><MapPinned size={14} /><b>Astore Town</b> · mapped place point</span>
          <span>{ASTORE_TOWN.latitude.toFixed(5)}° N &nbsp; {ASTORE_TOWN.longitude.toFixed(5)}° E</span>
        </div>
        <div className="real-map-attribution"><span>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · tiles by <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a></span><a className="map-issue-link" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue <ArrowUpRight size={12} /></a></div>
      </section>

      <section className="real-road-context" aria-labelledby="real-road-context-heading">
        <div className="real-road-context-copy"><span className="eyebrow"><i className="eyebrow-pip"/> OPTIONAL · OPENSTREETMAP ROAD GEOMETRY</span><h2 id="real-road-context-heading">See mapped road lines.<br/><em>Never confuse them with status.</em></h2><p>On request, overlay the mapped OSM highway-way geometries for the bounded Astore Town area. These are source records—not verified physical-road counts, route guidance, closures, or passability.</p></div>
        {!roadFeed && <button type="button" className="real-road-load" onClick={loadRoadContext} disabled={roadState === "loading"}><MapPinned size={15}/>{roadState === "loading" ? "Loading bounded map context…" : roadState === "error" ? "Retry road overlay" : "Load mapped road lines"}<ArrowUpRight size={13}/></button>}
        {roadState === "error" && <p className="real-road-error" role="status">Community road geometry is unavailable right now. The OpenStreetMap basemap and mapped-place pins still work.</p>}
        {roadFeed && <><button type="button" className="real-road-toggle" aria-pressed={roadVisible} onClick={() => setRoadVisible((visible) => !visible)}><MapPinned size={14}/>{roadVisible ? "Hide mapped road lines" : "Show mapped road lines"}</button><div className="real-road-stats"><div className="real-road-count"><b>{roadFeed.wayFeatureCount.toString().padStart(2, "0")}</b><span>OSM HIGHWAY-WAY FEATURES<br/>IN THIS BOUNDED QUERY</span></div><div className="real-road-meta"><span className={`local-source-status source-${roadFeed.status}`}><i/>{roadFeed.status === "fresh" ? "JUST FETCHED" : roadFeed.status === "cached" ? "CACHED QUERY" : "STALE LAST RESULT"}</span><small>OSM database snapshot: {roadFeed.osmDataTimestamp ? formatDate(roadFeed.osmDataTimestamp) : "timestamp not supplied"}</small><small>BBOX: {roadFeed.queryBounds.south.toFixed(4)}–{roadFeed.queryBounds.north.toFixed(4)}° N · {roadFeed.queryBounds.west.toFixed(4)}–{roadFeed.queryBounds.east.toFixed(4)}° E</small><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL <ArrowUpRight size={12}/></a></div></div></>}
        <p className="real-road-caveat"><ShieldCheck size={14}/><span><b>Context only.</b> A way feature is a mapped geometry, not a confirmed physical road, complete inventory, open route, or measure of travel safety. The overlay is not used in cascade results.</span></p>
      </section>

      <section className="map-place-directory" aria-labelledby="map-place-heading">
        <div className="map-place-heading">
          <div><span className="eyebrow"><i className="eyebrow-pip" /> OPENSTREETMAP · LIVE COMMUNITY RECORDS</span><h2 id="map-place-heading">Find mapped places.<br /><em>Bring them onto the map.</em></h2><p>These are the same local records shown in the business directory—each pin uses its mapped coordinates, not an invented location.</p></div>
          <span className="map-place-count"><b>{feed ? feed.places.length.toString().padStart(2, "0") : "—"}</b><small>MAPPED IN 5 KM</small></span>
        </div>

        {placesLoading && <div className="map-place-message" role="status"><LoaderCircle className="local-spin" size={16} />Loading mapped Astore place records…</div>}
        {!placesLoading && placesError && <div className="map-place-message map-place-error" role="alert"><MapPin size={16} /><span>Place records are unavailable. The basemap and Astore Town pin still work.</span><button type="button" onClick={() => { setRefreshing(true); setReloadToken((token) => token + 1); }} disabled={refreshing}><RefreshCw size={12} /> Try again</button></div>}

        {!placesLoading && !placesError && feed && <>
          <div className="map-place-controls"><div className="map-place-filters" role="group" aria-label="Filter mapped places shown on the map">
            <button type="button" className={activeGroup === "ALL" ? "map-place-filter-active" : ""} aria-pressed={activeGroup === "ALL"} onClick={() => setActiveGroup("ALL")}>All places <span>{allPins.length}</span></button>
            {availableGroups.map((group) => <button key={group} type="button" className={activeGroup === group ? "map-place-filter-active" : ""} aria-pressed={activeGroup === group} onClick={() => setActiveGroup(group)}>{groupLabels[group]} <span>{allPins.filter((pin) => pin.group === group).length}</span></button>)}
          </div><div className="map-place-actions"><button className="map-place-download" type="button" onClick={downloadPlaces} disabled={visiblePins.length === 0} aria-label={`Download ${visiblePins.length} displayed community-mapped places as GeoJSON`}><Download size={12} /> Export GeoJSON</button><button className="map-place-refresh" type="button" onClick={() => { setRefreshing(true); setReloadToken((token) => token + 1); }} disabled={refreshing} aria-label="Refresh the OpenStreetMap place directory">{refreshing ? <LoaderCircle size={12} className="local-spin" /> : <RefreshCw size={12} />} Refresh</button></div></div>

          {visiblePins.length > 0 ? <div className="map-place-list" aria-label="Community-mapped places; select one to focus the map">
            {visiblePins.map((pin) => <div className={`map-place-row ${activePlace === pin.key ? "map-place-row-active" : ""}`} key={pin.key}>
              <button type="button" className="map-place-focus" onClick={() => focusPlace(pin)} aria-label={`Focus map on ${pin.name}`}>
                <span className="map-place-marker" style={{ "--place-pin-color": pin.color } as React.CSSProperties}><MapPin size={14} /></span>
                <span className="map-place-main"><b>{pin.name}</b><small>{pin.category} · {pin.distanceKm.toFixed(1)} km straight-line</small></span>
                <span className="map-place-focus-label"><Compass size={12} /> SHOW</span>
              </button>
              <a className="map-place-record" href={pin.osmUrl} target="_blank" rel="noopener noreferrer" aria-label={`View the OpenStreetMap record for ${pin.name}`}>OSM <ArrowUpRight size={12} /></a>
            </div>)}
          </div> : <div className="map-place-message">No community-mapped places in this category. Coverage can be incomplete.</div>}

          <div className="map-place-provenance"><span className={`local-source-status source-${feed.status}`}><i />{feed.status === "fresh" ? "RECENTLY FETCHED" : feed.status === "cached" ? "CACHED FEED" : feed.status === "stale" ? "LAST KNOWN DATA" : "DATED OSM SNAPSHOT"}</span><span><Building2 size={12} /> {feed.osmDataTimestamp ? `OSM snapshot ${formatDate(feed.osmDataTimestamp)}` : `Feed read ${formatDate(feed.fetchedAt)}`}</span><span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer">ODbL</a></span></div>
          <p className="map-place-caveat"><ShieldCheck size={14} /><span><b>Community-mapped—not verified.</b> A record does not confirm a business is open, operating, safe, accessible or reachable. Distances are straight-line estimates, not travel routes.</span></p>
        </>}
      </section>

      <section className="real-map-info-grid">
        <article className="real-map-info-card"><span className="eyebrow">01 / PLACE PIN</span><h2>A mapped place,<br /><em>not a modeled node.</em></h2><p>The marker points to the OpenStreetMap feature for Astore Town. Local business and service pins come from individual OpenStreetMap records.</p><a className="text-link" href={ASTORE_NODE} target="_blank" rel="noreferrer">View OSM place record <ArrowUpRight size={14} /></a></article>
        <article className="real-map-info-card"><span className="eyebrow">02 / DATA BOUNDARIES</span><h2>Real mapped geography.<br /><em>Not real-time conditions.</em></h2><p>OpenStreetMap is community-maintained and may be incomplete or out of date. Road display does not verify that a road is open, passable, safe, or operational today.</p><div className="real-map-caution"><ShieldCheck size={17} /><span>For current travel or emergency decisions, confirm conditions through trusted local sources.</span></div></article>
      </section>

      <div className="map-separation-note"><ArrowDownRight size={16} /><p><b>Keep the two maps distinct.</b> The basemap shows real, crowd-sourced geography. <Link href="/network">The network simulation</Link> uses separate, conceptual links and is not snapped to these roads.</p></div>
      <div className="real-map-footer-link"><Link href="/network" className="button button-outline">Open the demo network <ArrowUpRight size={15} /></Link><Link href="/business" className="text-link">View the business directory</Link><Link href="/about" className="text-link">How the simulation works</Link></div>
    </div>
  );
}
