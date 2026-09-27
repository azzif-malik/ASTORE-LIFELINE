import { Compass, Store, UsersRound } from "lucide-react";
import { useSimulation, type AudienceMode } from "../contexts/SimulationContext";
const options: { value: AudienceMode; label: string; icon: typeof UsersRound }[] = [
  { value: "community", label: "Community", icon: UsersRound },
  { value: "business", label: "Business", icon: Store },
  { value: "traveler", label: "Traveler", icon: Compass },
];
export default function ModeSwitch() {
  const { mode, setMode } = useSimulation();
  return <div className="mode-switch" role="tablist" aria-label="Explore impacts by audience">{options.map(({ value, label, icon: Icon }) => <button type="button" key={value} className={`mode-tab ${mode === value ? "mode-active" : ""}`} role="tab" aria-selected={mode === value} onClick={() => setMode(value)}><Icon size={15}/><span>{label}</span></button>)}</div>;
}
