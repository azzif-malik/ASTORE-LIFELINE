import { useState } from "react";
import { ArrowRight, Check, CircleAlert, CornerDownRight, Copy, GitBranch, MapPin, Route, Shield } from "lucide-react";
import { connections, nodeById } from "../data/astoreNetwork";
import type { SimulationResult } from "../lib/simulation";
import { buildScenarioShareUrl } from "../lib/shareableSimulation";

export function ImpactPanel({ result }: { result: SimulationResult | null }) {
  const [copiedConnectionId, setCopiedConnectionId] = useState<string | null>(null);
  const [copyFailedConnectionId, setCopyFailedConnectionId] = useState<string | null>(null);
  if (!result) return <section className="impact-empty"><div className="empty-icon"><GitBranch size={21}/></div><div><span className="eyebrow">WAITING FOR A SIMULATION</span><h3>Choose a connection to see what changes.</h3><p>The network will calculate affected nodes and remaining paths from its modeled topology.</p></div></section>;
  const failed = connections.find((edge) => edge.id === result.failedConnectionId);
  const categoryRows = [
    { label: "Communities", ids: result.affectedByType.COMMUNITY, icon: MapPin, color: "sage" },
    { label: "Essential access", ids: result.affectedByType.ESSENTIAL_SERVICE, icon: Shield, color: "green" },
    { label: "Business zones", ids: result.affectedByType.BUSINESS, icon: GitBranch, color: "sand" },
    { label: "Tourism points", ids: result.affectedByType.TOURISM, icon: Route, color: "blue" },
  ];
  return <section className="impact-panel" aria-live="polite">
    <div className="impact-heading"><div><span className="eyebrow"><span className="eyebrow-pip alert-pip"/> MODELED IMPACT</span><h3>One link changes the picture.</h3></div><span className={`severity severity-${result.severity.toLowerCase()}`}>{result.severity} IMPACT</span></div>
    <div className="failed-summary"><CircleAlert size={15}/><span><b>Failed connection</b> · {failed?.label ?? "Modeled link"}</span></div>
    <div className="impact-categories">{categoryRows.map(({ label, ids, icon: Icon, color }) => <div className="impact-category" key={label}><span className={`impact-type-icon ${color}`}><Icon size={15}/></span><div className="impact-type-copy"><strong>{label}</strong>{ids.length ? <small>{ids.map((id) => nodeById(id)?.shortName).join(", ")}</small> : <small>None disconnected</small>}</div><span className="impact-count">{ids.length.toString().padStart(2, "0")}</span></div>)}</div>
    <div className="cascade-note"><span className="cascade-rule"/><div><span className="eyebrow">CASCADE DEPTH · {result.cascadeDepth} {result.cascadeDepth === 1 ? "LINK" : "LINKS"}</span><p>{result.alternativePath ? `An alternative connection remains across ${result.alternativePath.edgeIds.length} modeled links.` : "No alternative path remains between the ends of the failed connection."}</p></div></div>
    <div className={`alternative-box ${result.alternativePath ? "alternative-found" : "alternative-none"}`}><span className="alt-icon">{result.alternativePath ? <CornerDownRight size={16}/> : <CircleAlert size={16}/>}</span><div><b>{result.alternativePath ? "A modeled alternative remains" : "No modeled alternative between endpoints"}</b><small>{result.alternativePath ? result.alternativePath.nodeIds.map((id) => nodeById(id)?.shortName).filter(Boolean).join("  →  ") : "The endpoints of this failed link are disconnected in the demo graph."}</small></div><ArrowRight size={15}/></div>
    <p className="honesty-note"><Check size={13}/> Every outcome is calculated from the demo network, not live conditions.</p>
    <div className="impact-share"><button type="button" onClick={async () => {
      const url = buildScenarioShareUrl(window.location.origin, result.failedConnectionId);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedConnectionId(result.failedConnectionId);
        setCopyFailedConnectionId(null);
      } catch {
        setCopyFailedConnectionId(result.failedConnectionId);
        setCopiedConnectionId(null);
      }
    }} aria-label="Copy a link to this exact simulated disruption">{copiedConnectionId === result.failedConnectionId ? <Check size={13}/> : <Copy size={13}/>} {copiedConnectionId === result.failedConnectionId ? "LINK COPIED" : "COPY LINK"}</button>
      <div className="impact-share-url"><span>REPRODUCIBLE SIMULATION LINK</span><code tabIndex={0} aria-label="Selectable simulation share URL">{buildScenarioShareUrl(window.location.origin, result.failedConnectionId)}</code>{copyFailedConnectionId === result.failedConnectionId && <small>Clipboard unavailable here—select the URL above to copy it manually.</small>}</div>
    </div>
  </section>;
}
