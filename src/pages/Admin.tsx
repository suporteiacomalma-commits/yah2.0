import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { PlanManagement } from "@/components/admin/PlanManagement";
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
import { ArrowLeft, Users, Shield, Loader2, Settings, Key, Save, Eye, EyeOff, Edit2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRole";
import type { AdminUser } from "@/hooks/useAdminUsers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

function AdminDashboard({ users }: { users: AdminUser[] }) {
  // 1. Growth Data (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  const growthData = last30Days.map(date => {
    const count = users.filter(u => u.created_at.startsWith(date)).length;
    // Cumulative count would be better, but daily reveals spikes
    return {
      date: new Date(date).toLocaleDateString("pt-BR", { day: 'numeric', month: 'short' }),
      users: count
    };
  });

  // 2. Subscription Data
  const subscriptionStats = [
    { name: "Trial", value: users.filter(u => u.subscription_plan === "trial").length },
    { name: "Premium", value: users.filter(u => u.subscription_plan === "premium").length },
  ];

  // 3. KPI Calculations
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.subscription_plan === "premium").length;
  const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : "0";
  const activeTrials = users.filter(u => {
    const trialEnds = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
    return u.subscription_plan === 'trial' && trialEnds && trialEnds > new Date();
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversão Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{conversionRate}%</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trials Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{activeTrials}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Novos Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {users.filter(u => u.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {((users.filter(u => u.onboarding_completed).length / (totalUsers || 1)) * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <Card className="md:col-span-2 bg-card border-border p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crescimento de Usuários (30 dias)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#8B5CF6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subscription Pie Chart */}
        <Card className="bg-card border-border p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Distribuição de Planos
          </h3>
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={subscriptionStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subscriptionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-4">
              {subscriptionStats.map((stat, i) => (
                <div key={stat.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm text-muted-foreground">{stat.name}: {stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { users, isLoading: usersLoading, assignRole, removeRole, updateSubscription, updateUserAuth } = useAdminUsers();
  const { settings, isLoading: settingsLoading, updateSetting, getSetting } = useSystemSettings();

  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [abacatePayKey, setAbacatePayKey] = useState("");
  const [showAbacateKey, setShowAbacateKey] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState("");
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState("");
  const [showMPAccessToken, setShowMPAccessToken] = useState(false);


  // Edit User State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [trialDaysMap, setTrialDaysMap] = useState<Record<string, string>>({});

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
    const okey = getSetting("openai_api_key");
    if (okey) setOpenaiKey(okey.value);

    const akey = getSetting("abacate_pay_api_key");
    if (akey) setAbacatePayKey(akey.value);

    const spk = getSetting("stripe_publishable_key");
    if (spk) setStripePublishableKey(spk.value);

    const ssk = getSetting("stripe_secret_key");
    if (ssk) setStripeSecretKey(ssk.value);

    const sws = getSetting("stripe_webhook_secret");
    if (sws) setStripeWebhookSecret(sws.value);

    const mp_pk = getSetting("mercado_pago_public_key");
    if (mp_pk) setMercadoPagoPublicKey(mp_pk.value);

    const mp_at = getSetting("mercado_pago_access_token");
    if (mp_at) setMercadoPagoAccessToken(mp_at.value);
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
          active_plan_id: plan === 'trial' ? null : undefined
        }
      });
      toast.success(`Plano atualizado para ${plan}`);
    } catch (error) {
      toast.error("Erro ao atualizar plano");
    }
  };

  const handleExtendTrial = async (userId: string, days: number = 7) => {
    try {
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + days);

      await updateSubscription.mutateAsync({
        userId,
        updates: {
          subscription_plan: 'trial',
          subscription_status: 'active',
          trial_ends_at: newEndDate.toISOString(),
          active_plan_id: null
        }
      });
      toast.success(`Trial definido para mais ${days} dias`);
    } catch (error) {
      toast.error("Erro ao atualizar trial");
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    try {
      // 1. Update sensitive auth info if changed
      const originalUser = users.find(u => u.user_id === editingUser.user_id);
      const emailChanged = editingUser.email !== originalUser?.email;

      if (emailChanged || newPassword) {
        await updateUserAuth.mutateAsync({
          userId: editingUser.user_id,
          email: emailChanged ? editingUser.email || undefined : undefined,
          password: newPassword || undefined
        });
      }

      // 2. Update profile info
      const { id, user_id, created_at, role, ...updates } = editingUser;
      await updateSubscription.mutateAsync({
        userId: user_id,
        updates
      });

      toast.success("Informações do usuário atualizadas");
      setEditingUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settingsToUpdate = [
        {
          key: "openai_api_key",
          value: openaiKey,
          description: "Chave da API do OpenAI para integração com o assistente"
        },
        {
          key: "abacate_pay_api_key",
          value: abacatePayKey,
          description: "Chave da API do AbacatePay para processamento de pagamentos"
        },
        {
          key: "stripe_publishable_key",
          value: stripePublishableKey,
          description: "Chave pública do Stripe"
        },
        {
          key: "stripe_secret_key",
          value: stripeSecretKey,
          description: "Chave secreta do Stripe"
        },
        {
          key: "stripe_webhook_secret",
          value: stripeWebhookSecret,
          description: "Segredo do Webhook do Stripe"
        },
        {
          key: "mercado_pago_public_key",
          value: mercadoPagoPublicKey.trim(),
          description: "Public Key do Mercado Pago"
        },
        {
          key: "mercado_pago_access_token",
          value: mercadoPagoAccessToken.trim(),
          description: "Access Token do Mercado Pago"
        }
      ];

      // Validate Mercado Pago keys consistency
      const isMPPublicTest = mercadoPagoPublicKey.trim().startsWith("TEST-");
      const isMPAccessTest = mercadoPagoAccessToken.trim().startsWith("TEST-");
      const isMPPublicProd = mercadoPagoPublicKey.trim().startsWith("APP_USR-");
      const isMPAccessProd = mercadoPagoAccessToken.trim().startsWith("APP_USR-");

      if (mercadoPagoPublicKey && mercadoPagoAccessToken) {
        if ((isMPPublicTest && isMPAccessProd) || (isMPPublicProd && isMPAccessTest)) {
          toast.error("Erro de configuração: Você está misturando chaves de TESTE com chaves de PRODUÇÃO no Mercado Pago. Ambas devem ser do mesmo tipo.");
          return;
        }
      }

      await Promise.all(
        settingsToUpdate.map(setting => updateSetting.mutateAsync(setting))
      );

      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar algumas configurações");
    }
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

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Planos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AdminDashboard users={users} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">

            {/* Users Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Usuários</CardTitle>
              </CardHeader>
              <CardContent>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground w-[100px]">Data</TableHead>
                        <TableHead className="text-muted-foreground min-w-[200px]">Nome</TableHead>
                        <TableHead className="text-muted-foreground">Status Assinatura</TableHead>
                        <TableHead className="text-muted-foreground">Plano</TableHead>
                        <TableHead className="text-muted-foreground">Trial (Dias)</TableHead>
                        <TableHead className="text-muted-foreground">Role</TableHead>
                        <TableHead className="text-muted-foreground text-right min-w-[300px]">Ações</TableHead>
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
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    className="w-16 h-7 text-xs px-2"
                                    placeholder="Dias"
                                    value={trialDaysMap[userItem.user_id] || ""}
                                    onChange={(e) => setTrialDaysMap({ ...trialDaysMap, [userItem.user_id]: e.target.value })}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => {
                                      const days = parseInt(trialDaysMap[userItem.user_id] || "7");
                                      handleExtendTrial(userItem.user_id, days);
                                    }}
                                  >
                                    Definir Trial
                                  </Button>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingUser(userItem)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {userItem.subscription_plan !== 'premium' && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/50"
                                    onClick={() => handleUpdateSubscription(userItem.user_id, 'premium')}
                                  >
                                    Ativar Premium
                                  </Button>
                                )}
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
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4">
                  {users.map((userItem) => {
                    const trialEnds = userItem.trial_ends_at ? new Date(userItem.trial_ends_at) : null;
                    const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const isExpired = daysLeft < 0 && userItem.subscription_plan === 'trial';

                    return (
                      <div key={userItem.id} className="bg-background/50 border border-border p-4 rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-foreground">{userItem.full_name || userItem.user_name || "—"}</h4>
                            <p className="text-xs text-muted-foreground">{userItem.email}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Cadastrado em: {new Date(userItem.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getRoleBadge(userItem.role)}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingUser(userItem)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex flex-col gap-1 p-2 bg-background/50 rounded-lg">
                            <span className="text-[10px] text-muted-foreground uppercase">Status</span>
                            <Badge variant={userItem.subscription_status === 'active' ? "default" : "secondary"} className={
                              userItem.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 w-fit' : 'w-fit'
                            }>
                              {userItem.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-1 p-2 bg-background/50 rounded-lg">
                            <span className="text-[10px] text-muted-foreground uppercase">Plano</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={
                                userItem.subscription_plan === 'premium'
                                  ? "border-purple-500 text-purple-400 w-fit"
                                  : "text-muted-foreground w-fit"
                              }>
                                {userItem.subscription_plan === 'premium' ? 'Premium' : 'Trial'}
                              </Badge>
                              {userItem.subscription_plan === 'trial' && (
                                <span className={`text-xs ${isExpired ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                                  {daysLeft > 0 ? `${daysLeft}d` : "Exp."}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground min-w-[60px]">Role:</span>
                            <Select
                              value={userItem.role || "none"}
                              onValueChange={(value) => handleRoleChange(userItem.user_id, value)}
                              disabled={assignRole.isPending || removeRole.isPending}
                            >
                              <SelectTrigger className="flex-1 h-7 text-xs bg-background border-border">
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

                          {userItem.subscription_plan !== 'premium' && (
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/50"
                              onClick={() => handleUpdateSubscription(userItem.user_id, 'premium')}
                            >
                              Ativar Premium Manualmente
                            </Button>
                          )}

                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-16 h-8 text-xs px-2"
                              placeholder="Dias"
                              value={trialDaysMap[userItem.user_id] || ""}
                              onChange={(e) => setTrialDaysMap({ ...trialDaysMap, [userItem.user_id]: e.target.value })}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs"
                              onClick={() => {
                                const days = parseInt(trialDaysMap[userItem.user_id] || "7");
                                handleExtendTrial(userItem.user_id, days);
                              }}
                            >
                              Definir Trial
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    <CardTitle className="text-foreground">Integrações de API</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Configure as chaves e parâmetros das plataformas externas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI Section */}
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
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Usada para o Assistente Virtual e análise de dados.
                  </p>
                </div>

                <div className="h-px bg-border my-6" />

                {/* AbacatePay Section */}
                <div className="space-y-2">
                  <Label htmlFor="abacate-pay-key" className="text-foreground">AbacatePay API Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="abacate-pay-key"
                        type={showAbacateKey ? "text" : "password"}
                        placeholder="abc_..."
                        value={abacatePayKey}
                        onChange={(e) => setAbacatePayKey(e.target.value)}
                        className="bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAbacateKey(!showAbacateKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAbacateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Usado para processamento de pagamentos e assinaturas PIX.
                  </p>
                </div>

                <div className="h-px bg-border my-6" />

                {/* Stripe Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Stripe (Cartão de Crédito)</h3>

                  <div className="space-y-2">
                    <Label htmlFor="stripe-pk" className="text-foreground">Stripe Publishable Key</Label>
                    <Input
                      id="stripe-pk"
                      placeholder="pk_test_..."
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripe-sk" className="text-foreground">Stripe Secret Key</Label>
                    <div className="relative flex-1">
                      <Input
                        id="stripe-sk"
                        type={showStripeKey ? "text" : "password"}
                        placeholder="sk_test_..."
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        className="bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStripeKey(!showStripeKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showStripeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripe-whs" className="text-foreground">Stripe Webhook Secret</Label>
                    <div className="relative flex-1">
                      <Input
                        id="stripe-whs"
                        type={showWebhookSecret ? "text" : "password"}
                        placeholder="whsec_..."
                        value={stripeWebhookSecret}
                        onChange={(e) => setStripeWebhookSecret(e.target.value)}
                        className="bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Encontrado no Dashboard do Stripe após criar o endpoint do webhook.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border my-6" />

                {/* Mercado Pago Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Mercado Pago (Checkout Transparente)</h3>

                  <div className="space-y-2">
                    <Label htmlFor="mp-pk" className="text-foreground">Mercado Pago Public Key</Label>
                    <Input
                      id="mp-pk"
                      placeholder="APP_USR-..."
                      value={mercadoPagoPublicKey}
                      onChange={(e) => setMercadoPagoPublicKey(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mp-at" className="text-foreground">Mercado Pago Access Token</Label>
                    <div className="relative flex-1">
                      <Input
                        id="mp-at"
                        type={showMPAccessToken ? "text" : "password"}
                        placeholder="APP_USR-..."
                        value={mercadoPagoAccessToken}
                        onChange={(e) => setMercadoPagoAccessToken(e.target.value)}
                        className="bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMPAccessToken(!showMPAccessToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showMPAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>


                <div className="flex justify-end pt-4">
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
                        Salvar Todas as Configurações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <PlanManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Altere as informações de perfil do usuário.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Nome Completo</Label>
                  <Input
                    value={editingUser.full_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">E-mail</Label>
                  <Input
                    type="email"
                    value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Nome de Usuário (@)</Label>
                  <Input
                    value={editingUser.user_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, user_name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Nova Senha (opcional)</Label>
                  <Input
                    type="password"
                    placeholder="Mudar senha..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Bio</Label>
                <textarea
                  className="w-full min-h-[80px] bg-background border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  value={editingUser.bio || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  placeholder="Bio do usuário..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Website</Label>
                <Input
                  value={editingUser.website || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, website: e.target.value })}
                  className="bg-background border-border"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUserEdit} className="gradient-primary">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
