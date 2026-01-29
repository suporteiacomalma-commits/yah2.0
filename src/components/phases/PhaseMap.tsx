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
    // Check if the first 4 phases are completed
    const firstFourCompleted = [1, 2, 3, 4].every(id => completedPhases.includes(id));

    // Status override for phases 6, 7, 8 based on first 4 completion
    if ([6, 7, 8].includes(phase.id)) {
      if (!firstFourCompleted) return "locked";
      if (completedPhases.includes(phase.id)) return "completed";
      if (phase.id === currentPhase) return "current";
      return "available"; // Unlock if first 4 are done
    }

    if (completedPhases.includes(phase.id)) return "completed";
    if (phase.id === currentPhase) return "current";
    if (phase.id < currentPhase) return "available";
    return "locked";
  };

  const handlePhaseClick = (phase: Phase) => {
    const status = getPhaseStatus(phase);

    if (status === "locked") {
      const firstFourCompleted = [1, 2, 3, 4].every(id => completedPhases.includes(id));
      if ([6, 7, 8].includes(phase.id) && !firstFourCompleted) {
        toast.error("Você precisa completar as 4 primeiras etapas da jornada antes de acessar esta área.", {
          description: "Personalidade, DNA, Semanal e Redes devem estar concluídas.",
          duration: 4000
        });
        return;
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
