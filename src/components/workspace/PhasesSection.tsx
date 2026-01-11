import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseMap } from "@/components/phases/PhaseMap";
import { Layers } from "lucide-react";

interface PhasesSectionProps {
  currentPhase: number;
  completedPhases: number[];
}

export function PhasesSection({ currentPhase, completedPhases }: PhasesSectionProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
          <Layers className="w-4 h-4 text-primary" />
          Fases da Jornada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PhaseMap currentPhase={currentPhase} completedPhases={completedPhases} />
      </CardContent>
    </Card>
  );
}
