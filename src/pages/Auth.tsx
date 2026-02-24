import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { TERMS_AND_PRIVACY } from "@/lib/terms";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) {
        toast.error("Nome é obrigatório");
        return;
      }
      if (!whatsapp.trim()) {
        toast.error("WhatsApp é obrigatório");
        return;
      }
      if (!acceptedTerms) {
        toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade para criar uma conta.");
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Check for existing phone number
      const cleanWhatsapp = whatsapp.replace(/\D/g, '');
      const { data: whatsappExists, error: checkError } = await (supabase as any)
        .rpc('check_whatsapp_exists', { check_whatsapp: cleanWhatsapp });

      if (checkError) {
        console.error("Error checking phone number:", checkError);
      }

      if (whatsappExists) {
        toast.error("Este número de WhatsApp já está cadastrado em outra conta.");
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(email, password, fullName, cleanWhatsapp);

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Conta criada com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error("Por favor, insira seu email");
      return;
    }

    try {
      emailSchema.parse(resetEmail);
    } catch (err) {
      toast.error("Email inválido");
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(resetEmail);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Link de recuperação enviado para o seu email!");
      setShowResetModal(false);
      setResetEmail("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-neon-magenta/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          {/* Logo */}
          <div className="flex justify-center mb-0">
            <div className="w-64 h-64">
              <img
                src="/logo-login.png"
                alt="YAh Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm">
              Sua assistente inteligente que pensa com você.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/30 p-1 rounded-full h-12">
              <TabsTrigger
                value="signin"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-signin" className="text-foreground text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl pr-12"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                      <span className="text-destructive text-xs">💬</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password-signin" className="text-foreground text-sm font-medium">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-[10px] text-primary hover:underline font-bold uppercase tracking-widest"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password-signin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl pr-12"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                      <span className="text-destructive text-xs">💬</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-neon-magenta text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name-signup" className="text-foreground text-sm font-medium">Nome completo</Label>
                  <Input
                    id="name-signup"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-signup" className="text-foreground text-sm font-medium">WhatsApp</Label>
                  <Input
                    id="whatsapp-signup"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-foreground text-sm font-medium">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-foreground text-sm font-medium">Senha</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-secondary/30 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                    required
                  />
                </div>

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/20"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                    >
                      Li e aceito os <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary hover:underline font-bold">Termos de Uso e Política de Privacidade</button>
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-neon-magenta text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-border/50 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Recuperar Senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Insira seu email para receber um link de redefinição de senha.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="h-12 bg-secondary/30 border-border/50 focus:border-primary rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowResetModal(false)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isLoading || !resetEmail.trim()}
              className="h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms and Privacy Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-[800px] w-[90vw] h-[85vh] bg-card/95 backdrop-blur-3xl border-border/50 rounded-2xl p-0 overflow-hidden block">

          <div className="flex flex-col h-full max-h-[calc(85vh-2px)]">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Termos de Uso e Política de Privacidade
              </DialogTitle>
              <DialogDescription>
                Leia atentamente os termos antes de aceitar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 p-6 pt-2 overflow-hidden">
              <div className="h-full w-full overflow-y-auto custom-scrollbar rounded-md border border-white/10 bg-black/20 p-4">
                <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed font-mono pb-32">
                  {TERMS_AND_PRIVACY}
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 shrink-0 flex flex-col sm:flex-row gap-2 bg-card/95 backdrop-blur-3xl z-10 border-t border-white/5">
              <Button
                variant="outline"
                onClick={() => setShowTermsModal(false)}
                className="h-12 rounded-xl"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all flex-1"
              >
                Li e Aceito
              </Button>
            </DialogFooter>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
