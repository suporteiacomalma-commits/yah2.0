import { useState } from "react";
import { usePlans, Plan } from "@/hooks/usePlans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PlanManagement() {
    const { plans, isLoading, createPlan, updatePlan, deletePlan } = usePlans(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

    const handleSave = async () => {
        if (!editingPlan?.id || !editingPlan?.name || !editingPlan?.amount) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        try {
            if (plans.find((p) => p.id === editingPlan.id) && !editingPlan.created_at) {
                // If it exists but we are in "create" mode, it's an update or conflict
                await updatePlan.mutateAsync(editingPlan as Plan & { id: string });
            } else if (editingPlan.created_at) {
                await updatePlan.mutateAsync(editingPlan as Plan & { id: string });
            } else {
                await createPlan.mutateAsync(editingPlan as Plan);
            }

            toast.success("Plano salvo com sucesso");
            setIsDialogOpen(false);
            setEditingPlan(null);
        } catch (error) {
            toast.error("Erro ao salvar plano");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este plano?")) {
            try {
                await deletePlan.mutateAsync(id);
                toast.success("Plano excluído");
            } catch (error) {
                toast.error("Erro ao excluir plano");
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Gestão de Planos</h2>
                    <p className="text-sm text-muted-foreground">Configure os valores e benefícios disponíveis</p>
                </div>
                <Button onClick={() => { setEditingPlan({ is_active: true, popular: false, frequency: "ONE_TIME" }); setIsDialogOpen(true); }} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                </Button>
            </div>

            <Card className="bg-card border-border">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead>Nome</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id} className="border-border">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-foreground">{plan.name}</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1">{plan.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>R$ {plan.amount}</TableCell>
                                    <TableCell>{plan.period}</TableCell>
                                    <TableCell>
                                        {plan.is_active ? (
                                            <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Ativo</Badge>
                                        ) : (
                                            <Badge variant="secondary">Inativo</Badge>
                                        )}
                                        {plan.popular && <Badge className="ml-2 bg-purple-500/20 text-purple-400">Popular</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" onClick={() => { setEditingPlan(plan); setIsDialogOpen(true); }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(plan.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle>{editingPlan?.created_at ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                        <DialogDescription>Defina os detalhes do plano de assinatura.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="plan_id">ID do Plano (Slug)</Label>
                                <Input
                                    id="plan_id"
                                    disabled={!!editingPlan?.created_at}
                                    value={editingPlan?.id || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value })}
                                    placeholder="ex: plano_anual"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Exibido</Label>
                                <Input
                                    id="name"
                                    value={editingPlan?.name || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    placeholder="ex: Plano Anual"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                                id="description"
                                value={editingPlan?.description || ""}
                                onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                placeholder="ex: Acesso ilimitado por 1 ano"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Valor (R$)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={editingPlan?.amount || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, amount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="period">Período</Label>
                                <Input
                                    id="period"
                                    value={editingPlan?.period || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, period: e.target.value })}
                                    placeholder="ex: 12 meses"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="badge">Badge (opcional)</Label>
                                <Input
                                    id="badge"
                                    value={editingPlan?.badge || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                                    placeholder="ex: RECOMENDADO"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                                <input
                                    type="checkbox"
                                    id="popular"
                                    checked={editingPlan?.popular}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                                    className="w-4 h-4 rounded border-border bg-background"
                                />
                                <Label htmlFor="popular">Marcar como Popular</Label>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={editingPlan?.is_active}
                                onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-border bg-background"
                            />
                            <Label htmlFor="is_active">Plano Ativo (visível para usuários)</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} className="gradient-primary">Salvar Plano</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
