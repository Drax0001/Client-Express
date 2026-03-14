"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { AppIcon } from "@/components/ui/app-icon";
import { useToast } from "@/hooks/use-toast";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const plan = searchParams?.get("plan")?.toUpperCase() as "PRO" | "BUSINESS" | undefined;
    const [phoneNumber, setPhoneNumber] = useState("");
    const [processing, setProcessing] = useState(false);
    const [waitingForPayment, setWaitingForPayment] = useState(false);

    useEffect(() => {
        if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
            router.replace("/");
        }
    }, [plan, router]);

    // Polling effect
    useEffect(() => {
        if (!waitingForPayment) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/payments/status");
                if (res.ok) {
                    const data = await res.json();
                    if (data.active) {
                        setWaitingForPayment(false);
                        clearInterval(interval);
                        toast({
                            title: "Payment Successful!",
                            description: `You are now on the ${data.plan} plan.`,
                        });
                        router.replace("/projects");
                    }
                }
            } catch (err) {
                // Silent error for polling
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [waitingForPayment, router, toast]);

    if (!plan) return null;

    const price = plan === "PRO" ? "5,000" : "15,000";

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber.startsWith("237") || phoneNumber.length !== 12) {
            toast({
                title: "Invalid Number",
                description: "Must start with 237 and be 12 digits long.",
                variant: "destructive"
            });
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/payments/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan, phoneNumber }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Payment failed to initiate");
            }

            setWaitingForPayment(true);
            toast({
                title: "Check Your Phone",
                description: "A secure USSD payment prompt has been sent to your Mobile Money number.",
            });

        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12 px-4 relative">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

            <Card className="border-border/50 shadow-2xl bg-card/60 backdrop-blur-xl relative z-10 overflow-hidden">
                {/* Decorative Top header */}
                <div className="h-2 w-full bg-gradient-to-r from-primary via-blue-500 to-primary/50 absolute top-0 left-0" />

                <CardHeader className="pt-8 pb-4 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight mb-2">Checkout</CardTitle>
                    <CardDescription className="text-base text-muted-foreground/80">
                        Complete your subscription to the <span className="font-semibold text-primary">{plan}</span> Plan
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-8">

                    <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 flex items-center justify-between shadow-soft">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{plan} Plan</h3>
                            <p className="text-sm text-muted-foreground">Monthly Billed</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold tracking-tight">{price}</span>
                            <span className="text-muted-foreground ml-1 font-medium">FCFA</span>
                        </div>
                    </div>

                    {waitingForPayment ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" />
                                <AppIcon name="Smartphone" className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Awaiting Payment...</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Please check your phone. A secure prompt has been sent to <span className="font-medium text-foreground">{phoneNumber}</span> to authorize the deduction of {price} FCFA.
                                </p>
                                <p className="text-xs text-muted-foreground mt-4 animate-pulse">This page will automatically refresh once payment is confirmed.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCheckout} className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-semibold ml-1">Mobile Money Number</label>
                                    <div className="flex gap-2.5">
                                        {/* MTN / Orange visual indicators */}
                                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-bold text-black border border-yellow-500/20 shadow-sm">MTN</div>
                                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white border border-orange-600/20 shadow-sm">ORNG</div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground">
                                        <AppIcon name="Phone" className="w-5 h-5" />
                                    </div>
                                    <Input
                                        placeholder="e.g. 237670000000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                        className="pl-11 h-12 text-lg font-medium bg-background border-border/60 hover:border-primary/50 transition-colors focus-visible:ring-primary/20 focus-visible:border-primary"
                                        required
                                        disabled={processing}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground ml-1">Must be exactly 12 digits starting with the country code 237.</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-base font-semibold shadow-md active:scale-[0.98] transition-all hover:shadow-lg"
                                disabled={processing || phoneNumber.length < 12}
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <AppIcon name="Loader2" className="animate-spin-slow w-5 h-5" />
                                        Connecting to CamPay...
                                    </span>
                                ) : (
                                    `Pay ${price} FCFA Now`
                                )}
                            </Button>
                        </form>
                    )}

                    <div className="pt-4 border-t border-border/50 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                        <AppIcon name="Lock" className="w-3.5 h-3.5" />
                        <span>Payments secured by CamPay & SSL encryption</span>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <MainLayout>
            <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><AppIcon name="Loader2" className="w-8 h-8 animate-spin-slow text-primary" /></div>}>
                <CheckoutContent />
            </Suspense>
        </MainLayout>
    );
}
