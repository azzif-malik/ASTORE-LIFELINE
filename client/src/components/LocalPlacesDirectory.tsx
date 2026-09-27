import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Building2, Clock3, LoaderCircle, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import type { AstorePlacesFeed, LocalPlace, LocalPlaceGroup } from "../../../shared/localPlaces";

const filters: Array<{ id: LocalPlaceGroup | "ALL"; label: string }> = [
  { id: "ALL", label: "All places" },
  { id: "BANKING", label: "Banking" },
  { id: "ACCOMMODATION", label: "Lodging" },
  { id: "SHOPPING", label: "Shopping" },
  { id: "FOOD", label: "Food & drink" },
  { id: "SERVICES", label: "Services" },
];

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function PlaceCard({ place }: { place: LocalPlace }) {
  return <article className="local-place-card">
    <div className="local-place-card-top"><span className="local-place-pin"><MapPin size={14}/></span><span className="local-place-category">{place.category}</span><span className="local-place-distance">{place.distanceKm.toFixed(1)} km*</span></div>
    <h3 lang={/[\u0600-\u06ff]/.test(place.name) ? "ur" : undefined}>{place.name}</h3>
    <div className="local-place-meta"><span>OPENSTREETMAP RECORD · {place.osmType.toUpperCase()} {place.osmId}</span><a href={place.osmUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${place.name} in OpenStreetMap`}>View source <ArrowUpRight size={12}/></a></div>
  </article>;
}

export default function LocalPlacesDirectory() {
  const [feed, setFeed] = useState<AstorePlacesFeed | null>(null);
  const [category, setCategory] = useState<LocalPlaceGroup | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch("/api/local-places/astore", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Local place records are unavailable");
        return response.json() as Promise<AstorePlacesFeed>;
      })
      .then((result) => {
        if (result.provider !== "OpenStreetMap" || !Array.isArray(result.places)) throw new Error("Unexpected local place response");
        setFeed(result);
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(true); console.warn("[Local places] Could not load the Astore community directory.", reason); } })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [reloadToken]);

  const places = useMemo(() => category === "ALL" ? feed?.places ?? [] : (feed?.places ?? []).filter((place) => place.group === category), [category, feed]);
  const statusLabel = feed?.status === "fresh" ? "RECENTLY FETCHED FROM OSM" : feed?.status === "cached" ? "CACHED · REFRESHED WITHIN 24H" : feed?.status === "stale" ? "LAST KNOWN DATA · REFRESH UNAVAILABLE" : "DATED OSM SNAPSHOT · REFRESH UNAVAILABLE";
  const hasTime = Boolean(feed?.osmDataTimestamp || feed?.fetchedAt);
  const updated = feed?.osmDataTimestamp ?? feed?.fetchedAt;

  return <section className="local-places-section" aria-labelledby="local-places-heading">
    <div className="local-places-heading"><div><span className="eyebrow"><i className="eyebrow-pip"/> ASTORE DIRECTORY · 5 KM FROM TOWN CENTRE</span><h2 id="local-places-heading">Places the community has <em>put on the map.</em></h2><p>Names and locations come from OpenStreetMap—not the illustrative business-zone simulation.</p></div><span className={`local-places-count ${feed ? "" : "local-count-empty"}`}><b>{feed ? feed.places.length.toString().padStart(2, "0") : "—"}</b><small>MAPPED PLACES</small></span></div>

    <div className="local-places-toolbar"><div className="local-place-filters" role="group" aria-label="Filter mapped local places by category">{filters.map((option) => <button key={option.id} type="button" className={category === option.id ? "filter-active" : ""} aria-pressed={category === option.id} onClick={() => setCategory(option.id)}>{option.label}{option.id === "ALL" && feed ? <span>{feed.places.length}</span> : null}</button>)}</div><button className="local-places-refresh" type="button" onClick={() => { setRefreshing(true); setReloadToken((value) => value + 1); }} disabled={loading || refreshing} aria-label="Refresh local OpenStreetMap place records">{refreshing ? <LoaderCircle size={13} className="local-spin"/> : <RefreshCw size={13}/>} Refresh</button></div>

    {loading && <div className="local-places-message" role="status"><LoaderCircle size={17} className="local-spin"/>Loading Astore’s community-mapped places…</div>}
    {!loading && error && <div className="local-places-message local-places-error" role="alert"><MapPin size={17}/><span><b>Place records are temporarily unavailable.</b><small>The separate demo-network simulations are unaffected.</small></span><button type="button" onClick={() => { setRefreshing(true); setReloadToken((value) => value + 1); }}>Try again</button></div>}
    {!loading && feed && places.length > 0 && <div className="local-place-grid">{places.map((place) => <PlaceCard key={`${place.osmType}/${place.osmId}`} place={place}/>)}</div>}
    {!loading && feed && places.length === 0 && <div className="local-places-message">No mapped places in this category yet. Local OpenStreetMap coverage may be incomplete.</div>}

    {feed && <div className="local-places-foot"><div className={`local-source-status source-${feed.status}`}><i/>{statusLabel}</div>{hasTime && <span className="local-places-update"><Clock3 size={12}/> OSM snapshot {formatDate(updated!)}</span>}<div className="local-places-attribution"><Building2 size={13}/><span>Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" translate="no">OpenStreetMap contributors</a> · <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer">ODbL</a></span></div></div>}

    <div className="local-places-caveat"><ShieldCheck size={14}/><p><b>Community-mapped—not independently verified.</b> A listing does not confirm a business is open, still operating, or reachable today. We have not marked these entries as verified. *Distance is straight-line from the Astore Town map point, not a driving route. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Suggest an OSM correction <ArrowUpRight size={11}/></a></p></div>
  </section>;
}
