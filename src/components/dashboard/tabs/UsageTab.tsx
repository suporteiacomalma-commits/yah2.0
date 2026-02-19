import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from "@/services/dashboard-service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsageTabProps {
    data: DashboardStats;
}

export function UsageTab({ data }: UsageTabProps) {
    const { usage_heatmap } = data;

    const chartData = usage_heatmap.map(item => ({
        ...item,
        formattedDate: format(new Date(item.date), "dd/MM", { locale: ptBR }),
        "Tempo (min)": item.minutes,
        "Telas": item.screen_views,
        "Ideias": item.ideas_inbox,
        "Calendário": item.calendar_events
    }));

    return (
        <div className="space-y-6">
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Atividade Diária (Últimos 30 dias)</CardTitle>
                    <CardDescription>
                        Visualização do engajamento dos usuários por dia.
                        Barras mostram minutos de uso e visualizações de tela.
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="formattedDate"
                                stroke="#666"
                                tick={{ fill: '#666', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#666"
                                tick={{ fill: '#666', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#e4e4e7' }}
                                cursor={{ fill: '#ffffff10' }}
                            />
                            <Legend />
                            <Bar dataKey="Tempo (min)" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Telas" stackId="b" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm">Uso de Features</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#333" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="formattedDate" type="category" hide />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                                <Bar dataKey="Ideias" fill="#F59E0B" stackId="a" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Calendário" fill="#10B981" stackId="a" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full" /> Ideias Criadas</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Eventos Agendados</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-white/5 backdrop-blur-sm flex flex-col justify-center p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-foreground">Engajamento</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-sm text-muted-foreground">Tempo Médio Geral</span>
                            <span className="text-lg font-bold text-foreground">{data.overview.usage.avg_daily_general.toFixed(1)} min</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-sm text-muted-foreground">Por Usuário Ativo</span>
                            <span className="text-lg font-bold text-emerald-400">{data.overview.usage.avg_daily_active_users.toFixed(1)} min</span>
                        </div>

                        <div className="flex justify-between items-center pb-2">
                            <span className="text-sm text-muted-foreground">Dias Ativos (Trial)</span>
                            <span className="text-lg font-bold text-blue-400">{data.overview.usage.avg_trial_days.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ 7 dias</span></span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                        <p className="text-xs text-muted-foreground">
                            Total de <span className="text-foreground font-bold">{usage_heatmap.reduce((acc, curr) => acc + curr.screen_views, 0)}</span> interações de tela
                        </p>
                    </div>
                </Card>

                <Card className="bg-card/50 border-white/5 backdrop-blur-sm flex flex-col justify-center p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-foreground">Top 5 Telas</h3>
                    </div>

                    <div className="space-y-4">
                        {data.overview.usage.top_screens && data.overview.usage.top_screens.length > 0 ? (
                            data.overview.usage.top_screens.map((screen, index) => {
                                const names: Record<string, string> = {
                                    'screen_dashboard': 'Dashboard',
                                    'screen_assistant': 'Assistente',
                                    'screen_ideas': 'Ideias',
                                    'screen_structure': 'Estrutura Semanal',
                                    'screen_projects': 'Projetos',
                                    'screen_calendar': 'Calendário',
                                    'screen_profile': 'Perfil',
                                    'screen_other': 'Outros'
                                };
                                const displayName = names[screen.name] || screen.name;

                                return (
                                    <div key={index} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                                        <span className="text-sm text-muted-foreground">{displayName}</span>
                                        <span className="text-lg font-bold text-foreground">{screen.percentage.toFixed(0)}%</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-muted-foreground text-sm py-4">
                                Aguardando dados de navegação...
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                        <p className="text-xs text-muted-foreground">
                            Baseado em usuários únicos nos últimos 30 dias
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
