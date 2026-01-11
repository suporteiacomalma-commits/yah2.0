interface PhaseProgressProps {
  completedPhases: number;
  totalPhases: number;
}

export function PhaseProgress({ completedPhases, totalPhases }: PhaseProgressProps) {
  const percentage = Math.round((completedPhases / totalPhases) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso da jornada</span>
        <span className="font-semibold text-primary">{percentage}%</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full gradient-primary transition-all duration-700 ease-out rounded-full glow-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {completedPhases} de {totalPhases} fases concluídas
      </p>
    </div>
  );
}
