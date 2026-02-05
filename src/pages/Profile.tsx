import { useState, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useBrand } from "@/hooks/useBrand";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Building, Target, Mail, ArrowLeft, Lock, ShieldCheck, CreditCard, History, ExternalLink, MessageCircle, AlertCircle, Info, Phone, Camera, Share2, Instagram } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Profile() {
    const { profile, isLoading: profileLoading, updateProfile } = useProfile();
    const { brand } = useBrand();

    const [formData, setFormData] = useState({
        full_name: "",
        user_name: "",
        phone: "",
        business_stage: "",
        main_goal: "",
    });

    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                user_name: profile.user_name || "",
                phone: profile.phone || "",
                business_stage: profile.business_stage || "",
                main_goal: profile.main_goal || "",
            });
            setAvatarUrl(profile.avatar_url || null);
        }
    }, [profile]);

    const handleSave = async () => {
        try {
            await updateProfile.mutateAsync(formData);
            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            // Error handled by the hook
        }
    };

    const handlePasswordChange = async () => {
        if (!passwords.newPassword || !passwords.confirmPassword) {
            toast.error("Por favor, preencha todos os campos de senha.");
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        if (passwords.newPassword.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword,
            });

            if (error) throw error;

            toast.success("Senha atualizada com sucesso!");
            setPasswords({ newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            toast.error("Erro ao atualizar senha: " + error.message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione uma imagem válida.");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }

        setIsUploadingAvatar(true);
        try {
            // Delete old avatar if exists
            if (profile.avatar_url) {
                const oldPath = profile.avatar_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage.from('avatars').remove([`${profile.id}/${oldPath}`]);
                }
            }

            // Upload new avatar
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${profile.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile with new avatar URL
            const { error: updateError } = await (supabase as any)
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success("Foto de perfil atualizada com sucesso!");
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            toast.error("Erro ao fazer upload da foto: " + (error.message || 'Erro desconhecido'));
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <MinimalLayout brandName={brand?.name}>
            <div className="flex-1 p-6 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <Button
                                variant="ghost"
                                className="mb-4 -ml-2 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                                onClick={() => navigate("/dashboard")}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar ao Dashboard
                            </Button>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                Meu Perfil
                            </h1>
                            <p className="text-muted-foreground mt-2">
                                Gerencie suas informações pessoais e profissionais para uma melhor experiência com a YAh.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Sidebar info */}
                        <div className="md:col-span-1 space-y-6">
                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm overflow-hidden">
                                <div className="h-24 bg-gradient-to-br from-primary/20 to-accent/20" />
                                <CardContent className="relative pt-0 flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="w-20 h-20 rounded-full border-4 border-background bg-secondary flex items-center justify-center -mt-10 mb-4 overflow-hidden">
                                            {isUploadingAvatar ? (
                                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                            ) : avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-10 h-10 text-primary" />
                                            )}
                                        </div>
                                        <label
                                            htmlFor="avatar-upload"
                                            className="absolute bottom-3 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg border-2 border-background"
                                        >
                                            <Camera className="w-4 h-4 text-primary-foreground" />
                                        </label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                            disabled={isUploadingAvatar}
                                        />
                                    </div>
                                    <h3 className="font-bold text-center text-lg">{formData.full_name || profile?.full_name || "Usuário"}</h3>
                                    <p className="text-sm text-muted-foreground text-center line-clamp-1">{profile?.email}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Target className="w-4 h-4 text-accent" />
                                        Status da Conta
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                        Ativa
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Share2 className="w-4 h-4 text-primary" />
                                        Compartilhar
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        onClick={() => {
                                            const message = encodeURIComponent("Conheça a YAh! A plataforma completa para criadores de conteúdo 🚀");
                                            const url = encodeURIComponent("https://app.yahapp.com.br");
                                            window.open(`https://wa.me/?text=${message}%20${url}`, "_blank");
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-10 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Compartilhar no WhatsApp
                                    </Button>
                                    <Button
                                        onClick={() => window.open("https://instagram.com/yahapp", "_blank")}
                                        variant="outline"
                                        className="w-full border-pink-500/20 hover:bg-pink-500/10 text-pink-500 gap-2 h-10 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        <Instagram className="w-4 h-4" />
                                        Seguir no Instagram
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main form */}
                        <div className="md:col-span-2 space-y-6">
                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm shadow-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Dados Pessoais
                                    </CardTitle>
                                    <CardDescription>
                                        Como você quer ser chamado e como entramos em contato.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="full_name">Nome Completo</Label>
                                            <Input
                                                id="full_name"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                placeholder="Ex: João Silva"
                                                className="bg-background/50 border-white/10 focus:border-primary/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="user_name">Como prefere ser chamado?</Label>
                                            <Input
                                                id="user_name"
                                                value={formData.user_name}
                                                onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                                                placeholder="Ex: João"
                                                className="bg-background/50 border-white/10 focus:border-primary/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            E-mail
                                        </Label>
                                        <Input
                                            id="email"
                                            value={profile?.email || ""}
                                            disabled
                                            className="bg-secondary/50 border-white/10 cursor-not-allowed opacity-70"
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">
                                            O e-mail não pode ser alterado por aqui.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            Telefone
                                        </Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Ex: (11) 99999-9999"
                                            className="bg-background/50 border-white/10 focus:border-primary/50"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm shadow-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-5 h-5 text-accent" />
                                        Negócio e Objetivos
                                    </CardTitle>
                                    <CardDescription>
                                        Essas informações ajudam a YAh a ser mais precisa.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Fase do Negócio</Label>
                                        <Select
                                            value={formData.business_stage}
                                            onValueChange={(value) => setFormData({ ...formData, business_stage: value })}
                                        >
                                            <SelectTrigger className="bg-background/50 border-white/10">
                                                <SelectValue placeholder="Selecione sua fase atual" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ideacao">Ideação (Apenas o projeto)</SelectItem>
                                                <SelectItem value="validacao">Validação (Primeiros clientes)</SelectItem>
                                                <SelectItem value="tracao">Tração (Crescimento constante)</SelectItem>
                                                <SelectItem value="escala">Escala (Expansão acelerada)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="main_goal">Objetivo Principal</Label>
                                        <Textarea
                                            id="main_goal"
                                            value={formData.main_goal}
                                            onChange={(e) => setFormData({ ...formData, main_goal: e.target.value })}
                                            placeholder="Ex: Quero automatizar minha criação de conteúdo para ter mais tempo livre."
                                            className="bg-background/50 border-white/10 focus:border-primary/50 min-h-[100px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={updateProfile.isPending}
                                    className="gradient-primary text-primary-foreground px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {updateProfile.isPending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Salvando...
                                        </>
                                    ) : (
                                        "Salvar Alterações"
                                    )}
                                </Button>
                            </div>

                            <Card className="bg-card/50 border-white/10 backdrop-blur-sm shadow-xl mt-8">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-amber-500" />
                                        Segurança
                                    </CardTitle>
                                    <CardDescription>
                                        Mantenha sua conta protegida alterando sua senha periodicamente.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new_password">Nova Senha</Label>
                                            <Input
                                                id="new_password"
                                                type="password"
                                                value={passwords.newPassword}
                                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                                placeholder="••••••••"
                                                className="bg-background/50 border-white/10 focus:border-primary/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                                            <Input
                                                id="confirm_password"
                                                type="password"
                                                value={passwords.confirmPassword}
                                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                placeholder="••••••••"
                                                className="bg-background/50 border-white/10 focus:border-primary/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            onClick={handlePasswordChange}
                                            disabled={isUpdatingPassword}
                                            variant="outline"
                                            className="border-white/10 hover:bg-white/5 gap-2"
                                        >
                                            {isUpdatingPassword ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="w-4 h-4" />
                                            )}
                                            Atualizar Senha
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <SubscriptionSection />
                        </div>
                    </div>
                </div>
            </div>
        </MinimalLayout>
    );
}

function SubscriptionSection() {
    const { subscription, isLoading: subLoading } = useSubscription();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoadingTransactions(true);
            try {
                const { data, error } = await (supabase as any)
                    .from("payment_transactions")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(5);

                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoadingTransactions(false);
            }
        };

        fetchTransactions();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
            case 'completed':
            case 'approved':
                return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'pending':
                return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'failed':
            case 'cancelled':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            default:
                return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            paid: 'Pago',
            completed: 'Concluído',
            approved: 'Aprovado',
            pending: 'Pendente',
            failed: 'Falhou',
            cancelled: 'Cancelado'
        };
        return map[status] || status;
    };

    const handleContactSupport = () => {
        // WhatsApp link - using a placeholder or generic link
        const message = encodeURIComponent("Olá! Preciso de ajuda com minha assinatura/pagamento na YAh.");
        window.open(`https://wa.me/5511999999999?text=${message}`, "_blank");
    };

    const renewalDate = subscription?.plan === 'trial' ? subscription?.trialEndsAt : subscription?.currentPeriodEnd;

    return (
        <Card className="bg-card/50 border-white/10 backdrop-blur-sm shadow-xl mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Assinatura e Pagamentos
                </CardTitle>
                <CardDescription>
                    Gerencie seu plano e visualize seu histórico.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Current Plan Info */}
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                {subLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                ) : (
                                    <Target className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg capitalize">
                                    {subLoading ? (
                                        <span className="animate-pulse bg-white/10 h-6 w-32 block rounded" />
                                    ) : (
                                        (!subscription || subscription.plan === 'trial') ? 'Período de Teste' :
                                            subscription.plan === 'premium' ? 'Plano Premium' :
                                                `Plano ${subscription.plan}`
                                    )}
                                </h4>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Status:</span>
                                        {subLoading ? (
                                            <span className="animate-pulse bg-white/10 h-4 w-16 block rounded" />
                                        ) : (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                subscription?.status === 'active' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                            )}>
                                                {subscription?.status === 'active' ? 'Ativo' : subscription?.status === 'expired' ? 'Expirado' : 'Inativo'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        {subLoading ? (
                                            <span className="animate-pulse bg-white/10 h-3 w-40 block rounded mt-1" />
                                        ) : (
                                            <>
                                                {subscription?.plan === 'premium' ? 'Renova em:' : 'Expira em:'}
                                                <span className="text-foreground font-medium">
                                                    {renewalDate ? format(new Date(renewalDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Vitalício / Indefinido'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                            onClick={handleContactSupport}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Suporte Financeiro
                        </Button>
                    </div>

                    {subscription?.plan === 'premium' && subscription?.status === 'active' && (
                        <div className="flex items-start gap-3 text-xs text-muted-foreground bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                <span className="text-blue-400 font-bold block mb-1">Renovação Automática</span>
                                Sua assinatura será renovada automaticamente no dia {renewalDate ? format(new Date(renewalDate), "dd/MM/yyyy") : ''}.
                                Caso não deseje continuar, você pode cancelar a qualquer momento antes dessa data para evitar cobranças futuras.
                            </p>
                        </div>
                    )}
                </div>

                {/* History */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <History className="w-3 h-3" />
                        Histórico Recente
                    </h4>

                    {loadingTransactions ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">
                                                R$ {tx.amount?.toFixed(2) || '0.00'}
                                            </span>
                                            {tx.coins > 0 && (
                                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                                                    +{tx.coins} moedas
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {tx.created_at ? format(new Date(tx.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase border", getStatusColor(tx.status))}>
                                            {getStatusLabel(tx.status)}
                                        </div>
                                        {tx.pix_url && tx.status === 'pending' && (
                                            <a href={tx.pix_url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80" title="Pagar Pix">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado encontrado.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
