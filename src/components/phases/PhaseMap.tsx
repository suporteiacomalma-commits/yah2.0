import { useNavigate } from "react-router-dom";
import { phases, Phase } from "@/lib/phases";
import { PhaseIcon, PhaseStatus } from "./PhaseIcon";
import { toast } from "sonner";

interface PhaseMapProps {
  currentPhase: number;
  completedPhases: number[];
}

// Only show these 8 phases in the dashboard grid
const dashboardPhases = [1, 2, 3, 4, 6, 7, 8];

export function PhaseMap({ currentPhase, completedPhases }: PhaseMapProps) {
  const navigate = useNavigate();

  const getPhaseStatus = (phase: Phase): PhaseStatus => {
    // Always unlock 4, 6, 7, 8 as per user request
    if ([4, 6, 7, 8].includes(phase.id)) {
      if (completedPhases.includes(phase.id)) return "completed";
      if (phase.id === currentPhase) return "current";
      return "available";
    }

    // Status logic for other phases
    if ([6, 7, 8].includes(phase.id)) { // This block is now redundant for 6,7,8 but kept for structure if needed later, though reachable only if above condition changes.
      // Actually user requested specifically 4,6,7,8 to be OPEN. 
      // The block above handles them.
    }

    if (completedPhases.includes(phase.id)) return "completed";
    if (phase.id === currentPhase) return "current";
    if (phase.id < currentPhase) return "available";
    return "locked";
  };

  const handlePhaseClick = (phase: Phase) => {
    const status = getPhaseStatus(phase);

    if (status === "locked") {
      // Phases 4, 6, 7, 8 are assumed unlocked by getPhaseStatus, so likely won't hit here.
      // Keeping original logic for others just in case.
      const firstFourCompleted = [1, 2, 3, 4].every(id => completedPhases.includes(id));
      if ([6, 7, 8].includes(phase.id) && !firstFourCompleted) {
        // This should not happen given getPhaseStatus change, but safe to keep or remove.
        // We'll leave it as a fallback guard.
      }
    }

    if (status !== "locked") {
      navigate(phase.href);
    }
  };

  const filteredPhases = phases.filter(p => dashboardPhases.includes(p.id));

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredPhases.map((phase) => (
          <PhaseIcon
            key={phase.id}
            icon={phase.icon}
            phaseNumber={phase.id}
            status={getPhaseStatus(phase)}
            title={phase.shortTitle}
            onClick={() => handlePhaseClick(phase)}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
