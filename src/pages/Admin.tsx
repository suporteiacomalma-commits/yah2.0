import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Users, Shield, Loader2, Settings, Key, Save, Eye, EyeOff, Edit2, CreditCard, Search, Menu, History, Trash2, MessageCircle, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { PaymentHistoryDialog } from "@/components/admin/PaymentHistoryDialog";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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



export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { users, isLoading: usersLoading, assignRole, removeRole, updateSubscription, updateUserAuth, deleteUser } = useAdminUsers();
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

  // WhatsApp Settings
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [whatsappMsgDaily, setWhatsappMsgDaily] = useState("");
  const [whatsappMsgTrial, setWhatsappMsgTrial] = useState("");
  const [whatsappMsg7Days, setWhatsappMsg7Days] = useState("");
  const [whatsappMsgWelcome, setWhatsappMsgWelcome] = useState("");
  const [whatsappMsgDay1, setWhatsappMsgDay1] = useState("");
  const [whatsappMsgDay2, setWhatsappMsgDay2] = useState("");
  const [whatsappMsgDay3, setWhatsappMsgDay3] = useState("");
  const [whatsappMsgDay4, setWhatsappMsgDay4] = useState("");
  const [whatsappMsgDay5, setWhatsappMsgDay5] = useState("");
  const [whatsappMsgDay6, setWhatsappMsgDay6] = useState("");
  const [whatsappMsgDay7_15h, setWhatsappMsgDay7_15h] = useState("");
  const [whatsappMsgDay7_19h, setWhatsappMsgDay7_19h] = useState("");
  const [whatsappMsgPostPurchase, setWhatsappMsgPostPurchase] = useState("");
  const [whatsappMsgPostPurchaseDay1, setWhatsappMsgPostPurchaseDay1] = useState("");
  const [whatsappMsgPostPurchaseDay2, setWhatsappMsgPostPurchaseDay2] = useState("");
  const [whatsappMsgPostPurchaseDay3, setWhatsappMsgPostPurchaseDay3] = useState("");
  const [whatsappMsgPostPurchaseDay4, setWhatsappMsgPostPurchaseDay4] = useState("");
  const [whatsappMsgPostPurchaseDay5, setWhatsappMsgPostPurchaseDay5] = useState("");
  const [whatsappMsgPostPurchaseDay6, setWhatsappMsgPostPurchaseDay6] = useState("");
  const [whatsappMsgPostPurchaseDay7, setWhatsappMsgPostPurchaseDay7] = useState("");
  const [whatsappMsgPostTrialDay1, setWhatsappMsgPostTrialDay1] = useState("");
  const [whatsappMsgPostTrialDay3, setWhatsappMsgPostTrialDay3] = useState("");
  const [whatsappMsgPostTrialDay7, setWhatsappMsgPostTrialDay7] = useState("");
  const [whatsappMsgDailyReminder, setWhatsappMsgDailyReminder] = useState("");
  const [whatsappTestNumber, setWhatsappTestNumber] = useState("");
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState("");
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState("");
  const [showMPAccessToken, setShowMPAccessToken] = useState(false);


  // Edit User State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [trialDaysMap, setTrialDaysMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);

  // WhatsApp Editing State
  const [editingWhatsappId, setEditingWhatsappId] = useState<string | null>(null);
  const [editingWhatsappValue, setEditingWhatsappValue] = useState("");
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    const wu = getSetting("whatsapp_backend_url");
    if (wu) setWhatsappUrl(wu.value);

    const wt = getSetting("whatsapp_token");
    if (wt) setWhatsappToken(wt.value);

    const wmd = getSetting("whatsapp_msg_daily");
    if (wmd) setWhatsappMsgDaily(wmd.value);

    const wmt = getSetting("whatsapp_msg_trial");
    if (wmt) setWhatsappMsgTrial(wmt.value);

    const wm7 = getSetting("whatsapp_msg_7days");
    if (wm7) setWhatsappMsg7Days(wm7.value);

    const wmw = getSetting("whatsapp_msg_welcome");
    if (wmw) setWhatsappMsgWelcome(wmw.value);

    const wmd1 = getSetting("whatsapp_msg_day1");
    if (wmd1) setWhatsappMsgDay1(wmd1.value);

    const wmd2 = getSetting("whatsapp_msg_day2");
    if (wmd2) setWhatsappMsgDay2(wmd2.value);

    const wmd3 = getSetting("whatsapp_msg_day3");
    if (wmd3) setWhatsappMsgDay3(wmd3.value);

    const wmd4 = getSetting("whatsapp_msg_day4");
    if (wmd4) setWhatsappMsgDay4(wmd4.value);

    const wmd5 = getSetting("whatsapp_msg_day5");
    if (wmd5) setWhatsappMsgDay5(wmd5.value);

    const wmd6 = getSetting("whatsapp_msg_day6");
    if (wmd6) setWhatsappMsgDay6(wmd6.value);

    const wmd7_15 = getSetting("whatsapp_msg_day7_15h");
    if (wmd7_15) setWhatsappMsgDay7_15h(wmd7_15.value);

    const wmd7_19 = getSetting("whatsapp_msg_day7_19h");
    if (wmd7_19) setWhatsappMsgDay7_19h(wmd7_19.value);

    const wmpPostPurchase = getSetting("whatsapp_msg_post_purchase");
    if (wmpPostPurchase) setWhatsappMsgPostPurchase(wmpPostPurchase.value);

    const wmpPostPD1 = getSetting("whatsapp_msg_post_purchase_day1");
    if (wmpPostPD1) setWhatsappMsgPostPurchaseDay1(wmpPostPD1.value);

    const wmpPostPD2 = getSetting("whatsapp_msg_post_purchase_day2");
    if (wmpPostPD2) setWhatsappMsgPostPurchaseDay2(wmpPostPD2.value);

    const wmpPostPD3 = getSetting("whatsapp_msg_post_purchase_day3");
    if (wmpPostPD3) setWhatsappMsgPostPurchaseDay3(wmpPostPD3.value);

    const wmpPostPD4 = getSetting("whatsapp_msg_post_purchase_day4");
    if (wmpPostPD4) setWhatsappMsgPostPurchaseDay4(wmpPostPD4.value);

    const wmpPostPD5 = getSetting("whatsapp_msg_post_purchase_day5");
    if (wmpPostPD5) setWhatsappMsgPostPurchaseDay5(wmpPostPD5.value);

    const wmpPostPD6 = getSetting("whatsapp_msg_post_purchase_day6");
    if (wmpPostPD6) setWhatsappMsgPostPurchaseDay6(wmpPostPD6.value);

    const wmpPostPD7 = getSetting("whatsapp_msg_post_purchase_day7");
    if (wmpPostPD7) setWhatsappMsgPostPurchaseDay7(wmpPostPD7.value);

    const wmpTrialD1 = getSetting("whatsapp_msg_post_trial_day1");
    if (wmpTrialD1) setWhatsappMsgPostTrialDay1(wmpTrialD1.value);

    const wmpTrialD3 = getSetting("whatsapp_msg_post_trial_day3");
    if (wmpTrialD3) setWhatsappMsgPostTrialDay3(wmpTrialD3.value);

    const wmpTrialD7 = getSetting("whatsapp_msg_post_trial_day7");
    if (wmpTrialD7) setWhatsappMsgPostTrialDay7(wmpTrialD7.value);

    const wmdr = getSetting("whatsapp_msg_daily_reminder");
    if (wmdr) setWhatsappMsgDailyReminder(wmdr.value);
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser.mutateAsync(userToDelete.user_id);
      toast.success("Usuário excluído com sucesso");
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário");
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!isAdmin) return;
      const settingsToUpdate = [
        {
          key: "openai_api_key",
          value: openaiKey.trim(),
          description: "Chave da API do OpenAI para integração com o assistente"
        },
        {
          key: "abacate_pay_api_key",
          value: abacatePayKey.trim(),
          description: "Chave da API do AbacatePay para processamento de pagamentos"
        },
        {
          key: "stripe_publishable_key",
          value: stripePublishableKey.trim(),
          description: "Chave pública do Stripe"
        },
        {
          key: "stripe_secret_key",
          value: stripeSecretKey.trim(),
          description: "Chave secreta do Stripe"
        },
        {
          key: "stripe_webhook_secret",
          value: stripeWebhookSecret.trim(),
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
        },
        {
          key: "whatsapp_backend_url",
          value: whatsappUrl.trim(),
          description: "URL do backend do WhatsMeow"
        },
        {
          key: "whatsapp_token",
          value: whatsappToken.trim(),
          description: "Token de autorização do WhatsApp"
        },
        {
          key: "whatsapp_msg_daily",
          value: whatsappMsgDaily,
          description: "Mensagem diária com tarefas"
        },
        {
          key: "whatsapp_msg_trial",
          value: whatsappMsgTrial,
          description: "Mensagem de início do trial"
        },
        {
          key: "whatsapp_msg_7days",
          value: whatsappMsg7Days,
          description: "Mensagem de 7 dias"
        },
        {
          key: "whatsapp_msg_welcome",
          value: whatsappMsgWelcome,
          description: "Mensagem de boas-vindas (premium)"
        },
        {
          key: "whatsapp_msg_day1",
          value: whatsappMsgDay1,
          description: "Mensagem de Dia 1"
        },
        {
          key: "whatsapp_msg_day2",
          value: whatsappMsgDay2,
          description: "Mensagem de Dia 2"
        },
        {
          key: "whatsapp_msg_day3",
          value: whatsappMsgDay3,
          description: "Mensagem de Dia 3"
        },
        {
          key: "whatsapp_msg_day4",
          value: whatsappMsgDay4,
          description: "Mensagem de Dia 4"
        },
        {
          key: "whatsapp_msg_day5",
          value: whatsappMsgDay5,
          description: "Mensagem de Dia 5"
        },
        {
          key: "whatsapp_msg_day6",
          value: whatsappMsgDay6,
          description: "Mensagem de Dia 6"
        },
        {
          key: "whatsapp_msg_day7_15h",
          value: whatsappMsgDay7_15h,
          description: "Mensagem de Dia 7 (15h)"
        },
        {
          key: "whatsapp_msg_day7_19h",
          value: whatsappMsgDay7_19h,
          description: "Mensagem de Dia 7 (19h30)"
        },
        {
          key: "whatsapp_msg_post_purchase",
          value: whatsappMsgPostPurchase,
          description: "Mensagem Pós-compra Imediata (Pagamento Confirmado)"
        },
        {
          key: "whatsapp_msg_post_purchase_day1",
          value: whatsappMsgPostPurchaseDay1,
          description: "Mensagem Pós-compra - Dia 1"
        },
        {
          key: "whatsapp_msg_post_purchase_day2",
          value: whatsappMsgPostPurchaseDay2,
          description: "Mensagem Pós-compra - Dia 2"
        },
        {
          key: "whatsapp_msg_post_purchase_day3",
          value: whatsappMsgPostPurchaseDay3,
          description: "Mensagem Pós-compra - Dia 3"
        },
        {
          key: "whatsapp_msg_post_purchase_day4",
          value: whatsappMsgPostPurchaseDay4,
          description: "Mensagem Pós-compra - Dia 4"
        },
        {
          key: "whatsapp_msg_post_purchase_day5",
          value: whatsappMsgPostPurchaseDay5,
          description: "Mensagem Pós-compra - Dia 5"
        },
        {
          key: "whatsapp_msg_post_purchase_day6",
          value: whatsappMsgPostPurchaseDay6,
          description: "Mensagem Pós-compra - Dia 6"
        },
        {
          key: "whatsapp_msg_post_purchase_day7",
          value: whatsappMsgPostPurchaseDay7,
          description: "Mensagem Pós-compra - Dia 7"
        },
        {
          key: "whatsapp_msg_post_trial_day1",
          value: whatsappMsgPostTrialDay1,
          description: "Mensagem Pós-trial Não Comprou - D+1"
        },
        {
          key: "whatsapp_msg_post_trial_day3",
          value: whatsappMsgPostTrialDay3,
          description: "Mensagem Pós-trial Não Comprou - D+3"
        },
        {
          key: "whatsapp_msg_post_trial_day7",
          value: whatsappMsgPostTrialDay7,
          description: "Mensagem Pós-trial Não Comprou - D+7"
        },
        {
          key: "whatsapp_msg_daily_reminder",
          value: whatsappMsgDailyReminder,
          description: "Lembrete Diário (Agenda e Conteúdos)"
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

  const handleTestDailyReminderReal = async () => {
    if (!whatsappTestNumber) {
      toast.error("Preencha o Número de Teste primeiro.");
      return;
    }
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    try {
      setIsTestingWa(true);
      const cleanNumber = whatsappTestNumber.replace(/\D/g, '');
      const { data, error } = await supabase.functions.invoke('cron-daily-reminders', {
        body: {
          test_whatsapp: cleanNumber,
          test_user_id: user.id
        }
      });

      if (error) throw error;

      if (data && data.sent === 0) {
        toast.warning("O teste rodou, mas seu usuário foi ignorado. (Talvez sua assinatura não esteja 'active' ou houve erro na substituição).");
      } else {
        toast.success("Teste Dinâmico enviado com sucesso!");
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar Teste Dinâmico.");
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleTestWhatsapp = async (messageTemplate: string, messageName: string) => {
    const missing = [];
    if (!whatsappUrl) missing.push("URL do Backend");
    if (!whatsappToken) missing.push("Token");
    if (!whatsappTestNumber) missing.push("Número de Teste");
    if (!messageTemplate) missing.push("Mensagem (" + messageName + ")");

    if (missing.length > 0) {
      toast.error(`Preencha os seguintes campos antes de testar: ${missing.join(", ")}`);
      return;
    }

    try {
      setIsTestingWa(true);

      const currentUserProfile = users.find(u => u.user_id === user?.id);
      const fullName = currentUserProfile?.full_name || currentUserProfile?.user_name || "Usuário Teste";
      const firstName = fullName.split(' ')[0];

      const finalMessage = messageTemplate
        .replace(/\{\{nome\}\}/gi, firstName)
        .replace(/\{\{nome_completo\}\}/gi, fullName);

      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: {
          url: whatsappUrl,
          token: whatsappToken,
          number: whatsappTestNumber.replace(/\D/g, ''),
          body: finalMessage,
          openTicket: 0,
          queueId: "45"
        }
      });

      if (error) {
        throw new Error(error.message || "Erro desconhecido ao chamar API de Whatsapp");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`Mensagem de teste "${messageName}" enviada com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao testar whatsapp:", error);
      toast.error(`Falha ao enviar mensagem de teste: ${error.message}`);
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleSaveWhatsapp = async (userId: string) => {
    try {
      await updateSubscription.mutateAsync({
        userId,
        updates: { whatsapp: editingWhatsappValue.replace(/\D/g, '') }
      });
      toast.success("WhatsApp atualizado com sucesso!");
      setEditingWhatsappId(null);
    } catch (error) {
      toast.error("Erro ao atualizar WhatsApp.");
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="w-full justify-start px-4 gap-2 border-border bg-card">
                  <Menu className="h-4 w-4" />
                  <span className="capitalize">{
                    activeTab === 'dashboard' ? 'Painel' :
                      activeTab === 'users' ? 'Usuários' :
                        activeTab === 'settings' ? 'Integrações' :
                          'Planos'
                  }</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80vw] sm:w-[350px] bg-card border-r border-border">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Navegue pelo painel administrativo</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  <Button variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setActiveTab('dashboard')}>
                    <Settings className="h-4 w-4" /> Painel
                  </Button>
                  <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setActiveTab('users')}>
                    <Users className="h-4 w-4" /> Usuários
                  </Button>
                  <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setActiveTab('settings')}>
                    <Key className="h-4 w-4" /> Integrações
                  </Button>
                  <Button variant={activeTab === 'plans' ? 'secondary' : 'ghost'} className="justify-start gap-2" onClick={() => setActiveTab('plans')}>
                    <CreditCard className="h-4 w-4" /> Planos
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <TabsList className="hidden md:flex bg-card border border-border w-full justify-start">
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
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">

            {/* Users Table */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 pb-4">
                <CardTitle className="text-foreground">Usuários</CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 bg-background/50 border-border"
                  />
                </div>
              </CardHeader>
              <CardContent>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground w-[100px]">Data</TableHead>
                        <TableHead className="text-muted-foreground min-w-[200px]">Nome</TableHead>
                        <TableHead className="text-muted-foreground min-w-[150px]">WhatsApp</TableHead>
                        <TableHead className="text-muted-foreground">Status Assinatura</TableHead>
                        <TableHead className="text-muted-foreground">Plano</TableHead>
                        <TableHead className="text-muted-foreground">Trial (Dias)</TableHead>
                        <TableHead className="text-muted-foreground">Próxima Renovação</TableHead>
                        <TableHead className="text-muted-foreground">Último Pagamento</TableHead>
                        <TableHead className="text-muted-foreground">Role</TableHead>
                        <TableHead className="text-muted-foreground text-right min-w-[300px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userItem) => {
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
                              {editingWhatsappId === userItem.user_id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="w-28 h-7 text-xs px-2 bg-background border-border"
                                    value={editingWhatsappValue}
                                    placeholder="Apenas números"
                                    onChange={(e) => setEditingWhatsappValue(e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-green-500"
                                    onClick={() => handleSaveWhatsapp(userItem.user_id)}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                    onClick={() => setEditingWhatsappId(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-foreground">
                                    {userItem.whatsapp || "—"}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                    onClick={() => {
                                      setEditingWhatsappId(userItem.user_id);
                                      setEditingWhatsappValue(userItem.whatsapp || "");
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
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
                            <TableCell className="text-muted-foreground">
                              {userItem.next_renewal ? new Date(userItem.next_renewal).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {userItem.last_payment_date ? (
                                <div className="flex flex-col">
                                  <span className="text-foreground font-medium">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(userItem.last_payment_amount || 0)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(userItem.last_payment_date).toLocaleDateString()}
                                  </span>
                                </div>
                              ) : '—'}
                            </TableCell>
                            <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-red-500/20 text-red-400 mr-1"
                                  onClick={() => setUserToDelete(userItem)}
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                                  onClick={() => setHistoryUser(userItem)}
                                  title="Histórico de Pagamentos"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
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
                  {filteredUsers.map((userItem) => {
                    const trialEnds = userItem.trial_ends_at ? new Date(userItem.trial_ends_at) : null;
                    const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const isExpired = daysLeft < 0 && userItem.subscription_plan === 'trial';

                    return (
                      <div key={userItem.id} className="bg-background/50 border border-border p-4 rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-foreground">{userItem.full_name || userItem.user_name || "—"}</h4>
                            <p className="text-xs text-muted-foreground">{userItem.email}</p>

                            {/* WhatsApp Edit Mobile */}
                            <div className="mt-2">
                              {editingWhatsappId === userItem.user_id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="w-28 h-7 text-xs px-2 bg-background border-border"
                                    value={editingWhatsappValue}
                                    placeholder="Apenas números"
                                    onChange={(e) => setEditingWhatsappValue(e.target.value)}
                                  />
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-500" onClick={() => handleSaveWhatsapp(userItem.user_id)}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingWhatsappId(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-foreground">
                                    {userItem.whatsapp || "Sem WhatsApp"}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                    onClick={() => {
                                      setEditingWhatsappId(userItem.user_id);
                                      setEditingWhatsappValue(userItem.whatsapp || "");
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <p className="text-[10px] text-muted-foreground mt-2">
                              Cadastrado em: {new Date(userItem.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getRoleBadge(userItem.role)}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setHistoryUser(userItem)}
                            >
                              <History className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingUser(userItem)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-400"
                              onClick={() => setUserToDelete(userItem)}
                            >
                              <Trash2 className="h-3 w-3" />
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

                <div className="h-px bg-border my-6" />

                {/* WhatsApp Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    WhatsApp (WhatsMeow API)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wa-url" className="text-foreground">URL do Endpoint do Backend</Label>
                      <Input
                        id="wa-url"
                        placeholder="Ex: https://appback.conativadesk.com.br"
                        value={whatsappUrl}
                        onChange={(e) => setWhatsappUrl(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wa-token" className="text-foreground">Token de Autorização Bearer</Label>
                      <div className="relative flex-1">
                        <Input
                          id="wa-token"
                          type={showWhatsappToken ? "text" : "password"}
                          placeholder="Token cadastrado na conexão..."
                          value={whatsappToken}
                          onChange={(e) => setWhatsappToken(e.target.value)}
                          className="bg-background border-border pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border mt-4">
                    <div className="space-y-2 pb-4">
                      <Label htmlFor="wa-test-num" className="text-foreground">Número para Teste (com DDI e DDD)</Label>
                      <Input
                        id="wa-test-num"
                        placeholder="Ex: 5511999999999"
                        value={whatsappTestNumber}
                        onChange={(e) => setWhatsappTestNumber(e.target.value)}
                        className="bg-background border-border max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground italic">
                        Insira apenas números. Usado apenas para os botões de teste abaixo.
                      </p>
                    </div>

                    <h4 className="font-medium text-md text-foreground mb-3">Mensagens Automáticas (Templates)</h4>
                    <div className="flex bg-muted/50 p-3 mb-4 rounded-md border border-border/50 text-sm">
                      <div className="text-muted-foreground mr-2">ℹ️</div>
                      <div className="text-muted-foreground">
                        <strong>Variáveis disponíveis:</strong>
                        <ul className="list-disc ml-5 mt-1 space-y-1">
                          <li><code className="bg-background px-1 py-0.5 rounded text-xs select-all">{`{{nome}}`}</code>: Primeiro nome do usuário.</li>
                          <li><code className="bg-background px-1 py-0.5 rounded text-xs select-all">{`{{nome_completo}}`}</code>: Nome completo do usuário.</li>
                          <li>Específicas do Diário: <code className="bg-background px-1 py-0.5 rounded text-xs select-all">{`{{lista_agenda}}`}</code> (listagem de eventos do dia) e <code className="bg-background px-1 py-0.5 rounded text-xs select-all">{`{{lista_conteudo}}`}</code> (listagem de feed/stories).</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border mt-4 mb-8">
                      <h4 className="font-medium text-md text-foreground mb-3 text-primary">Lembretes Dinâmicos</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="wa-msg-daily-reminder" className="text-foreground">Lembrete Diário 07:30 (Agenda e Conteúdo)</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleTestWhatsapp(whatsappMsgDailyReminder, "Lembrete 07:30")}
                              disabled={isTestingWa}
                              title="Testa envio do texto cru para verificar a conexão do WhatsApp."
                            >
                              {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                              Teste Básico
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={handleTestDailyReminderReal}
                              disabled={isTestingWa}
                              title="Testa a rotina que extrai da base de dados e formata a mensagem real."
                            >
                              {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                              Testar Rotina Real
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          id="wa-msg-daily-reminder"
                          placeholder="Ex: Bom dia, {{nome}}. \n📅 HOJE:\n{{lista_agenda}}\n\n📱 CONTEÚDO:\n{{lista_conteudo}}"
                          value={whatsappMsgDailyReminder}
                          onChange={(e) => setWhatsappMsgDailyReminder(e.target.value)}
                          className="bg-background border-border min-h-[150px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-daily" className="text-foreground">1. Mensagem Diária com Tarefas</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDaily, "Diária")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-daily"
                        placeholder="Sua mensagem diária. Use variáveis como {{nome}} se aplicável..."
                        value={whatsappMsgDaily}
                        onChange={(e) => setWhatsappMsgDaily(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-trial" className="text-foreground">2. Mensagem de Início de Trial</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgTrial, "Trial")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-trial"
                        placeholder="Enviada quando o usuário iniciar o Trial..."
                        value={whatsappMsgTrial}
                        onChange={(e) => setWhatsappMsgTrial(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-7days" className="text-foreground">3. Mensagem de 7 Dias</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsg7Days, "7 Dias")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-7days"
                        placeholder="Enviada para avisar de 7 dias..."
                        value={whatsappMsg7Days}
                        onChange={(e) => setWhatsappMsg7Days(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-welcome" className="text-foreground">4. Mensagem de Boas-vindas (Compra Premium)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgWelcome, "Boas-vindas")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-welcome"
                        placeholder="Enviada logo após a confirmação da assinatura premium..."
                        value={whatsappMsgWelcome}
                        onChange={(e) => setWhatsappMsgWelcome(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day1" className="text-foreground">5. Mensagem Dia 1</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay1, "Dia 1")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day1"
                        placeholder="Enviada 5 minutos após a mensagem de onboarding..."
                        value={whatsappMsgDay1}
                        onChange={(e) => setWhatsappMsgDay1(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day2" className="text-foreground">6. Mensagem Dia 2</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay2, "Dia 2")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day2"
                        placeholder="Enviada no Dia 2..."
                        value={whatsappMsgDay2}
                        onChange={(e) => setWhatsappMsgDay2(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day3" className="text-foreground">7. Mensagem Dia 3</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay3, "Dia 3")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day3"
                        placeholder="Enviada no Dia 3..."
                        value={whatsappMsgDay3}
                        onChange={(e) => setWhatsappMsgDay3(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day4" className="text-foreground">8. Mensagem Dia 4</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay4, "Dia 4")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day4"
                        placeholder="Enviada no Dia 4..."
                        value={whatsappMsgDay4}
                        onChange={(e) => setWhatsappMsgDay4(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day5" className="text-foreground">9. Mensagem Dia 5</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay5, "Dia 5")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day5"
                        placeholder="Enviada no Dia 5..."
                        value={whatsappMsgDay5}
                        onChange={(e) => setWhatsappMsgDay5(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day6" className="text-foreground">10. Mensagem Dia 6</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay6, "Dia 6")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day6"
                        placeholder="Enviada no Dia 6..."
                        value={whatsappMsgDay6}
                        onChange={(e) => setWhatsappMsgDay6(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day7-15h" className="text-foreground">11. Mensagem Dia 7 (15h)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay7_15h, "Dia 7 15h")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day7-15h"
                        placeholder="Enviada no Dia 7 às 15h..."
                        value={whatsappMsgDay7_15h}
                        onChange={(e) => setWhatsappMsgDay7_15h(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-day7-19h" className="text-foreground">12. Mensagem Dia 7 (19h30)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgDay7_19h, "Dia 7 19h30")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-day7-19h"
                        placeholder="Enviada no Dia 7 às 19h30..."
                        value={whatsappMsgDay7_19h}
                        onChange={(e) => setWhatsappMsgDay7_19h(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2 pt-4 border-t border-border mt-4">
                      <h4 className="font-medium text-md text-foreground mb-3">Mensagens Pós-Compra e Pós-Trial</h4>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="wa-msg-post-purchase" className="text-foreground">13. Pós-compra (Imediato - webhook approved)</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleTestWhatsapp(whatsappMsgPostPurchase, "Pós-compra")}
                            disabled={isTestingWa}
                          >
                            {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            Testar Envio
                          </Button>
                        </div>
                        <Textarea
                          id="wa-msg-post-purchase"
                          placeholder="Enviada logo após confirmação do pagamento..."
                          value={whatsappMsgPostPurchase}
                          onChange={(e) => setWhatsappMsgPostPurchase(e.target.value)}
                          className="bg-background border-border min-h-[80px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day1" className="text-foreground">13.1 Pós-compra - Dia 1</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay1, "Pós-compra Dia 1")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day1"
                        placeholder="Enviada no Dia 1 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay1}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay1(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day2" className="text-foreground">13.2 Pós-compra - Dia 2</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay2, "Pós-compra Dia 2")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day2"
                        placeholder="Enviada no Dia 2 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay2}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay2(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day3" className="text-foreground">13.3 Pós-compra - Dia 3</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay3, "Pós-compra Dia 3")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day3"
                        placeholder="Enviada no Dia 3 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay3}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay3(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day4" className="text-foreground">13.4 Pós-compra - Dia 4</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay4, "Pós-compra Dia 4")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day4"
                        placeholder="Enviada no Dia 4 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay4}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay4(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day5" className="text-foreground">13.5 Pós-compra - Dia 5</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay5, "Pós-compra Dia 5")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day5"
                        placeholder="Enviada no Dia 5 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay5}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay5(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day6" className="text-foreground">13.6 Pós-compra - Dia 6</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay6, "Pós-compra Dia 6")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day6"
                        placeholder="Enviada no Dia 6 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay6}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay6(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-purchase-day7" className="text-foreground">13.7 Pós-compra - Dia 7</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostPurchaseDay7, "Pós-compra Dia 7")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-purchase-day7"
                        placeholder="Enviada no Dia 7 (Pós-compra)..."
                        value={whatsappMsgPostPurchaseDay7}
                        onChange={(e) => setWhatsappMsgPostPurchaseDay7(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-trial-day1" className="text-foreground">14. Pós-trial Não Comprou - D+1 (24h após fim do trial)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostTrialDay1, "Pós-trial D+1")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-trial-day1"
                        placeholder="Enviada 24h após expirar o trial se não comprou..."
                        value={whatsappMsgPostTrialDay1}
                        onChange={(e) => setWhatsappMsgPostTrialDay1(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-trial-day3" className="text-foreground">15. Pós-trial Não Comprou - D+3</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostTrialDay3, "Pós-trial D+3")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-trial-day3"
                        placeholder="Enviada no D+3 após expirar o trial se não comprou..."
                        value={whatsappMsgPostTrialDay3}
                        onChange={(e) => setWhatsappMsgPostTrialDay3(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wa-msg-post-trial-day7" className="text-foreground">16. Pós-trial Não Comprou - D+7 (Última mensagem)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleTestWhatsapp(whatsappMsgPostTrialDay7, "Pós-trial D+7")}
                          disabled={isTestingWa}
                        >
                          {isTestingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Testar Envio
                        </Button>
                      </div>
                      <Textarea
                        id="wa-msg-post-trial-day7"
                        placeholder="Enviada no D+7 após expirar o trial se não comprou..."
                        value={whatsappMsgPostTrialDay7}
                        onChange={(e) => setWhatsappMsgPostTrialDay7(e.target.value)}
                        className="bg-background border-border min-h-[80px]"
                      />
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

      <PaymentHistoryDialog
        open={!!historyUser}
        onOpenChange={(open) => !open && setHistoryUser(null)}
        userId={historyUser?.user_id || null}
        userName={historyUser?.full_name || historyUser?.user_name}
      />

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir Usuário?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Você tem certeza que deseja excluir o usuário <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              <br /><br />
              <span className="text-red-400 font-bold block">Esta ação é irreversível e apagará todos os dados associados.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir usuário"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
