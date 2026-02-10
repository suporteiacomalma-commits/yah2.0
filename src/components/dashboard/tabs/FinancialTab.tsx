import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from "@/services/dashboard-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialTabProps {
    data: DashboardStats;
}

export function FinancialTab({ data }: FinancialTabProps) {
    const { financials } = data;

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Methods Chart */}
            <Card className="col-span-1 bg-card/50 border-white/5 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Métodos de Pagamento</CardTitle>
                    <CardDescription>Distribuição por volume</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={financials.methods}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                            >
                                {financials.methods.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#e4e4e7' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                        {financials.methods.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="capitalize">{entry.payment_method || 'Outro'}: {entry.count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions List */}
            <Card className="col-span-1 lg:col-span-2 bg-card/50 border-white/5 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Transações Recentes</CardTitle>
                    <CardDescription>Últimas 10 movimentações financeiras</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-white/5">
                                <TableHead>Usuário</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {financials.recent.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        Nenhuma transação registrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                financials.recent.map((tx) => (
                                    <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                                        <TableCell className="font-medium text-xs">{tx.user_email}</TableCell>
                                        <TableCell>{formatCurrency(tx.amount)}</TableCell>
                                        <TableCell className="capitalize text-muted-foreground">{tx.payment_method}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`
                            ${tx.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                        tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                            'bg-red-500/10 text-red-500 border-red-500/20'}
                            text-[10px] uppercase font-bold
                          `}
                                            >
                                                {tx.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
