import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CalendarPage() {
    const { brand } = useBrand();
    const navigate = useNavigate();

    return (
        <MinimalLayout brandName={brand?.name}>
            <div className="flex-1 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Calendário de Atividades</h1>
                            <p className="text-muted-foreground italic">Todas as suas tarefas e compromissos em um só lugar.</p>
                        </div>
                    </div>

                    <div className="bg-card md:border border-border md:rounded-2xl p-0 md:p-6 shadow-none md:shadow-xl">
                        <ActivityCalendar />
                    </div>
                </div>
            </div>
        </MinimalLayout>
    );
}
