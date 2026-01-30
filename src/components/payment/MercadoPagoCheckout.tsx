import { useEffect, useRef } from "react";
import { useMercadoPago } from "@/hooks/useMercadoPago";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MercadoPagoCheckoutProps {
    planId: string;
    amount: number;
    email: string;
    fullName?: string;
    cpf?: string;
    phone?: string;
    onSuccess?: () => void;
}

export function MercadoPagoCheckout({ planId, amount, email, fullName, cpf, phone, onSuccess }: MercadoPagoCheckoutProps) {
    const { loadMercadoPago, processPayment, publicKey, isProcessing } = useMercadoPago();
    const containerRef = useRef<HTMLDivElement>(null);
    const brickController = useRef<any>(null);

    useEffect(() => {
        if (!publicKey || !containerRef.current || !amount || !email) {
            console.log("Missing required props for MP:", { publicKey: !!publicKey, container: !!containerRef.current, amount, email });
            return;
        }

        console.log("Initializing Mercado Pago with Public Key:", `${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 4)}`);

        let controller: any = null;

        const initMP = async () => {
            if (Number(amount) <= 0) {
                console.error("Invalid amount for MP:", amount);
                return;
            }

            const mp = await loadMercadoPago();
            if (!mp) return;

            // Small delay to ensure DOM is ready
            await new Promise(r => setTimeout(r, 200));

            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }

            const mercadopago = new mp(publicKey, { locale: "pt-BR" });
            const bricksBuilder = mercadopago.bricks();

            const settings = {
                initialization: {
                    amount: Number(amount),
                    payer: {
                        email: email,
                    },
                },
                customization: {
                    paymentMethods: {
                        maxInstallments: 12,
                    },
                    visual: {
                        style: {
                            theme: "dark",
                        },
                    },
                },
                callbacks: {
                    onReady: () => {
                        console.log("Card Payment Brick is ready");
                    },
                    onSubmit: async (formData: any) => {
                        console.log("Card Payment Submit:", formData);

                        const result = await processPayment({
                            planId,
                            cardToken: formData.token,
                            paymentMethodId: formData.payment_method_id,
                            issuerId: formData.issuer_id,
                            installments: formData.installments,
                            email,
                            fullName,
                            cpf,
                            phone
                        });

                        if (result.success && onSuccess) {
                            onSuccess();
                        }
                    },
                    onError: (error: any) => {
                        console.error("Card Payment Brick Error:", error);
                        let errorMessage = "Erro ao carregar o checkout do Mercado Pago.";

                        if (error?.cause?.[0]?.description) {
                            errorMessage += ` Detalhes: ${error.cause[0].description}`;
                        } else if (error?.message) {
                            errorMessage += ` Mensagem: ${error.message}`;
                        }

                        toast.error(errorMessage);
                    },
                },
            };

            controller = await bricksBuilder.create(
                "cardPayment",
                "mercado-pago-card-brick-container",
                settings
            );
            brickController.current = controller;
        };

        initMP();

        return () => {
            if (controller) {
                try {
                    if (typeof controller.unmount === 'function') {
                        controller.unmount();
                    }
                } catch (e) {
                    console.error("Clean up error:", e);
                }
            }
        };
    }, [publicKey, amount, email, planId, fullName, cpf, phone]);

    if (!publicKey) {
        return (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Mercado Pago não configurado.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[400px] relative space-y-6">
            {isProcessing && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-3 animate-fade-in rounded-xl">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                    <p className="text-sm font-bold text-purple-400 uppercase tracking-widest animate-pulse">Processando Pagamento...</p>
                </div>
            )}

            {/* Installment Summary for better UX as requested */}
            <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 animate-fade-in">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 opacity-70">Opções de Parcelamento</h4>
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-sm">1x à vista</span>
                        <span className="font-bold text-sm">R$ {amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <span className="text-sm">Até 12x de</span>
                        <span className="font-bold text-sm text-purple-400">R$ {(amount / 12).toFixed(2)}*</span>
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                    * O seletor de parcelas aparecerá automaticamente assim que você digitar os primeiros dígitos do seu cartão.
                </p>
            </div>

            <div key={`${planId}-${amount}`} id="mercado-pago-card-brick-container" ref={containerRef}></div>
        </div>
    );
}
