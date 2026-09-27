export type NodeType = "COMMUNITY" | "ESSENTIAL_SERVICE" | "BUSINESS" | "TOURISM";

export interface NetworkNode {
  id: string;
  name: string;
  shortName: string;
  type: NodeType;
  x: number;
  y: number;
  labelSide?: "left" | "right" | "top" | "bottom";
  description: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  curve?: number;
}

export const nodes: NetworkNode[] = [
  { id: "town", name: "Astore Town", shortName: "Astore Town", type: "COMMUNITY", x: 88, y: 260, labelSide: "left", description: "Demo network origin" },
  { id: "community-a", name: "Community Node A", shortName: "Community A", type: "COMMUNITY", x: 265, y: 176, labelSide: "top", description: "Modeled community node" },
  { id: "community-b", name: "Community Node B", shortName: "Community B", type: "COMMUNITY", x: 274, y: 352, labelSide: "bottom", description: "Modeled community node" },
  { id: "community-c", name: "Community Node C", shortName: "Community C", type: "COMMUNITY", x: 472, y: 225, labelSide: "top", description: "Modeled community node" },
  { id: "community-d", name: "Community Node D", shortName: "Community D", type: "COMMUNITY", x: 635, y: 330, labelSide: "bottom", description: "Modeled community node" },
  { id: "essential-a", name: "Essential Access A", shortName: "Essential A", type: "ESSENTIAL_SERVICE", x: 424, y: 92, labelSide: "top", description: "Illustrative essential-access node" },
  { id: "essential-b", name: "Essential Access B", shortName: "Essential B", type: "ESSENTIAL_SERVICE", x: 326, y: 454, labelSide: "bottom", description: "Illustrative essential-access node" },
  { id: "business-a", name: "Local Business Zone A", shortName: "Business A", type: "BUSINESS", x: 601, y: 126, labelSide: "top", description: "Illustrative local business zone" },
  { id: "business-b", name: "Local Business Zone B", shortName: "Business B", type: "BUSINESS", x: 690, y: 410, labelSide: "bottom", description: "Illustrative local business zone" },
  { id: "tourism-a", name: "Tourism Point A", shortName: "Tourism A", type: "TOURISM", x: 744, y: 208, labelSide: "right", description: "Secondary illustrative tourism node" },
  { id: "tourism-b", name: "Tourism Point B", shortName: "Tourism B", type: "TOURISM", x: 739, y: 470, labelSide: "right", description: "Secondary illustrative tourism node" },
];

export const connections: Connection[] = [
  { id: "c1", from: "town", to: "community-a", label: "Town · Community A", curve: -34 },
  { id: "c2", from: "town", to: "community-b", label: "Town · Community B", curve: 28 },
  { id: "c3", from: "community-a", to: "community-b", label: "Community A · B", curve: 26 },
  { id: "c4", from: "community-b", to: "community-c", label: "Community B · C", curve: -25 },
  { id: "c5", from: "community-a", to: "community-c", label: "Community A · C", curve: -20 },
  { id: "c6", from: "community-c", to: "community-d", label: "Community C · D", curve: 26 },
  { id: "c7", from: "community-a", to: "essential-a", label: "Community A · Essential Access A", curve: 0 },
  { id: "c8", from: "community-b", to: "essential-a", label: "Community B · Essential Access A", curve: -12 },
  { id: "c9", from: "community-c", to: "essential-b", label: "Community C · Essential Access B", curve: 15 },
  { id: "c10", from: "community-b", to: "essential-b", label: "Community B · Essential Access B", curve: 10 },
  { id: "c11", from: "community-c", to: "business-a", label: "Community C · Business Zone A", curve: -10 },
  { id: "c12", from: "community-d", to: "business-b", label: "Community D · Business Zone B", curve: 4 },
  { id: "c13", from: "business-a", to: "tourism-a", label: "Business Zone A · Tourism Point A", curve: -8 },
  { id: "c14", from: "community-d", to: "tourism-b", label: "Community D · Tourism Point B", curve: 5 },
];

export type ScenarioId = "road-blockage" | "crossing-failure" | "landslide" | "flood";

export interface Scenario {
  id: ScenarioId;
  title: string;
  kind: string;
  connectionId: string;
  summary: string;
  consequence: string;
  icon: string;
}

export const scenarios: Scenario[] = [
  { id: "road-blockage", title: "Road blockage", kind: "ACCESS INTERRUPTION", connectionId: "c4", summary: "A modeled connection between Community B and Community C is removed.", consequence: "Community C retains a modeled alternative through Community A. Compare how the remaining path changes access.", icon: "01" },
  { id: "crossing-failure", title: "Crossing failure", kind: "CONNECTION FAILURE", connectionId: "c1", summary: "The modeled link between Astore Town and Community A fails.", consequence: "The graph can test whether the second town connection preserves a path to Community A.", icon: "02" },
  { id: "landslide", title: "Landslide", kind: "SLOPE DISRUPTION", connectionId: "c6", summary: "The modeled connection between Community C and Community D is removed.", consequence: "Community D and the nodes beyond it become unreachable from the demo origin in this topology.", icon: "03" },
  { id: "flood", title: "Flood", kind: "VALLEY DISRUPTION", connectionId: "c5", summary: "A modeled link between Community A and Community C is removed.", consequence: "A second modeled path through Community B remains; the graph recalculates connectivity.", icon: "04" },
];

export const demoMetadata = {
  name: "Astore Demo Network",
  nodeCount: nodes.length,
  connectionCount: connections.length,
  scenarioCount: scenarios.length,
  note: "Conceptual connections modeled for demonstration. This is not a verified operational road map.",
};

export const nodeById = (id: string) => nodes.find((node) => node.id === id);
export const connectionById = (id: string) => connections.find((edge) => edge.id === id);
export const scenarioById = (id: ScenarioId) => scenarios.find((scenario) => scenario.id === id);
