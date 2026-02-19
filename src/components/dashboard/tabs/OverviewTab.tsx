import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/services/dashboard-service";
import { Users, DollarSign, Zap, TrendingDown, UserPlus, Clock, AlertTriangle, CreditCard, UserX } from "lucide-react";

interface OverviewTabProps {
    data: DashboardStats;
}

export function OverviewTab({ data }: OverviewTabProps) {
    const { overview } = data;

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const cards = [
        {
            title: "MRR (Receita Mensal)",
            value: formatCurrency(overview.financials.mrr || 0),
            subtext: `ARR: ${formatCurrency(overview.financials.arr || 0)}`,
            icon: DollarSign,
            color: "text-green-400",
            bg: "bg-green-500/10",
            description: "Receita recorrente mensal atual"
        },
        {
            title: "Usuários Ativos",
            value: overview.users.active.toString(),
            subtext: `Total Cadastrados: ${overview.users.total}`,
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            description: "Assinantes ativos na plataforma"
        },
        {
            title: "Novos Usuários (7 dias)",
            value: (overview.users.new_7d || 0).toString(),
            subtext: "Crescimento recente",
            icon: UserPlus,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            description: "Novos cadastros na última semana"
        },
        {
            title: "Pagos Ativos",
            value: (overview.users.active_paid || 0).toString(),
            subtext: "Status: paid_active",
            icon: CreditCard,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            description: "Assinantes premium ativos"
        },
        {
            title: "Taxa de Conversão",
            value: `${(overview.rates.conversion || 0).toFixed(1)}%`,
            subtext: "Ticket Premium",
            icon: Zap,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            description: "Conversão Trial → Pago (30d)"
        },
        {
            title: "Tempo Médio Diário",
            value: `${overview.usage.avg_minutes.toFixed(0)} min`,
            subtext: "Por usuário ativo",
            icon: Clock,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            description: "Engajamento real (sessão ativa)"
        },
        {
            title: "Em Trial",
            value: overview.users.trial.toString(),
            subtext: "Potenciais conversões",
            icon: UserPlus,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            description: "Usuários testando gratuitamente"
        },
        {
            title: "Trial Expirado",
            value: (overview.users.expired_trials || 0).toString(),
            subtext: "Status: trial_expired",
            icon: UserX,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            description: "Trials que não converteram"
        },
        {
            title: "Inadimplentes",
            value: (overview.users.delinquent || 0).toString(),
            subtext: "Status: delinquent",
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            description: "Pagamentos pendentes ou falhos"
        },
        {
            title: "Churn Mensal",
            value: `${overview.rates.churn.toFixed(1)}%`,
            subtext: `Dias Inativos Médio: ${overview.usage.avg_days_inactive_churn.toFixed(0)}`,
            icon: TrendingDown,
            color: "text-rose-400",
            bg: "bg-rose-500/10",
            description: "Cancelamentos nos últimos 30 dias"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card, idx) => (
                    <Card key={idx} className="bg-card/50 border-white/5 backdrop-blur-sm hover:border-primary/20 transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                            <div className={`p-2 rounded-lg ${card.bg} group-hover:scale-110 transition-transform`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">{card.subtext}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 mt-2 border-t border-white/5 pt-2">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Helper Alert */}
            {overview.financials.mrr === 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-amber-500">Dados Iniciais</h4>
                        <p className="text-xs text-amber-500/80">
                            O painel está conectado, mas ainda não há dados financeiros suficientes.
                            Crie assinaturas de teste ou popule a tabela 'subscriptions' para ver o MRR.
                            A migração para rastreamento de atividade também precisa ser aplicada.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
