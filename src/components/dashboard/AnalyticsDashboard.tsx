import { useState, useEffect } from "react";
import { DashboardService, DashboardStats } from "@/services/dashboard-service";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { OverviewTab } from "./tabs/OverviewTab";
import { UsageTab } from "./tabs/UsageTab";
import { FinancialTab } from "./tabs/FinancialTab";
import { JourneyTab } from "./tabs/JourneyTab";

export function AnalyticsDashboard() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const stats = await DashboardService.getStats();
            console.log("Stats carregados:", stats);
            setData(stats);
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro: ${error.message || "Falha ao carregar métricas"}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando métricas em tempo real...</p>
            </div>
        );
    }

    if (!data) return (
        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum dado disponível.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="w-full md:w-[250px]">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger className="w-full bg-card/50 border-white/5 backdrop-blur-sm">
                                <SelectValue placeholder="Selecione a visualização" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="overview">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" /> Visão Geral
                                    </div>
                                </SelectItem>
                                <SelectItem value="financial">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" /> Financeiro & Vendas
                                    </div>
                                </SelectItem>
                                <SelectItem value="usage">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4" /> Uso & Engajamento
                                    </div>
                                </SelectItem>
                                <SelectItem value="journey">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Jornada & Risco
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 self-start sm:self-center">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-500">Live Database</span>
                    </div>
                </div>

                <div className="mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <TabsContent value="overview" className="space-y-4 m-0">
                        <OverviewTab data={data} />
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4 m-0">
                        <FinancialTab data={data} />
                    </TabsContent>

                    <TabsContent value="usage" className="space-y-4 m-0">
                        <UsageTab data={data} />
                    </TabsContent>

                    <TabsContent value="journey" className="space-y-4 m-0">
                        <JourneyTab data={data} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
