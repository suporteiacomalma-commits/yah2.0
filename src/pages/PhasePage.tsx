import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/hooks/useBrand";
import { phases } from "@/lib/phases";
import { cn } from "@/lib/utils";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { PersonalityNotebook } from "@/components/phases/PersonalityNotebook";
import { BrandDNANotebook } from "@/components/phases/BrandDNANotebook";
import { WeeklyFixedNotebook } from "@/components/phases/WeeklyFixedNotebook";
import { SocialOptimization } from "@/components/phases/SocialOptimization";
import { TrainedAIs } from "@/components/phases/TrainedAIs";
import { BrandVault } from "@/components/phases/BrandVault";

export default function PhasePage() {
  const { phaseId } = useParams();
  const navigate = useNavigate();
  const { brand, completePhase } = useBrand();

  const phaseNumber = parseInt(phaseId || "1", 10);
  const phase = phases.find((p) => p.id === phaseNumber);

  if (!phase) {
    navigate("/dashboard");
    return null;
  }

  const isCompleted = brand?.phases_completed?.includes(phaseNumber);

  // Logic alignment with PhaseMap: Phases 6, 7, 8 are locked if first 4 are not done
  const firstFourCompleted = [1, 2, 3, 4].every(id => brand?.phases_completed?.includes(id));

  let isLocked = false;
  if ([6, 7, 8].includes(phaseNumber)) {
    isLocked = !firstFourCompleted && phaseNumber !== brand?.current_phase && !isCompleted;
  } else {
    isLocked = phaseNumber > (brand?.current_phase || 1) && !isCompleted;
  }

  if (isLocked) {
    navigate("/dashboard");
    return null;
  }

  const handleComplete = () => {
    completePhase.mutate(phaseNumber);
  };

  const Icon = phase.icon;

  return (
    <MinimalLayout brandName={brand?.name}>
      <div className="flex-1 p-6 md:p-8">
        <div className={cn(
          "mx-auto",
          (phaseNumber === 4 || phaseNumber === 8) ? "max-w-[1700px]" : "max-w-3xl"
        )}>
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {/* Phase Header */}
          <div className="flex items-start gap-4 mb-8 animate-fade-in">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              isCompleted ? "bg-green-500/20 text-green-600" : "gradient-primary text-primary-foreground"
            )}>
              {isCompleted ? <Check className="w-7 h-7" /> : <Icon className="w-7 h-7" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {phaseNumber <= 4 ? `Etapa ${phaseNumber} de 4` : `Fase ${phaseNumber}`}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {phase.title}
              </h1>
              <p className="text-muted-foreground mt-1">
                {phase.description}
              </p>
            </div>
          </div>

          {/* Phase Content */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {phaseNumber === 1 ? (
              <PersonalityNotebook />
            ) : phaseNumber === 2 ? (
              <BrandDNANotebook />
            ) : phaseNumber === 3 ? (
              <WeeklyFixedNotebook />
            ) : phaseNumber === 4 ? (
              <SocialOptimization />
            ) : phaseNumber === 5 ? (
              <ActivityCalendar />
            ) : phaseNumber === 6 ? (
              <TrainedAIs />
            ) : phaseNumber === 8 ? (
              <BrandVault />
            ) : (
              <div className="text-center py-12">
                <Icon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Conteúdo em desenvolvimento
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Esta fase está sendo preparada com ferramentas e conteúdos exclusivos para sua marca.
                </p>
              </div>
            )}
          </div>

          {/* Complete Button */}
          {!isCompleted && phaseNumber !== 6 && phaseNumber !== 8 && (
            <div className="flex justify-end animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Button
                onClick={handleComplete}
                disabled={completePhase.isPending}
                className="gradient-primary text-primary-foreground"
              >
                {completePhase.isPending ? "Salvando..." : "Concluir Fase"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {isCompleted && phaseNumber !== 6 && phaseNumber !== 8 && (
            <div className="text-center py-4 animate-fade-in">
              <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Fase concluída!
              </p>
            </div>
          )}
        </div>
      </div>
    </MinimalLayout>
  );
}
