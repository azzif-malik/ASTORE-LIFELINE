import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { connections, type ScenarioId } from "../data/astoreNetwork";
import { simulateFailure, type SimulationResult } from "../lib/simulation";
import { readSharedSimulation } from "../lib/shareableSimulation";

export type AudienceMode = "community" | "business" | "traveler";
interface SimulationContextValue {
  selectedConnectionId: string;
  setSelectedConnectionId: (id: string) => void;
  activeFailureId: string | null;
  result: SimulationResult | null;
  simulate: (id?: string) => void;
  clear: () => void;
  mode: AudienceMode;
  setMode: (mode: AudienceMode) => void;
  launchScenario: (scenarioId: ScenarioId) => void;
}
const SimulationContext = createContext<SimulationContextValue | null>(null);
const connectionIds = connections.map((edge) => edge.id);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(() => typeof window === "undefined"
    ? { selectedConnectionId: "c6", activeFailureId: null }
    : readSharedSimulation(window.location.search, "c6", connectionIds));
  const [selectedConnectionId, setSelectedConnectionId] = useState(initialState.selectedConnectionId);
  const [activeFailureId, setActiveFailureId] = useState<string | null>(initialState.activeFailureId);
  const [mode, setMode] = useState<AudienceMode>("community");
  const result = useMemo(() => activeFailureId ? simulateFailure(activeFailureId) : null, [activeFailureId]);
  const simulate = (id = selectedConnectionId) => {
    if (connections.some((edge) => edge.id === id)) {
      setSelectedConnectionId(id);
      setActiveFailureId(id);
    }
  };
  const clear = () => {
    setActiveFailureId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("fail")) {
        url.searchParams.delete("fail");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }
  };
  const launchScenario = (scenarioId: ScenarioId) => {
    const idByScenario: Record<ScenarioId, string> = { "road-blockage": "c4", "crossing-failure": "c1", landslide: "c6", flood: "c5" };
    setMode("community");
    setSelectedConnectionId(idByScenario[scenarioId]);
    setActiveFailureId(idByScenario[scenarioId]);
  };
  return <SimulationContext.Provider value={{ selectedConnectionId, setSelectedConnectionId, activeFailureId, result, simulate, clear, mode, setMode, launchScenario }}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used within SimulationProvider");
  return context;
}
