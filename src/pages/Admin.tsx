import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Shield, Loader2, Settings, Key, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRole";

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { users, isLoading: usersLoading, assignRole, removeRole, updateSubscription } = useAdminUsers();
  const { settings, isLoading: settingsLoading, updateSetting, getSetting } = useSystemSettings();

  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && user) {
      toast.error("Acesso negado. Você não tem permissão de administrador.");
      navigate("/dashboard");
    }
  }, [isAdmin, roleLoading, user, navigate]);

  useEffect(() => {
    const key = getSetting("openai_api_key");
    if (key) {
      setOpenaiKey(key.value);
    }
  }, [settings]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      if (newRole === "none") {
        await removeRole.mutateAsync(userId);
        toast.success("Role removida com sucesso");
      } else {
        await assignRole.mutateAsync({ userId, role: newRole as AppRole });
        toast.success("Role atualizada com sucesso");
      }
    } catch (error) {
      toast.error("Erro ao atualizar role");
      console.error(error);
    }
  };



  const handleUpdateSubscription = async (userId: string, plan: 'premium' | 'trial') => {
    try {
      await updateSubscription.mutateAsync({
        userId,
        updates: {
          subscription_plan: plan,
          subscription_status: 'active',
          // If premium, trial date becomes irrelevant but we keep it
        }
      });
      toast.success(`Plano atualizado para ${plan}`);
    } catch (error) {
      toast.error("Erro ao atualizar plano");
    }
  };

  const handleExtendTrial = async (userId: string) => {
    try {
      // Add 7 days to current time (or current trial end if in future? simpler to just add 7 days from now)
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 7);

      await updateSubscription.mutateAsync({
        userId,
        updates: {
          subscription_plan: 'trial',
          subscription_status: 'active',
          trial_ends_at: newEndDate.toISOString()
        }
      });
      toast.success("Trial estendido por 7 dias");
    } catch (error) {
      toast.error("Erro ao estender trial");
    }
  };

  const handleSaveSettings = async () => {
    if (!openaiKey) {
      toast.error("A chave da API do OpenAI não pode estar vazia");
      return;
    }
    await updateSetting.mutateAsync({
      key: "openai_api_key",
      value: openaiKey,
      description: "Chave da API do OpenAI para integração com o assistente"
    });
  };

  const getRoleBadge = (role?: AppRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>;
      case "moderator":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Moderador</Badge>;
      case "user":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Usuário</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Sem role</Badge>;
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Gerencie a plataforma e seus usuários</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold text-foreground">{users.length}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    <span className="text-2xl font-bold text-foreground">
                      {users.filter((u) => u.role === "admin").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Onboarding Completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {users.filter((u) => u.onboarding_completed).length}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {users.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground w-[100px]">Data</TableHead>
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">Status Assinatura</TableHead>
                      <TableHead className="text-muted-foreground">Plano</TableHead>
                      <TableHead className="text-muted-foreground">Trial (Dias)</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userItem) => {
                      const trialEnds = userItem.trial_ends_at ? new Date(userItem.trial_ends_at) : null;
                      const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      const isExpired = daysLeft < 0 && userItem.subscription_plan === 'trial';

                      return (
                        <TableRow key={userItem.id} className="border-border">
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(userItem.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            <div className="flex flex-col">
                              <span>{userItem.full_name || userItem.user_name || "—"}</span>
                              <span className="text-xs text-muted-foreground">{userItem.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={userItem.subscription_status === 'active' ? "default" : "secondary"} className={
                              userItem.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''
                            }>
                              {userItem.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              userItem.subscription_plan === 'premium'
                                ? "border-purple-500 text-purple-400"
                                : "text-muted-foreground"
                            }>
                              {userItem.subscription_plan === 'premium' ? 'Premium' : 'Trial'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {userItem.subscription_plan === 'trial' ? (
                              <span className={isExpired ? "text-red-400 font-bold" : "text-muted-foreground"}>
                                {daysLeft > 0 ? `${daysLeft} dias rest.` : "Expirado"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {userItem.subscription_plan !== 'premium' && (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/50"
                                  onClick={() => handleUpdateSubscription(userItem.user_id, 'premium')}
                                >
                                  Ativar Premium
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleExtendTrial(userItem.user_id)}
                              >
                                +7 Dias
                              </Button>
                              <Select
                                value={userItem.role || "none"}
                                onValueChange={(value) => handleRoleChange(userItem.user_id, value)}
                                disabled={assignRole.isPending || removeRole.isPending}
                              >
                                <SelectTrigger className="w-[100px] h-7 text-xs bg-background border-border">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sem role</SelectItem>
                                  <SelectItem value="user">Usuário</SelectItem>
                                  <SelectItem value="moderator">Moderadora</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Integração OpenAI</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Configure as chaves e parâmetros de inteligência artificial
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="text-foreground">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openai-key"
                        type={showKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={updateSetting.isPending || settingsLoading}
                      className="gradient-primary text-white"
                    >
                      {updateSetting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Esta chave será usada para alimentar o Assistente Virtual e as funcionalidades de análise de dados.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
