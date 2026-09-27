import { connections, nodes, type Connection, type NodeType } from "../data/astoreNetwork";

export type Severity = "LOW" | "MODERATE" | "HIGH";
export interface PathResult { nodeIds: string[]; edgeIds: string[] }
export interface SimulationResult {
  failedConnectionId: string;
  unreachableNodeIds: string[];
  affectedNodeIds: string[];
  affectedByType: Record<NodeType, string[]>;
  alternativePath: PathResult | null;
  cascadeDepth: number;
  affectedCount: number;
  severity: Severity;
  businessImpacts: { nodeId: string; severity: Severity; hasAlternative: boolean }[];
  travelImpact: { reachable: boolean; remainingPath: PathResult | null; message: string };
}

/** Breadth-first search over the modeled graph, optionally removing one connection. */
export function findPath(startId: string, targetId: string, failedConnectionId?: string): PathResult | null {
  if (startId === targetId) return { nodeIds: [startId], edgeIds: [] };
  const queue: string[] = [startId];
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  const visited = new Set([startId]);
  while (queue.length) {
    const current = queue.shift()!;
    const adjacent = connections.filter((edge) => edge.id !== failedConnectionId && (edge.from === current || edge.to === current));
    for (const edge of adjacent) {
      const next = edge.from === current ? edge.to : edge.from;
      if (visited.has(next)) continue;
      visited.add(next);
      previous.set(next, { nodeId: current, edgeId: edge.id });
      if (next === targetId) {
        const nodeIds = [targetId];
        const edgeIds: string[] = [];
        let cursor = targetId;
        while (cursor !== startId) {
          const step = previous.get(cursor)!;
          edgeIds.unshift(step.edgeId);
          nodeIds.unshift(step.nodeId);
          cursor = step.nodeId;
        }
        return { nodeIds, edgeIds };
      }
      queue.push(next);
    }
  }
  return null;
}

function reachableFrom(startId: string, failedConnectionId: string) {
  const distance = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of connections) {
      if (edge.id === failedConnectionId) continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next && !distance.has(next)) {
        distance.set(next, distance.get(current)! + 1);
        queue.push(next);
      }
    }
  }
  return distance;
}

function severityForNode(nodeId: string, type: NodeType, failedId: string): Severity {
  const baseline = findPath("town", nodeId);
  const remaining = findPath("town", nodeId, failedId);
  if (!remaining) return "HIGH";
  if (!baseline) return "LOW";
  if (remaining.edgeIds.length > baseline.edgeIds.length) return "MODERATE";
  return "LOW";
}

/** Deterministic impact is derived exclusively from the demo graph and the removed edge. */
export function simulateFailure(failedConnectionId: string): SimulationResult | null {
  const failed: Connection | undefined = connections.find((edge) => edge.id === failedConnectionId);
  if (!failed) return null;
  const originReachable = reachableFrom("town", failedConnectionId);
  const unreachableNodeIds = nodes.filter((node) => !originReachable.has(node.id)).map((node) => node.id);
  const affectedNodeIds = unreachableNodeIds.filter((id) => id !== "town");
  const affectedByType: Record<NodeType, string[]> = {
    COMMUNITY: [], ESSENTIAL_SERVICE: [], BUSINESS: [], TOURISM: [],
  };
  for (const id of affectedNodeIds) {
    const node = nodes.find((item) => item.id === id);
    if (node) affectedByType[node.type].push(id);
  }
  const alternativePath = findPath(failed.from, failed.to, failedConnectionId);
  const fromDistances = reachableFrom(failed.from, failedConnectionId);
  const toDistances = reachableFrom(failed.to, failedConnectionId);
  const cascadeDepth = Math.max(0, ...affectedNodeIds.map((id) => Math.min(fromDistances.get(id) ?? Infinity, toDistances.get(id) ?? Infinity)).filter(Number.isFinite));
  const affectedCount = affectedNodeIds.length;
  const severity: Severity = affectedByType.ESSENTIAL_SERVICE.length > 0 || affectedCount >= 3 ? "HIGH" : affectedCount > 0 ? "MODERATE" : alternativePath && alternativePath.edgeIds.length > 1 ? "MODERATE" : "LOW";
  const businessImpacts = nodes.filter((node) => node.type === "BUSINESS").map((node) => ({
    nodeId: node.id,
    severity: severityForNode(node.id, node.type, failedConnectionId),
    hasAlternative: Boolean(findPath("town", node.id, failedConnectionId)),
  }));
  const remainingPath = findPath("town", "tourism-a", failedConnectionId);
  const travelImpact = {
    reachable: Boolean(remainingPath),
    remainingPath,
    message: remainingPath ? `A modeled path remains via ${remainingPath.nodeIds.slice(1, -1).map((id) => nodes.find((n) => n.id === id)?.shortName).filter(Boolean).join(" → ") || "the existing connection"}.` : "No modeled path from Astore Town to Tourism Point A remains in this scenario.",
  };
  return { failedConnectionId, unreachableNodeIds, affectedNodeIds, affectedByType, alternativePath, cascadeDepth, affectedCount, severity, businessImpacts, travelImpact };
}
