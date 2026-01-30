import { useEffect, useRef } from "react";
import { useMercadoPago } from "@/hooks/useMercadoPago";
import { Loader2 } from "lucide-react";

interface MercadoPagoCheckoutProps {
    planId: string;
    amount: number;
    email: string;
    fullName?: string;
    onSuccess?: () => void;
}

export function MercadoPagoCheckout({ planId, amount, email, fullName, onSuccess }: MercadoPagoCheckoutProps) {
    const { loadMercadoPago, processPayment, publicKey } = useMercadoPago();
    const containerRef = useRef<HTMLDivElement>(null);
    const brickController = useRef<any>(null);

    useEffect(() => {
        if (!publicKey || !containerRef.current || !amount) return;

        let controller: any = null;

        const initMP = async () => {
            const mp = await loadMercadoPago();
            if (!mp) return;

            // Small delay to ensure DOM is ready
            await new Promise(r => setTimeout(r, 100));

            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }

            const mercadopago = new mp(publicKey, { locale: "pt-BR" });
            const bricksBuilder = mercadopago.bricks();

            const settings = {
                initialization: {
                    amount: Number(Number(amount).toFixed(2)),
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
                    onSubmit: async (cardFormData: any) => {
                        const result = await processPayment({
                            planId,
                            cardToken: cardFormData.token,
                            paymentMethodId: cardFormData.payment_method_id,
                            installments: cardFormData.installments,
                            email,
                            fullName
                        });

                        if (result.success && onSuccess) {
                            onSuccess();
                        }
                    },
                    onError: (error: any) => {
                        console.error("Card Payment Brick Error:", error);
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
                    // Try to unmount safely
                    if (typeof controller.unmount === 'function') {
                        controller.unmount();
                    }
                } catch (e) {
                    console.error("Clean up error:", e);
                }
            }
        };
    }, [publicKey, amount, email, planId, fullName]);

    if (!publicKey) {
        return (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Mercado Pago não configurado.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[400px]">
            <div id="mercado-pago-card-brick-container" ref={containerRef}></div>
        </div>
    );
}
