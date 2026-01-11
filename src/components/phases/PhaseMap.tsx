import { useNavigate } from "react-router-dom";
import { phases, Phase } from "@/lib/phases";
import { PhaseIcon, PhaseStatus } from "./PhaseIcon";

interface PhaseMapProps {
  currentPhase: number;
  completedPhases: number[];
}

// Only show these 8 phases in the dashboard grid
const dashboardPhases = [1, 2, 3, 4, 5, 7, 9, 11];

export function PhaseMap({ currentPhase, completedPhases }: PhaseMapProps) {
  const navigate = useNavigate();

  const getPhaseStatus = (phase: Phase): PhaseStatus => {
    if (completedPhases.includes(phase.id)) return "completed";
    if (phase.id === currentPhase) return "current";
    if (phase.id < currentPhase) return "available";
    return "locked";
  };

  const filteredPhases = phases.filter(p => dashboardPhases.includes(p.id));

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {filteredPhases.map((phase) => (
          <PhaseIcon
            key={phase.id}
            icon={phase.icon}
            phaseNumber={phase.id}
            status={getPhaseStatus(phase)}
            title={phase.shortTitle}
            onClick={() => navigate(phase.href)}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
