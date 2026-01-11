import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseProgress } from "@/components/phases/PhaseProgress";
import { TrendingUp } from "lucide-react";

interface ProgressSectionProps {
  completedPhases: number;
  totalPhases: number;
}

export function ProgressSection({ completedPhases, totalPhases }: ProgressSectionProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          Progresso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PhaseProgress completedPhases={completedPhases} totalPhases={totalPhases} />
      </CardContent>
    </Card>
  );
}
