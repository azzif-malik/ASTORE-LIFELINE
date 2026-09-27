import { useId, useState } from "react";
import { connections, nodes, type NodeType } from "../data/astoreNetwork";
import { useSimulation } from "../contexts/SimulationContext";
import { simulateFailure } from "../lib/simulation";

const colors: Record<NodeType, string> = { COMMUNITY: "#d8e2e3", ESSENTIAL_SERVICE: "#91bca0", BUSINESS: "#e9b97f", TOURISM: "#92b2c0" };
function tooltipCoordinates(element: Element, clientX: number, clientY: number) {
  const host = element.closest(".network-visual");
  if (!host) return { left: 10, top: 10 };
  const bounds = host.getBoundingClientRect();
  return {
    left: Math.max(8, Math.min(clientX - bounds.left + 14, Math.max(8, bounds.width - 292))),
    top: Math.max(8, Math.min(clientY - bounds.top - 126, Math.max(8, bounds.height - 156))),
  };
}

function curvePath(x1: number, y1: number, x2: number, y2: number, curve = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + curve;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function NodeGlyph({ type }: { type: NodeType }) {
  if (type === "ESSENTIAL_SERVICE") return <rect x="-8" y="-8" width="16" height="16" rx="2" transform="rotate(45)" />;
  if (type === "BUSINESS") return <rect x="-8" y="-8" width="16" height="16" rx="4" />;
  if (type === "TOURISM") return <path d="M0 -10 L9 7 L-9 7 Z" />;
  return <circle r="8" />;
}

export default function NetworkMap({ compact = false, showControls = true }: { compact?: boolean; showControls?: boolean }) {
  const { activeFailureId, result, selectedConnectionId, setSelectedConnectionId } = useSimulation();
  const ids = useId().replace(/:/g, "");
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [focusedConnectionId, setFocusedConnectionId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 12, top: 12 });
  const failed = activeFailureId ?? null;
  const inspectedId = hoveredConnectionId ?? focusedConnectionId ?? failed ?? selectedConnectionId;
  const inspectedConnection = connections.find((edge) => edge.id === inspectedId);
  const inspectedResult = inspectedConnection ? inspectedConnection.id === activeFailureId && result ? result : simulateFailure(inspectedConnection.id) : null;
  const disconnectedBusinessZones = inspectedResult?.businessImpacts.filter((impact) => !impact.hasAlternative).length ?? 0;
  const inspectedAlternative = inspectedResult?.alternativePath;
  const inspectedPathNames = inspectedAlternative?.nodeIds.map((id) => nodes.find((node) => node.id === id)?.shortName).filter(Boolean).join(" → ");
  const alternativeEdges = new Set(result?.alternativePath?.edgeIds ?? []);
  const affected = new Set(result?.affectedNodeIds ?? []);
  const failedEdge = connections.find((edge) => edge.id === selectedConnectionId);
  return (
    <div className={`network-visual ${compact ? "network-compact" : ""}`}>
      <div className="network-scroll" role="region" tabIndex={compact ? -1 : 0} aria-label="Scrollable modeled network map; swipe horizontally to inspect all nodes on a small screen">
        <svg className="network-svg" viewBox="0 0 820 535" role="img" aria-label="Interactive Astore Demo Network. Select a connection to model its failure.">
          <defs>
            <pattern id={`terrain-${ids}`} width="136" height="94" patternUnits="userSpaceOnUse">
              <path d="M-12 32 C16 1 45 2 59 25 S92 56 130 18 M-10 70 C18 38 46 40 62 62 S94 90 143 54" fill="none" stroke="#b7c8c3" strokeOpacity=".10" strokeWidth=".7" />
            </pattern>
            <radialGradient id={`halo-${ids}`}><stop stopColor="#668779" stopOpacity=".22"/><stop offset="1" stopColor="#13201f" stopOpacity="0"/></radialGradient>
            <filter id={`glow-${ids}`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect x="0" y="0" width="820" height="535" fill="#14201f" />
          <rect x="0" y="0" width="820" height="535" fill={`url(#terrain-${ids})`} />
          <ellipse cx="421" cy="267" rx="370" ry="250" fill={`url(#halo-${ids})`} />
          <path className="river-line" d="M 30 120 C 192 266, 104 322, 280 386 S 503 363 784 510" fill="none" stroke="#5a8290" strokeOpacity=".26" strokeWidth="2" strokeDasharray="1 8" />
          <text x="92" y="104" className="terrain-label">UPPER VALLEY · CONCEPTUAL</text>
          <text x="495" y="497" className="terrain-label">DEMO CONNECTIONS · NOT A ROAD MAP</text>
          {connections.map((edge) => {
            const from = nodes.find((node) => node.id === edge.from)!;
            const to = nodes.find((node) => node.id === edge.to)!;
            const d = curvePath(from.x, from.y, to.x, to.y, edge.curve);
            const isFailed = failed === edge.id;
            const isAlternative = alternativeEdges.has(edge.id) && failed !== null;
            const isSelected = selectedConnectionId === edge.id && !failed;
            return <g key={edge.id} className="edge-group" onPointerEnter={(event) => { if (event.pointerType !== "touch") { setHoveredConnectionId(edge.id); setTooltipPosition(tooltipCoordinates(event.currentTarget, event.clientX, event.clientY)); } }} onPointerLeave={() => setHoveredConnectionId(null)} onFocus={(event) => { setFocusedConnectionId(edge.id); const bounds = event.currentTarget.getBoundingClientRect(); setTooltipPosition(tooltipCoordinates(event.currentTarget, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)); }} onBlur={() => setFocusedConnectionId(null)} onClick={() => { if (!failed) setSelectedConnectionId(edge.id); }} onKeyDown={(event) => { if (!failed && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedConnectionId(edge.id); } }} role="button" tabIndex={0} aria-label={`Inspect modeled connection ${edge.label}${isSelected ? ", selected" : ""}`} aria-describedby={compact ? focusedConnectionId === edge.id ? `edge-tooltip-${ids}` : undefined : `edge-inspector-${ids}`} aria-pressed={isSelected || failed === edge.id}>
              <path d={d} className="edge-hit" />
              <path d={d} className={`edge-line ${isFailed ? "edge-failed" : isAlternative ? "edge-alternative" : isSelected ? "edge-selected" : ""}`} />
              {isFailed && <path d={d} className="edge-break" />}
              {isAlternative && <path d={d} className="edge-alternative-flow" />}
            </g>;
          })}
          {nodes.map((node) => {
            const isAffected = affected.has(node.id);
            const fill = colors[node.type];
            const side = node.labelSide ?? "right";
            const labelX = side === "left" ? node.x - 17 : side === "right" ? node.x + 17 : node.x;
            const labelY = side === "top" ? node.y - 21 : side === "bottom" ? node.y + 27 : node.y + 4;
            const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
            return <g key={node.id} className={`network-node ${isAffected ? "node-affected" : ""}`}>
              {isAffected && <circle className="node-impact-pulse" cx={node.x} cy={node.y} r="19" />}
              <circle className="node-halo" cx={node.x} cy={node.y} r="15" fill={fill} />
              <g transform={`translate(${node.x} ${node.y})`} fill={isAffected ? "#ea8f63" : fill} stroke="#14201f" strokeWidth="2"><NodeGlyph type={node.type} /></g>
              <text x={labelX} y={labelY} textAnchor={anchor} className={`node-label ${isAffected ? "node-label-alert" : ""}`}>{node.shortName}</text>
              {node.id === "town" && <circle cx={node.x} cy={node.y} r="14" fill="none" stroke="#e6c59a" strokeOpacity=".65" strokeWidth="1" />}
            </g>;
          })}
          {failedEdge && failed && <text x="410" y="31" textAnchor="middle" className="map-event-label">SIMULATED DISRUPTION · {failedEdge.label.toUpperCase()}</text>}
        </svg>
      </div>
      {(hoveredConnectionId || (compact && focusedConnectionId)) && inspectedConnection && inspectedResult && <div id={`edge-tooltip-${ids}`} className="edge-hover-tooltip" role="tooltip" style={{ left: tooltipPosition.left, top: tooltipPosition.top }}>
        <div className="edge-hover-head"><span className="eyebrow">HYPOTHETICAL LINK FAILURE</span><strong>{inspectedConnection.label}</strong></div>
        <div className="edge-hover-stats"><span><b>{inspectedResult.affectedCount.toString().padStart(2, "0")}</b> nodes cut off</span><span><b>{disconnectedBusinessZones}</b> business zones</span><span><b>{inspectedResult.affectedByType.ESSENTIAL_SERVICE.length}</b> essential-access nodes</span></div>
        <div className="edge-hover-route"><span>{inspectedAlternative ? `ALTERNATIVE · ${inspectedAlternative.edgeIds.length} LINKS` : "NO ALTERNATIVE BETWEEN ENDPOINTS"}</span><b>{inspectedAlternative ? inspectedPathNames : "Endpoints disconnected in demo"}</b></div>
        <small>Calculated from the conceptual demo graph—not a road-status report.</small>
      </div>}
      {!compact && inspectedConnection && inspectedResult && <section id={`edge-inspector-${ids}`} className="edge-inspector" aria-live="polite" aria-atomic="true" aria-label="Modeled connection details">
        <div className="edge-inspector-title"><span className="eyebrow">{inspectedConnection.id === activeFailureId ? "ACTIVE SIMULATION" : "LINK INSPECTOR · WHAT-IF"}</span><h3>{inspectedConnection.label}</h3><span className={`severity severity-${inspectedResult.severity.toLowerCase()}`}>{inspectedResult.severity} DEMO IMPACT</span></div>
        <div className="edge-inspector-copy"><span>MODELED ENDPOINTS</span><b>{nodes.find((node) => node.id === inspectedConnection.from)?.shortName} <i>↔</i> {nodes.find((node) => node.id === inspectedConnection.to)?.shortName}</b><p>{inspectedResult.businessImpacts.filter((impact) => impact.hasAlternative).length} of {inspectedResult.businessImpacts.length} business zones remain reachable from Astore Town after this link is removed.</p></div>
        <div className="edge-inspector-metrics"><div><b>{inspectedResult.affectedCount.toString().padStart(2, "0")}</b><span>UNREACHABLE NODES</span></div><div><b>{disconnectedBusinessZones.toString().padStart(2, "0")}</b><span>BUSINESS ZONES CUT OFF</span></div><div><b>{inspectedResult.affectedByType.ESSENTIAL_SERVICE.length.toString().padStart(2, "0")}</b><span>ESSENTIAL ACCESS CUT OFF</span></div></div>
        <p className={`edge-inspector-route ${inspectedAlternative ? "edge-route-alternative" : "edge-route-none"}`}><span>{inspectedAlternative ? `ALTERNATIVE ENDPOINT ROUTE · ${inspectedAlternative.edgeIds.length} LINKS` : "ALTERNATIVE BETWEEN ENDPOINTS"}</span><b>{inspectedAlternative ? inspectedPathNames : "No modeled alternative remains."}</b><small>Illustrative graph calculation only · not a real road route or current condition.</small></p>
      </section>}
      <div className="map-legend" aria-label="Network node legend">
        <span><i className="legend-dot community"/>Community</span><span><i className="legend-dot essential"/>Essential access</span><span><i className="legend-square business"/>Business</span><span><i className="legend-triangle tourism"/>Tourism</span>
      </div>
      {showControls && <div className="map-instruction"><span className="instruction-mark"/> {failed ? "Cascading impact is computed from the demo graph" : "Select a connection to begin · every link is modeled"}</div>}
    </div>
  );
}
