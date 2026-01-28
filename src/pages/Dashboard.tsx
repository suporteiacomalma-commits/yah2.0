import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { useBrand } from "@/hooks/useBrand";
import { Skeleton } from "@/components/ui/skeleton";
import { PhasesSection } from "@/components/workspace/PhasesSection";
import { QuickAccessSection } from "@/components/workspace/QuickAccessSection";
import { MiniCalendar } from "@/components/workspace/MiniCalendar";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export default function Dashboard() {
  const { brand, isLoading } = useBrand();
  const { profile } = useProfile();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Pagamento concluído com sucesso!");
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <MinimalLayout>
        <div className="flex-1 p-6 md:p-8">
          <div className="space-y-6 w-full max-w-6xl mx-auto">
            <Skeleton className="h-8 w-48 bg-secondary" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-64 bg-secondary lg:col-span-2" />
              <Skeleton className="h-64 bg-secondary" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-32 bg-secondary" />
              <Skeleton className="h-32 bg-secondary" />
            </div>
          </div>
        </div>
      </MinimalLayout>
    );
  }

  const currentPhase = brand?.current_phase || 1;
  const completedPhases = brand?.phases_completed || [];

  return (
    <MinimalLayout brandName={brand?.name}>
      <div className="flex-1 p-4 md:p-6 relative overflow-auto">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
        </div>

        {/* Workspace Content */}
        <div className="relative z-10 w-full max-w-2xl mx-auto space-y-5">
          {/* Quick Access */}
          <div className="animate-fade-in">
            <QuickAccessSection />
          </div>

          {/* Phases Section */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <PhasesSection
              currentPhase={currentPhase}
              completedPhases={completedPhases}
            />
          </div>

          {/* Calendar */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <MiniCalendar />
          </div>
        </div>
      </div>
    </MinimalLayout>
  );
}
