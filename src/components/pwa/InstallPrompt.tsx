import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        console.log('🔧 PWA InstallPrompt mounted');

        // Check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        console.log('📱 Standalone mode:', isStandalone);

        if (isStandalone) {
            console.log('✅ Already installed');
            return;
        }

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        console.log('🍎 iOS detected:', iOS);
        setIsIOS(iOS);

        // Detect mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('📱 Mobile detected:', isMobile);
        console.log('🌐 User agent:', navigator.userAgent);

        if (!isMobile) {
            console.log('💻 Desktop - not showing');
            return;
        }

        // Check localStorage
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            console.log('⏰ Dismissed', daysSince.toFixed(1), 'days ago');

            if (daysSince < 7) {
                console.log('⏸️ Waiting period active');
                return;
            }
        }

        // Show prompt for iOS
        if (iOS) {
            console.log('🎯 Showing iOS prompt in 2s...');
            const timer = setTimeout(() => {
                console.log('✨ Showing iOS prompt NOW');
                setShowPrompt(true);
            }, 2000);
            return () => clearTimeout(timer);
        }

        // Listen for Android install event
        const handler = (e: Event) => {
            console.log('🎯 beforeinstallprompt fired');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            setTimeout(() => {
                console.log('✨ Showing Android prompt NOW');
                setShowPrompt(true);
            }, 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        console.log('❌ Dismissed');
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    if (!showPrompt) {
        return null;
    }

    // iOS version
    if (isIOS) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-end p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="w-full max-w-md mx-auto bg-gradient-to-b from-card/95 to-card border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                                    <Smartphone className="w-3.5 h-3.5 text-white" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-2xl font-black tracking-tight text-foreground">
                                    Instalar YAH 2.0
                                </h3>
                                <p className="text-sm text-muted-foreground/80">
                                    Acesso rápido direto da sua tela inicial
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-6 pt-4 space-y-4">
                        <div className="space-y-3">
                            {[
                                { num: 1, text: 'Toque no botão', highlight: 'Compartilhar', sub: 'Ícone na barra inferior' },
                                { num: 2, text: 'Selecione', highlight: '"Adicionar à Tela de Início"', sub: 'Role se necessário' },
                                { num: 3, text: 'Confirme em', highlight: '"Adicionar"', sub: 'Pronto!' }
                            ].map(step => (
                                <div key={step.num} className="flex items-start gap-3 group">
                                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                                        <span className="text-primary font-bold text-sm">{step.num}</span>
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-sm text-foreground/90 leading-relaxed">
                                            {step.text} <span className="font-semibold text-primary">{step.highlight}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">{step.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl"
                        >
                            Agora não
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Android version
    return (
        <div className="fixed inset-0 z-[9999] flex items-end p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md mx-auto bg-gradient-to-b from-card/95 to-card border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all"
                    >
                        <X className="w-4 h-4 text-white/70" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                                <Download className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-2xl font-black tracking-tight text-foreground">
                                Instalar YAH 2.0
                            </h3>
                            <p className="text-sm text-muted-foreground/80">
                                Experiência completa com acesso instantâneo
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: Sparkles, label: 'Acesso Rápido' },
                            { icon: Smartphone, label: 'Modo App' },
                            { icon: Download, label: 'Offline' }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                    <item.icon className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Button
                            onClick={handleInstall}
                            className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold text-base rounded-2xl shadow-lg"
                        >
                            <Download className="w-5 h-5 mr-2" />
                            Instalar Agora
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl"
                        >
                            Agora não
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
