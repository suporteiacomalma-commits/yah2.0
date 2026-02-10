import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from "@/services/dashboard-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
                return <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Cancelado</Badge>;
            case 'healthy':
                return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 gap-1"><CheckCircle className="w-3 h-3" /> Saudável</Badge>;
            default:
                return <Badge variant="outline">Normal</Badge>;
        }
    };

    return (
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Jornada do Usuário & Risco de Churn</CardTitle>
                <CardDescription>
                    Monitoramento de usuários em trial e assinantes.
                    Risco calculado baseado na inatividade recente vs. tempo de conta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status Assinatura</TableHead>
                            <TableHead>Tempo de Vida</TableHead>
                            <TableHead className="text-right">Minutos/Semana</TableHead>
                            <TableHead className="text-center">Risco / Saúde</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journey.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
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
                                        <Badge variant="outline" className="capitalize text-[10px]">
                                            {user.sub_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(user.created_at), { locale: ptBR, addSuffix: true })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {user.weekly_minutes} min
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
