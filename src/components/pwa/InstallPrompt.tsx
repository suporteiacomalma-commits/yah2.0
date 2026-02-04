import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showDebugButton, setShowDebugButton] = useState(false);

    useEffect(() => {
        console.log('🔧 InstallPrompt component mounted');

        // Check if already installed
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        console.log('📱 Is Standalone:', isInStandaloneMode);
        setIsStandalone(isInStandaloneMode);

        if (isInStandaloneMode) {
            console.log('✅ App already installed, not showing prompt');
            return;
        }

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        console.log('🍎 Is iOS:', iOS);
        setIsIOS(iOS);

        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('📱 Is Mobile:', isMobile);

        if (!isMobile) {
            console.log('💻 Desktop detected, not showing prompt');
            return;
        }

        // Check if user already dismissed the prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const daysSinceDismissed = dismissed ? (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24) : 999;

        console.log('🚫 Dismissed:', dismissed ? 'Yes' : 'No');
        console.log('📅 Days since dismissed:', daysSinceDismissed.toFixed(2));

        // Show if never dismissed OR dismissed more than 7 days ago
        const shouldShow = !dismissed || daysSinceDismissed > 7;
        console.log('✨ Should show prompt:', shouldShow);

        if (!shouldShow) {
            console.log('⏰ Prompt was dismissed recently, showing debug button...');
            // Show debug button if dismissed recently
            setShowDebugButton(true);
            return;
        }

        if (iOS) {
            console.log('🍎 iOS detected, showing prompt in 2 seconds...');
            setTimeout(() => {
                console.log('🎉 Showing iOS install prompt NOW!');
                setShowPrompt(true);
            }, 2000);
        }

        // Listen for beforeinstallprompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('🎯 beforeinstallprompt event fired!');
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            console.log('🤖 Android detected, showing prompt in 2 seconds...');
            setTimeout(() => {
                console.log('🎉 Showing Android install prompt NOW!');
                setShowPrompt(true);
            }, 2000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        console.log('👆 Install button clicked');
        if (!deferredPrompt) {
            console.log('❌ No deferred prompt available');
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        console.log('📊 Install prompt outcome:', outcome);

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        console.log('❌ User dismissed the install prompt');
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
        setShowDebugButton(true);
    };

    const handleResetDismissal = () => {
        console.log('🔄 Resetting dismissal flag');
        localStorage.removeItem('pwa-install-dismissed');
        setShowDebugButton(false);
        window.location.reload();
    };

    // Debug button for testing (shows when dismissed)
    if (showDebugButton && !isStandalone) {
        return (
            <button
                onClick={handleResetDismissal}
                className="fixed bottom-6 right-6 z-[9999] p-4 bg-primary/90 hover:bg-primary rounded-full shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                title="Resetar prompt de instalação"
            >
                <RotateCcw className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-bold pr-1">Resetar PWA</span>
            </button>
        );
    }

    if (isStandalone || !showPrompt) {
        return null;
    }

    // iOS Install Instructions
    if (isIOS) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="w-full max-w-md bg-gradient-to-b from-card/95 to-card border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                    {/* Header with Icon */}
                    <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* App Icon */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/20">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                                    <Smartphone className="w-3.5 h-3.5 text-white" />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-1.5">
                                <h3 className="text-2xl font-black tracking-tight text-foreground">
                                    Instalar YAH 2.0
                                </h3>
                                <p className="text-sm text-muted-foreground/80 max-w-[280px]">
                                    Acesso rápido direto da sua tela inicial
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-6 pt-4 space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 group">
                                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                                    <span className="text-primary font-bold text-sm">1</span>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <p className="text-sm text-foreground/90 leading-relaxed">
                                        Toque no botão <span className="font-semibold text-primary">Compartilhar</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        Ícone de compartilhamento na barra inferior
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 group">
                                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                                    <span className="text-primary font-bold text-sm">2</span>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <p className="text-sm text-foreground/90 leading-relaxed">
                                        Selecione <span className="font-semibold text-primary">"Adicionar à Tela de Início"</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        Role para baixo se necessário
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 group">
                                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                                    <span className="text-primary font-bold text-sm">3</span>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <p className="text-sm text-foreground/90 leading-relaxed">
                                        Confirme tocando em <span className="font-semibold text-primary">"Adicionar"</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                        Pronto! O app estará na sua tela inicial
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dismiss Button */}
                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl transition-all"
                        >
                            Agora não
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Chrome Install Prompt
    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-gradient-to-b from-card/95 to-card border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                {/* Header with Icon */}
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                    >
                        <X className="w-4 h-4 text-white/70" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        {/* App Icon */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/20">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                                <Download className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <h3 className="text-2xl font-black tracking-tight text-foreground">
                                Instalar YAH 2.0
                            </h3>
                            <p className="text-sm text-muted-foreground/80 max-w-[280px]">
                                Experiência completa com acesso instantâneo
                            </p>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="p-6 pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground">Acesso Rápido</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <Smartphone className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground">Modo App</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <Download className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground">Offline</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <Button
                            onClick={handleInstallClick}
                            className="w-full h-14 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/70 text-white font-bold text-base rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            <Download className="w-5 h-5 mr-2" />
                            Instalar Agora
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl transition-all"
                        >
                            Agora não
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
