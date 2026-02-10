import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PaymentHistoryDialogProps {
    userId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName?: string | null;
}

interface PaymentTransaction {
    id: string;
    created_at: string;
    amount: number;
    status: string;
    external_id: string | null;
    plans: {
        name: string;
    } | null;
}

export function PaymentHistoryDialog({ userId, open, onOpenChange, userName }: PaymentHistoryDialogProps) {
    const { data: payments, isLoading, error } = useQuery({
        queryKey: ["admin-user-payments", userId],
        queryFn: async () => {
            if (!userId) return [];

            // 1. Fetch transactions
            const { data: transactions, error: txError } = await (supabase as any)
                .from("payment_transactions")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (txError) throw txError;

            // 2. Fetch plans
            const { data: plans, error: plansError } = await (supabase as any)
                .from("plans")
                .select("id, name");

            if (plansError) {
                console.error("Error fetching plans:", plansError);
                // Continue without plans if fail, or throw? 
                // Better to throw effectively or just return transactions with unknown plan
            }

            // 3. Merge
            const plansMap = new Map(plans?.map((p: any) => [p.id, p]) || []);

            return transactions.map((tx: any) => ({
                ...tx,
                plans: plansMap.get(tx.plan_id) || { name: 'Plano desconhecido' }
            })) as PaymentTransaction[];
        },
        enabled: !!userId && open,
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
            case "completed":
                return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Aprovado</Badge>;
            case "pending":
                return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pendente</Badge>;
            case "cancelled":
            case "rejected":
                return <Badge variant="destructive">Cancelado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Histórico de Pagamentos {userName ? `- ${userName}` : ""}</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-8 text-red-400">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>Erro ao carregar pagamentos</p>
                    </div>
                ) : !payments || payments.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                        Nenhum pagamento encontrado para este usuário.
                    </div>
                ) : (
                    <div className="rounded-md border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Plano / Descrição</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">ID Externo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>
                                            {(payment.plans as any)?.name || "Plano desconhecido"}
                                        </TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(payment.status)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                            {payment.external_id || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
