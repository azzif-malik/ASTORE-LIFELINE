import { lazy, Suspense } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, Compass, GitBranch, Layers3, MapPin, Mountain, Network, Route as RouteIcon, ShieldCheck, Store, UsersRound } from "lucide-react";
import SiteShell from "./components/SiteShell";
import NetworkMap from "./components/NetworkMap";
import LocalPlacesDirectory from "./components/LocalPlacesDirectory";
import CensusContext from "./components/CensusContext";
import ReferenceScenario from "./components/ReferenceScenario";
import { ImpactPanel } from "./components/ImpactPanel";
import ModeSwitch from "./components/ModeSwitch";
const RealMapPage = lazy(() => import("./pages/RealMap"));
import { SimulationProvider, useSimulation } from "./contexts/SimulationContext";
import { connections, demoMetadata, nodeById, nodes, scenarios, type ScenarioId } from "./data/astoreNetwork";
import { findPath, type Severity, type SimulationResult } from "./lib/simulation";

function Eyebrow({ children, marker = false }: { children: React.ReactNode; marker?: boolean }) { return <span className="eyebrow">{marker && <i className="eyebrow-pip"/>}{children}</span>; }
function SectionHeading({ kicker, title, text, light = false }: { kicker: string; title: React.ReactNode; text?: string; light?: boolean }) { return <div className={`section-heading ${light ? "section-light" : ""}`}><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2>{text && <p>{text}</p>}</div>; }
function HomePage() {
  return <>
    <section className="hero hero-home">
      <img className="hero-image" src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663984635095/pMkllLoTopUNwnGd.jpg" alt="Rugged high mountain valley in northern Pakistan, veiled in early-morning mist" fetchPriority="high" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <div className="hero-shade"/><div className="hero-contours" aria-hidden="true"/>
      <div className="hero-grid"><div className="hero-copy"><Eyebrow marker>INDEPENDENT COMMUNITY RESILIENCE</Eyebrow><h1>ASTORE<br/><span>LIFELINE</span></h1><p className="hero-deck">See how one broken connection can affect an entire valley.</p><p className="hero-body">An interactive demo of how infrastructure disruptions can cascade across communities and essential access in Astore.</p><div className="hero-actions"><Link href="/network" className="button button-primary">Explore the network <ArrowRight size={17}/></Link><Link href="/scenarios" className="button button-quiet">See a scenario <ArrowUpRight size={16}/></Link></div><div className="hero-note"><span className="note-mark"/> CONCEPTUAL NETWORK · NOT LIVE INFRASTRUCTURE DATA</div></div>
        <div className="hero-side"><span className="hero-index">01 <i/> 04</span><span className="hero-side-title">FROM CONNECTION<br/>TO CASCADE</span><span className="hero-side-caption">A modeled network can show what becomes unreachable when one link disappears.</span></div>
      </div>
      <div className="hero-bottom"><span>ASTORE · GILGIT-BALTISTAN · PAKISTAN</span><a href="#intro">SCROLL TO EXPLORE <ArrowDown size={13}/></a><span className="hero-coord">DEMO NETWORK / 01</span></div>
    </section>
    <section className="intro-section" id="intro"><div className="intro-copy"><Eyebrow>THE IDEA</Eyebrow><h2>One connection.<br/><em>Many consequences.</em></h2><p>In a mountain community, essential access is shaped by the links between places. Astore Lifeline makes those dependencies visible—then lets you see what changes when one modeled connection fails.</p><Link href="/journey" className="text-link">Follow the cascade <ArrowRight size={16}/></Link></div><div className="intro-map-wrap"><div className="mini-map-head"><span><i className="live-indicator"/> ASTORE DEMO NETWORK</span><span>CONCEPTUAL</span></div><NetworkMap compact showControls={false}/><div className="mini-map-foot"><span>11 demo nodes · 14 modeled connections</span><Link href="/network">Open explorer <ArrowUpRight size={14}/></Link></div></div></section>
    <section className="stats-band"><div className="stat-item"><strong>11</strong><span>DEMO NODES</span></div><div className="stat-item"><strong>14</strong><span>MODELED CONNECTIONS</span></div><div className="stat-item"><strong>04</strong><span>SIMULATED SCENARIOS</span></div><p>Prototype structure only.<br/>No real-world incident metrics.</p></section>
    <CensusContext/>
    <section className="how-section"><div className="how-photo"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663984635095/gCNokdncHVXxxjKM.jpg" alt="An illustrative mountain road tracing a rugged northern Pakistan valley" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }}/><div className="photo-caption"><span>MODELED, NOT MAPPED</span><span>CONNECTIONS REPRESENT A CONCEPT</span></div></div><div className="how-copy"><Eyebrow>HOW TO EXPLORE</Eyebrow><h2>See the cascade.<br/><em>Understand what remains.</em></h2><div className="how-steps"><div><b>01</b><span><strong>Choose a connection</strong><small>Explore the conceptual Astore network.</small></span></div><div><b>02</b><span><strong>Model a disruption</strong><small>Select a link and see the graph respond.</small></span></div><div><b>03</b><span><strong>Understand the impact</strong><small>Reveal affected access and remaining paths.</small></span></div></div><Link href="/network" className="button button-outline">Enter the network <ArrowRight size={16}/></Link></div></section>
    <section className="disclaimer-strip"><ShieldCheck size={18}/><p><b>A prototype, not a live service.</b> This conceptual network is modeled for demonstration. It is not a verified road map, an emergency service, or a source of current travel conditions.</p><Link href="/about">Read our methodology <ArrowRight size={14}/></Link></section>
  </>;
}

function ConnectionPicker() {
  const { selectedConnectionId, setSelectedConnectionId, activeFailureId } = useSimulation();
  return <label className="select-label">SELECTED CONNECTION <span className="select-wrap"><select value={selectedConnectionId} disabled={Boolean(activeFailureId)} onChange={(e) => setSelectedConnectionId(e.target.value)} aria-label="Select a modeled connection">{connections.map((edge) => <option value={edge.id} key={edge.id}>{edge.label}</option>)}</select><ChevronDown size={15}/></span></label>;
}

function ModeSummary() {
  const { mode, result } = useSimulation();
  if (mode === "business") {
    return <div className="mode-summary business-summary"><Eyebrow>BUSINESS ACCESS DEPENDENCY</Eyebrow><div className="biz-impact-list">{result ? result.businessImpacts.map(({ nodeId, severity, hasAlternative }) => <div key={nodeId} className="biz-impact-row"><span className={`biz-severity-dot dot-${severity.toLowerCase()}`}/><span><b>{nodeById(nodeId)?.name}</b><small>{hasAlternative ? "Modeled access path remains" : "No modeled path from origin"}</small></span><strong className={`severity-text text-${severity.toLowerCase()}`}>{severity}</strong></div>) : <p className="soft-copy">Choose a link to calculate modeled access dependency for both illustrative business zones. No financial figures are used.</p>}</div><p className="micro-note">LOW / MODERATE / HIGH · DERIVED FROM PATHS</p></div>;
  }
  if (mode === "traveler") {
    return <div className="mode-summary traveler-summary"><Eyebrow>SIMULATED JOURNEY IMPACT</Eyebrow>{result ? <><div className={`journey-result-mark ${result.travelImpact.reachable ? "" : "journey-disconnected"}`}>{result.travelImpact.reachable ? <RouteIcon/> : <CircleAlert/>}</div><h3>{result.travelImpact.reachable ? "A modeled path remains." : "The modeled destination is disconnected."}</h3><p>{result.travelImpact.message}</p><div className="path-line">{result.travelImpact.remainingPath?.nodeIds.map((id) => <span key={id}>{nodeById(id)?.shortName}</span>)}</div></> : <p className="soft-copy">Select a modeled connection to see the illustrative journey impact. This is not current route information.</p>}<div className="travel-caution"><CircleAlert size={14}/> Check current local conditions before travel.</div></div>;
  }
  return <div className="mode-summary community-summary"><Eyebrow>COMMUNITY CONNECTIVITY</Eyebrow>{result ? <><div className="community-summary-count">{result.affectedByType.COMMUNITY.length.toString().padStart(2, "0")} <span>community nodes affected in this model</span></div><p>{result.affectedByType.COMMUNITY.length ? result.affectedByType.COMMUNITY.map((id) => nodeById(id)?.shortName).join(" · ") : "All demo community nodes remain reachable from the origin."}</p></> : <p className="soft-copy">See which modeled communities remain connected when a link is removed.</p>}<div className="micro-note">CONNECTIVITY IS CALCULATED · NOT ASSUMED</div></div>;
}

function NetworkPage() {
  const { selectedConnectionId, activeFailureId, simulate, clear, mode, result } = useSimulation();
  const selected = connections.find((edge) => edge.id === selectedConnectionId);
  const labels: Record<string, string> = { community: "COMMUNITY CONNECTIVITY", business: "LOCAL BUSINESS ACCESS", traveler: "SIMULATED JOURNEY IMPACT" };
  return <PageFrame kicker="EXPLORE THE SYSTEM" title={<>An interconnected<br/><em>demo valley.</em></>} subtitle="Choose one modeled connection. See how the network changes when it no longer holds.">
    <div className="network-workspace"><div className="network-main"><div className="panel-topline"><div><Eyebrow marker>ASTORE DEMO NETWORK</Eyebrow><span className="panel-location"><MapPin size={13}/> CONCEPTUAL ASTORE-AREA NETWORK</span></div><span className="map-label-chip"><i/> NOT A VERIFIED ROAD MAP</span></div><NetworkMap/><div className="network-caption"><span>SELECT A CONNECTION TO INSPECT</span><span>{connections.length} LINKS · {11} DEMO NODES</span></div></div>
      <aside className="control-panel"><div className="control-panel-head"><span className="control-index">01 / MODEL</span><span className="control-type"><Network size={15}/> {labels[mode]}</span></div><ModeSwitch/><ConnectionPicker/><div className="what-if-box"><span className="eyebrow">WHAT IF THIS CONNECTION FAILS?</span><p>{activeFailureId ? "The graph has removed this link and recalculated what remains connected." : selected?.label ?? "Choose a modeled connection."}</p><button type="button" className={`button ${activeFailureId ? "button-reverse" : "button-alert"}`} onClick={() => activeFailureId ? clear() : simulate()}>{activeFailureId ? <><ArrowLeft size={15}/> Reset simulation</> : <><Activity size={16}/> Simulate disruption</>}</button></div><ModeSummary/><div className="sim-disclaimer"><CircleAlert size={14}/><span>Illustrative network response. No live feeds or current road status.</span></div></aside>
    </div>
    <div className="results-area"><ImpactPanel result={result}/></div>
    <div className="bottom-note"><Layers3 size={16}/><span>Connections are modeled for demonstration and are not a verified operational road map.</span><Link href="/about">About the model <ArrowRight size={14}/></Link></div>
  </PageFrame>;
}

function PageFrame({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <div className="page-frame"><header className="page-intro"><div><Eyebrow marker>{kicker}</Eyebrow><h1>{title}</h1><p>{subtitle}</p></div><span className="page-page-index">ASTORE<br/>DEMO / 01</span></header>{children}</div>;
}

function JourneyPage() {
  const { result, activeFailureId, simulate, clear } = useSimulation();
  const nextLink = result?.alternativePath?.edgeIds.map((id) => connections.find((edge) => edge.id === id)?.label).filter(Boolean);
  const stages = ["Choose a connection", "Model its failure", "Watch reachability change", "See what remains connected"];
  return <PageFrame kicker="A MODELED JOURNEY" title={<>Follow one link<br/><em>through the cascade.</em></>} subtitle="A guided look at how a single simulated failure can change an interconnected community network.">
    <div className="journey-toolbar"><div className="journey-progress" aria-label={`Simulation stages: ${result ? 3 : activeFailureId ? 2 : 1} of 4`}>{stages.map((stage, i) => <div key={stage} className={`progress-stage ${i < (result ? 3 : activeFailureId ? 2 : 1) ? "progress-done" : ""}`}><span>{i < (result ? 3 : activeFailureId ? 2 : 1) ? <Check size={13}/> : `0${i+1}`}</span><small>{stage}</small></div>)}</div><ModeSwitch/></div>
    <div className="journey-grid"><div className="journey-map-panel"><NetworkMap showControls={false}/><div className="journey-map-caption"><span><span className="live-indicator"/> THE NETWORK RESPONDS TO YOUR SELECTION</span><span>DEMO GRAPH · DETERMINISTIC</span></div></div><aside className="journey-step-panel"><Eyebrow>{result ? "03 — CASCADE OBSERVED" : "01 — START WITH A CONNECTION"}</Eyebrow><h2>{result ? "What changed?" : "What if this connection fails?"}</h2><p>{result ? "The failed link is removed from the graph. Reachability is then recalculated from Astore Town." : "Select a link on the diagram. The model will trace paths before and after the disruption."}</p><ConnectionPicker/>{!activeFailureId ? <button className="button button-alert full-button" type="button" onClick={() => simulate()}><Activity size={16}/> Simulate disruption</button> : <button className="button button-reverse full-button" type="button" onClick={clear}><ArrowLeft size={15}/> Reset and choose again</button>}
      {result && <div className="journey-findings"><div className="journey-finding"><span className="finding-number">01</span><div><b>{result.affectedByType.COMMUNITY.length ? "A community path is interrupted" : "Community nodes remain connected"}</b><small>{result.affectedByType.COMMUNITY.map((id) => nodeById(id)?.shortName).join(", ") || "All community nodes remain reachable from the modeled origin."}</small></div></div><div className="journey-finding"><span className="finding-number">02</span><div><b>{result.affectedByType.ESSENTIAL_SERVICE.length ? "Essential access is affected" : "Essential access remains reachable"}</b><small>{result.affectedByType.ESSENTIAL_SERVICE.map((id) => nodeById(id)?.shortName).join(", ") || "Both essential-access nodes stay connected in this scenario."}</small></div></div><div className="journey-finding"><span className="finding-number">03</span><div><b>{result.alternativePath ? "A remaining connection" : "No alternate endpoint path"}</b><small>{nextLink?.length ? nextLink.join(" · ") : "No modeled alternate path connects the endpoints."}</small></div></div></div>}
      <div className="journey-check"><ShieldCheckIcon/><span><b>Modeled impact only</b><small>This is not an emergency tool or live travel information.</small></span></div></aside></div>
    {result && <div className="journey-result-bottom"><ImpactPanel result={result}/></div>}
  </PageFrame>;
}
function ShieldCheckIcon() { return <span className="journey-shield"><Check size={16}/></span>; }

function ScenariosPage() {
  const { launchScenario, activeFailureId, result } = useSimulation();
  const [, setLocation] = useLocation();
  const activeScenario = scenarios.find((scenario) => scenario.connectionId === activeFailureId);
  const launch = (id: ScenarioId) => { launchScenario(id); setLocation("/network"); };
  return <PageFrame kicker="MODELED DISRUPTIONS" title={<>Four ways a<br/><em>link can fail.</em></>} subtitle="Illustrative climate and access scenarios for exploring network dependency. These are simulations, not forecasts.">
    <div className="scenario-caution"><CircleAlert size={17}/><span><b>Simulated disruptions only.</b> No event prediction, weather feed, or live condition is used.</span></div>
    <div className="scenario-grid">{scenarios.map((scenario) => {
      const current = scenario.connectionId === activeFailureId;
      const scenarioResult = current ? result : null;
      return <article className={`scenario-card ${current ? "scenario-active" : ""}`} key={scenario.id}><div className="scenario-card-top"><span className="scenario-number">{scenario.icon}</span><span className="scenario-kind">{scenario.kind}</span>{current && <span className="scenario-live">CURRENT MODEL</span>}</div><h2>{scenario.title}</h2><p>{scenario.summary}</p><div className="scenario-detail"><span>ILLUSTRATIVE RESPONSE</span><p>{scenario.consequence}</p></div>{scenarioResult && <div className="scenario-outcome"><b>Calculated now</b><span>{scenarioResult.affectedCount} nodes disconnected · {scenarioResult.alternativePath ? "alternative path remains" : "no endpoint alternative"}</span></div>}<button className={`scenario-launch ${current ? "launch-active" : ""}`} type="button" onClick={() => launch(scenario.id)}>{current ? "View this simulation" : "Launch simulation"}<ArrowUpRight size={15}/></button></article>;
    })}</div>
    <ReferenceScenario/>
    <section className="resilience-note"><div className="resilience-symbol"><Mountain size={24}/></div><div><Eyebrow>WHY MODEL RESILIENCE?</Eyebrow><h2>One route is never the whole story.</h2><p>Understanding dependency starts by asking which connections matter, what can become unreachable, and whether another modeled path remains. This prototype makes that question visible—without pretending to know real-world conditions.</p></div><Link href="/about" className="text-link">How it works <ArrowRight size={16}/></Link></section>
    {activeScenario && <p className="scenario-current-note">A simulation for “{activeScenario.title}” is active. Launch any scenario to compare its modeled response.</p>}
  </PageFrame>;
}

function BusinessZoneCard({ nodeId, result }: { nodeId: string; result: SimulationResult | null }) {
  const node = nodeById(nodeId);
  if (!node) return null;
  const before = findPath("town", nodeId);
  const after = result ? findPath("town", nodeId, result.failedConnectionId) : before;
  const row = result?.businessImpacts.find((item) => item.nodeId === nodeId);
  const severity = row?.severity ?? "LOW";
  const extraLinks = before && after ? after.edgeIds.length - before.edgeIds.length : 0;
  const alternativeRoute = Boolean(before && after && (before.edgeIds.length !== after.edgeIds.length || after.edgeIds.some((edge, index) => edge !== before.edgeIds[index])));
  const status = !result ? "CONNECTED IN BASELINE" : !after ? "NO MODELED PATH" : alternativeRoute ? extraLinks > 0 ? `ALTERNATE · +${extraLinks} LINK${extraLinks === 1 ? "" : "S"}` : "ALTERNATE · SAME LINK COUNT" : "BASELINE ROUTE REMAINS";
  const pathNames = (path: typeof after) => path?.nodeIds.map((id) => nodeById(id)?.shortName).filter(Boolean).join("  →  ");
  return <article className={`biz-work-zone ${!after ? "biz-zone-disconnected" : extraLinks > 0 ? "biz-zone-detour" : ""}`}>
    <header className="biz-work-zone-head"><span className="biz-work-store"><Store size={17}/></span><div><Eyebrow>ILLUSTRATIVE BUSINESS ZONE</Eyebrow><h3>{node.name}</h3></div>{result ? <span className={`severity-text text-${severity.toLowerCase()}`}>{severity}</span> : <span className="biz-baseline-tag">BASELINE</span>}</header>
    <p className="biz-work-zone-description">{nodeId === "business-a" ? "Town-centre trade and services — represented as a connected zone in the demo graph." : "Lower-valley commerce — represented as a separate connected zone in the demo graph."}</p>
    <div className={`biz-work-status ${!after ? "biz-status-out" : alternativeRoute ? "biz-status-reroute" : ""}`}><span className="biz-status-dot"/><span>{status}</span></div>
    {after ? <div className="biz-work-path"><span>{result && alternativeRoute ? "ALTERNATIVE MODELED ROUTE" : result ? "MODELED ACCESS PATH" : "BASELINE ACCESS PATH"}</span><p>{pathNames(after)}</p></div> : <div className="biz-work-path biz-path-missing"><span>BEFORE THIS DISRUPTION</span><p>{pathNames(before) ?? "No baseline path in the demo graph."}</p></div>}
  </article>;
}

function BusinessPage() {
  const { result, simulate, selectedConnectionId, activeFailureId, clear, launchScenario } = useSimulation();
  const selected = connections.find((edge) => edge.id === selectedConnectionId);
  const businessZones = nodes.filter((node) => node.type === "BUSINESS");
  const elevatedCount = result?.businessImpacts.filter((item) => item.severity !== "LOW").length ?? 0;
  return <PageFrame kicker="LOCAL BUSINESS ACCESS" title={<>When access shifts,<br/><em>business feels it.</em></>} subtitle="Explore modeled access to two illustrative business zones. Choose a failed connection on the map or launch a scenario—then compare the remaining paths.">
    <div className="business-hero"><div className="business-hero-copy"><Eyebrow marker>ACCESS STRESS TEST</Eyebrow><h2>See what stays<br/>connected.</h2><p>Start from the conceptual Astore network. Every impact is computed from the demo graph; no revenue, customer counts, or real-world road status is claimed.</p><div className="business-hero-actions"><a href="#business-workbench" className="button button-primary">Test a connection <ArrowDown size={15}/></a><Link href="/map" className="text-link">View the real map <ArrowUpRight size={15}/></Link></div></div><div className="business-hero-art"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663984635095/gCNokdncHVXxxjKM.jpg" alt="Illustrative mountain corridor representing modeled access dependencies" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }}/><div className="business-art-caption">ILLUSTRATIVE VALLEY · NOT A VERIFIED ROUTE</div><div className="business-art-icon"><Store size={20}/></div></div></div>

    <div className="business-facts" aria-label="Demonstration model facts"><div><b>02</b><span>ILLUSTRATIVE BUSINESS ZONES</span></div><div><b>{demoMetadata.connectionCount.toString().padStart(2, "0")}</b><span>MODELED CONNECTIONS</span></div><div><b>{demoMetadata.scenarioCount.toString().padStart(2, "0")}</b><span>ONE-CLICK TESTS</span></div><p>DEMO GRAPH ONLY · NO FINANCIAL METRICS</p></div>

    <section className="business-workbench" id="business-workbench"><div className="biz-network-panel"><div className="biz-panel-head"><div><Eyebrow marker>INTERACTIVE DEMO NETWORK</Eyebrow><span className="biz-selected-edge">{selected?.label ?? "Select a connection"}</span></div><span className="map-label-chip"><i/> NOT A REAL ROAD MAP</span></div><NetworkMap compact={false} showControls={false}/><div className="biz-map-foot"><span>{activeFailureId ? "FAILED LINK AND CASCADE SHOWN IN THE GRAPH" : "CLICK ANY CONNECTION TO SELECT IT"}</span><span>{demoMetadata.nodeCount} NODES · {demoMetadata.connectionCount} LINKS</span></div></div>

      <aside className="biz-test-panel"><div className="biz-test-title"><Eyebrow>01 / RUN A MODEL</Eyebrow><h2>What if this<br/><em>connection fails?</em></h2><p>Choose a link on the diagram, pick it from the list, or jump straight into a ready-made test.</p></div><ConnectionPicker/>{activeFailureId ? <button type="button" className="button button-reverse full-button biz-run-button" onClick={clear}><ArrowLeft size={15}/> Reset and choose again</button> : <button type="button" className="button button-alert full-button biz-run-button" onClick={() => simulate(selectedConnectionId)}><Activity size={16}/> Model access impact</button>}
        <div className="biz-quick-tests"><div className="biz-quick-head"><span className="eyebrow">OR RUN A QUICK TEST</span><span>4 SCENARIOS</span></div><div className="biz-scenario-list">{scenarios.map((scenario) => <button key={scenario.id} type="button" className={`biz-scenario-button ${activeFailureId === scenario.connectionId ? "biz-scenario-active" : ""}`} onClick={() => launchScenario(scenario.id)}><span className="biz-scenario-number">{scenario.icon}</span><span><b>{scenario.title}</b><small>{scenario.kind}</small></span><ArrowUpRight size={14}/></button>)}</div></div>
        <div className="biz-test-note"><GitBranch size={14}/><span>DETERMINISTIC GRAPH MODEL<br/>NOT OPERATIONAL OR FINANCIAL DATA</span></div>
      </aside></section>

    <section className="business-zones-section"><div className="biz-zones-heading"><div><Eyebrow>{result ? "AFTER THE SELECTED DISRUPTION" : "STARTING POSITION"}</Eyebrow><h2>{result ? "Business-zone access, recalculated." : "Two zones. Clear starting paths."}</h2><p>{result ? `The demo graph has recalculated access after ${connections.find((item) => item.id === activeFailureId)?.label ?? "the selected link"} was removed.` : "Each zone is reachable in the baseline demo graph. Run a test above to see the path change."}</p></div>{result && <span className={`severity severity-${result.severity.toLowerCase()}`}>{result.severity} NETWORK IMPACT</span>}</div><div className="biz-zone-grid">{businessZones.map((zone) => <BusinessZoneCard key={zone.id} nodeId={zone.id} result={result}/>)}</div>
      {result && <div className="biz-impact-rollup"><span className="biz-rollup-icon"><UsersRound size={17}/></span><p><b>{elevatedCount ? `${elevatedCount} of ${businessZones.length} illustrative zones have elevated modeled impact` : `No elevated modeled impact across the ${businessZones.length} illustrative business zones`}</b><small>Calculated from baseline reachability and route length in the demo graph. These are not business or economic forecasts.</small></p></div>}
    </section>

    <LocalPlacesDirectory/>

    <div className="business-honesty"><ShieldCheckIcon/><p><b>This is an access model, not an impact forecast.</b> Zones, connections and disruption labels are illustrative. There are no sales, customer, revenue, distance, live road-status or emergency-service claims.</p></div>
  </PageFrame>;
}

function AboutPage() {
  const method = [
    { n: "01", title: "A graph of places and links", text: "A separate map uses community-mapped OpenStreetMap geography. The resilience graph’s community, essential-access, business, and tourism nodes and every simulated connection are conceptual; they are not traced to roads." },
    { n: "02", title: "Remove one connection", text: "A simulated disruption removes the selected edge from the network. Breadth-first search then traces which nodes are still reachable from Astore Town." },
    { n: "03", title: "Compare what remains", text: "The prototype identifies disconnected node types, remaining alternate paths, cascade depth, qualitative business access, and illustrative journey impact." },
  ];
  return <PageFrame kicker="ABOUT THE MODEL" title={<>Make the method<br/><em>as visible as impact.</em></>} subtitle="Astore Lifeline is an independent community-resilience prototype—not an operational map or live service.">
    <div className="about-statement"><div className="about-statement-icon"><Activity size={22}/></div><div><Eyebrow>WHAT ASTORE LIFELINE DOES</Eyebrow><h2>An interactive way to understand connection dependency.</h2><p>The project demonstrates how modeled infrastructure disruptions can cascade through a mountainous community network, affecting community connectivity and essential access first.</p></div><span className="about-tag">BANAO IMAGINATHON<br/>ENVIRONMENT & CLIMATE</span></div>
    <section className="method-section"><div className="method-head"><SectionHeading kicker="DETERMINISTIC BY DESIGN" title={<>How the <em>simulation works.</em></>} text="No AI service or live data is required. The result is produced by graph traversal over the demo network."/><div className="method-mark"><GitBranch size={29}/><span>BFS<br/>GRAPH WALK</span></div></div><div className="method-steps">{method.map((item) => <article key={item.n} className="method-step"><span className="method-number">{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><ArrowDown className="method-arrow" size={17}/></article>)}</div></section>
    <section className="about-two-col"><div className="data-honesty"><Eyebrow>WHAT DATA IT USES</Eyebrow><h2>Mapped geography.<br/><em>Modeled impacts.</em></h2><p>The dedicated real-map view displays community-contributed OpenStreetMap geography and the mapped Astore Town place point. Separately, the resilience graph’s “Community A,” essential-access, business, and tourism nodes and connections are illustrations, not mapped operational locations.</p><div className="demo-identity"><span>DEMO SIMULATION ONLY</span><span>{demoMetadata.nodeCount} NODES · {demoMetadata.connectionCount} LINKS · {demoMetadata.scenarioCount} SCENARIOS</span></div></div><div className="data-boundaries"><Eyebrow>WHAT IT DOES NOT USE</Eyebrow><ul><li><span className="no-mark">—</span><span><b>No live road-status data</b><small>The basemap cannot verify closures, passability, safety, or current conditions.</small></span></li><li><span className="no-mark">—</span><span><b>No weather or emergency feeds</b><small>Scenarios are not forecasts or alerts.</small></span></li><li><span className="no-mark">—</span><span><b>No government APIs or workflows</b><small>This project works independently, with no claimed official partnership.</small></span></li><li><span className="no-mark">—</span><span><b>No real-world impact estimates</b><small>No populations, economic values, distance or travel-time claims are modeled.</small></span></li></ul></div></section>
    <div className="official-disclaimer"><ShieldCheckIcon/><div><Eyebrow>IMPORTANT DISCLAIMER</Eyebrow><p>This is not an official emergency service and does not provide real-time safety, road-status, or travel-condition information. For travel, check current local conditions before departure.</p></div></div>
    <div className="about-cta"><span>Ready to see the network respond?</span><Link href="/network" className="button button-primary">Explore the demo network <ArrowRight size={16}/></Link></div>
  </PageFrame>;
}

function NotFoundPage() { return <PageFrame kicker="NOT FOUND" title={<>This path isn't<br/><em>in the model.</em></>} subtitle="The page you requested is outside this demo network."><Link className="button button-primary" href="/">Return home <ArrowLeft size={16}/></Link></PageFrame>; }

function RealMapRoute() { return <Suspense fallback={<div className="real-map-loading-page" role="status">Loading map…</div>}><RealMapPage/></Suspense>; }

function RoutedPages() {
  const [location] = useLocation();
  return <SiteShell><Switch><Route path="/" component={HomePage}/><Route path="/map" component={RealMapRoute}/><Route path="/network" component={NetworkPage}/><Route path="/journey" component={JourneyPage}/><Route path="/scenarios" component={ScenariosPage}/><Route path="/business" component={BusinessPage}/><Route path="/about" component={AboutPage}/><Route component={NotFoundPage}/></Switch><a className="skip-link" href="#main-content">Skip to content</a></SiteShell>;
}

export default function App() {
  return <SimulationProvider><RoutedPages/></SimulationProvider>;
}
