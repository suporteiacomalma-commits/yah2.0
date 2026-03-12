import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from "@/services/dashboard-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface JourneyTabProps {
    data: DashboardStats;
}

export function JourneyTab({ data }: JourneyTabProps) {
    const { journey } = data;

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'high_risk':
                return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Alto Risco</Badge>;
            case 'churned':
                return <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Churned</Badge>;
            case 'healthy':
                return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 gap-1"><CheckCircle className="w-3 h-3" /> Saudável</Badge>;
            case 'medium_risk':
                return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Médio Risco</Badge>;
            default:
                return <Badge variant="outline">Normal</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'active': 'bg-green-500/10 text-green-500 border-green-500/20',
            'paid_active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'trial': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'trial_active': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'trial_expired': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            'past_due': 'bg-red-500/10 text-red-500 border-red-500/20',
            'delinquent': 'bg-red-500/10 text-red-500 border-red-500/20',
            'canceled': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
            'cancelled': 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        };

        return (
            <Badge variant="outline" className={`capitalize text-[10px] ${styles[status] || ''}`}>
                {status?.replace('_', ' ')}
            </Badge>
        );
    };

    const RetentionDay = ({ active, label, isFuture }: { active: boolean, label: string, isFuture: boolean }) => (
        <div className="flex flex-col items-center gap-0.5" title={`${label}: ${isFuture ? 'Futuro' : (active ? 'Acessou' : 'Não acessou')}`}>
            <span className="text-[9px] text-muted-foreground font-mono">{label}</span>
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isFuture 
                    ? 'border border-white/10 bg-white/5' 
                    : active 
                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            }`} />
        </div>
    );

    const isDayInFuture = (createdAt: string, dayOffset: number) => {
        const registrationDate = new Date(createdAt);
        registrationDate.setHours(0, 0, 0, 0);
        const targetDate = new Date(registrationDate);
        targetDate.setDate(registrationDate.getDate() + dayOffset);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        return targetDate > now;
    };

    return (
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Jornada do Usuário & Risco de Churn</CardTitle>
                <CardDescription>
                    Monitoramento detalhado de atividade, retenção e saúde da conta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead>Último Login</TableHead>
                            <TableHead className="text-center">Frequência</TableHead>
                            <TableHead className="text-center">Retenção (D1-D7)</TableHead>
                            <TableHead className="text-center">Risco</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journey.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    Nenhum usuário encontrado para análise.
                                </TableCell>
                            </TableRow>
                        ) : (
                            journey.map((user) => (
                                <TableRow key={user.user_id} className="border-white/5 hover:bg-white/5">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.full_name || 'Usuário sem nome'}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(user.sub_status || 'active')}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {user.days_since_last_login !== null ? `${user.days_since_last_login}d` : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                        {user.weekly_frequency !== null ? `${user.weekly_frequency}/7` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            <RetentionDay active={user.d1} label="D1" isFuture={isDayInFuture(user.created_at, 0)} />
                                            <RetentionDay active={user.d2} label="D2" isFuture={isDayInFuture(user.created_at, 1)} />
                                            <RetentionDay active={user.d3} label="D3" isFuture={isDayInFuture(user.created_at, 2)} />
                                            <RetentionDay active={user.d4} label="D4" isFuture={isDayInFuture(user.created_at, 3)} />
                                            <RetentionDay active={user.d5} label="D5" isFuture={isDayInFuture(user.created_at, 4)} />
                                            <RetentionDay active={user.d6} label="D6" isFuture={isDayInFuture(user.created_at, 5)} />
                                            <RetentionDay active={user.d7} label="D7" isFuture={isDayInFuture(user.created_at, 6)} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getRiskBadge(user.risk_level)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
