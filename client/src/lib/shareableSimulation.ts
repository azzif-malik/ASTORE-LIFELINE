export interface SharedSimulationState {
  selectedConnectionId: string;
  activeFailureId: string | null;
}

export function readSharedSimulation(search: string, defaultConnectionId: string, validConnectionIds: readonly string[]): SharedSimulationState {
  const requestedId = new URLSearchParams(search).get("fail");
  if (!requestedId || !validConnectionIds.includes(requestedId)) {
    return { selectedConnectionId: defaultConnectionId, activeFailureId: null };
  }
  return { selectedConnectionId: requestedId, activeFailureId: requestedId };
}

export function buildScenarioShareUrl(origin: string, connectionId: string): string {
  const url = new URL("/network", origin);
  url.searchParams.set("fail", connectionId);
  return url.toString();
}
