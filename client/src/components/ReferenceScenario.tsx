import { CircleAlert, CornerDownRight, Gauge, Network, Route } from "lucide-react";
import { mainValleyRoadReference } from "../data/referenceScenario";

const impactRows = [
  { label: "Communities affected", value: mainValleyRoadReference.affected.communities, note: "example count" },
  { label: "Essential-access points", value: mainValleyRoadReference.affected.essentialAccessPoints, note: "example count" },
  { label: "Business zone", value: mainValleyRoadReference.affected.businessZones, note: "example count" },
  { label: "Tourism points", value: mainValleyRoadReference.affected.tourismPoints, note: "example count" },
];

export default function ReferenceScenario() {
  return <section className="reference-scenario" aria-labelledby="main-valley-road-heading">
    <header className="reference-scenario-heading">
      <div><span className="eyebrow">REFERENCE SCENARIO · NOT CONNECTED TO CALCULATOR</span><h2 id="main-valley-road-heading">User-supplied <em>impact profile.</em></h2><p>Kept separate from the live graph until its road and node definitions are mapped to a validated model.</p></div>
      <span className="reference-only-badge"><i/> REFERENCE ONLY</span>
    </header>

    <div className="reference-road-banner"><div className="reference-road-icon"><Network size={19}/></div><div><span>MODELED AS FAILED IN THE PROVIDED EXAMPLE</span><h3>Main Valley Road</h3></div><span className="reference-failed-label"><CircleAlert size={14}/> FAILED</span></div>

    <div className="reference-impact-grid" aria-label="User-supplied example impact counts">{impactRows.map(({ label, value, note }) => <article key={label}><span>{label}</span><b>{value.toString().padStart(2, "0")}</b><small>{note}</small></article>)}</div>

    <div className="reference-detail-grid">
      <article><span className="reference-detail-icon"><Gauge size={15}/></span><span><small>CASCADE DEPTH</small><b>{mainValleyRoadReference.cascadeDepthHops} hops</b></span></article>
      <article><span className="reference-detail-icon"><Route size={15}/></span><span><small>ALTERNATIVE ROUTE · {mainValleyRoadReference.alternativeRoute.status}</small><b>{mainValleyRoadReference.alternativeRoute.name}</b></span><CornerDownRight className="reference-route-mark" size={16}/></article>
      <article className="reference-critical"><span className="reference-detail-icon"><CircleAlert size={15}/></span><span><small>PROVIDED IMPACT LABEL</small><b>{mainValleyRoadReference.impact}</b></span></article>
    </div>

    <p className="reference-scenario-caveat"><CircleAlert size={14}/><span><b>Not a calculated or verified incident.</b> Counts, road names, the alternative route and the “CRITICAL” label are reproduced from user-provided example text. They do not describe the current demo graph, a mapped road, a live failure, or independently verified local conditions. The running simulator continues to calculate its own results separately.</span></p>
  </section>;
}
