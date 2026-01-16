import { useState, useEffect } from "react";
import { MinimalLayout } from "@/components/layout/MinimalLayout";
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
import { Loader2, User, Building, Target, Mail, ArrowLeft, Lock, ShieldCheck } from "lucide-react";

export default function Profile() {
    const { profile, isLoading: profileLoading, updateProfile } = useProfile();
    const { brand } = useBrand();

    const [formData, setFormData] = useState({
        full_name: "",
        user_name: "",
        business_stage: "",
        main_goal: "",
    });

    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                user_name: profile.user_name || "",
                business_stage: profile.business_stage || "",
                main_goal: profile.main_goal || "",
            });
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
                                    <div className="w-20 h-20 rounded-full border-4 border-background bg-secondary flex items-center justify-center -mt-10 mb-4">
                                        <User className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-center text-lg">{profile?.full_name || "Usuário"}</h3>
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
                        </div>
                    </div>
                </div>
            </div>
        </MinimalLayout>
    );
}
