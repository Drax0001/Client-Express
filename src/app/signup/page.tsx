"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";

function SignupContent() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const callbackUrl = searchParams?.get("callbackUrl") || "/projects";
    const error = searchParams?.get("error");
    const check = searchParams?.get("check");

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim()) return;
        setSubmitting(true);
        const result = await signIn("email", {
            email: email.trim(),
            redirect: false,
            callbackUrl,
        });
        setSubmitting(false);
        if (result?.ok && !result.error) {
            setSent(true);
        }
    };

    return (
        <Card className="border-border/60 shadow-xl backdrop-blur-xl bg-card/80">
            <CardContent className="p-8">
                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3">
                        <AppIcon name="AlertCircle" className="w-4 h-4 flex-shrink-0" />
                        <p>Authentication failed. The link may have expired or was invalid.</p>
                    </div>
                )}

                {(sent || check === "1") ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <AppIcon name="Mail" className="w-8 h-8" />
                        </div>
                        <h3 className="font-semibold text-xl">Check your email</h3>
                        <p className="text-muted-foreground text-sm">
                            We sent a magic link to <strong>{email || "your inbox"}</strong>.
                            Click the link to verify your email and sign up instantly.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6 w-full"
                            onClick={() => { setSent(false); setEmail(""); }}
                        >
                            Change email address
                        </Button>
                    </div>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => signIn("google", { callbackUrl })}
                            className="w-full h-12 text-base font-medium relative group hover:bg-muted/50 transition-all duration-300"
                        >
                            <svg className="h-5 w-5 absolute left-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign up with Google
                        </Button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border/80" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase text-muted-foreground tracking-widest font-medium">
                                <span className="bg-card px-4">Or sign up with email</span>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={submit}>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    className="h-12 bg-background/50 focus:bg-background transition-colors"
                                    disabled={submitting}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                                disabled={submitting || !email.trim()}
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <AppIcon name="Loader2" className="animate-spin-slow w-4 h-4" />
                                        Sending secure link...
                                    </span>
                                ) : "Continue with Email"}
                            </Button>
                        </form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-background relative flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Dynamic Background Element */}
            <div className="absolute bottom-1/3 right-1/2 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen" />

            <div className="w-full max-w-md z-10 relative">
                <div className="flex justify-center mb-8">
                    <div className="w-14 h-14 bg-card shadow-soft rounded-2xl flex items-center justify-center border border-border/50">
                        {/* Using a placeholder SVG here, could be replaced with the app's standard Icon */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">Create an account</h2>
                    <p className="text-muted-foreground text-sm">Start your enterprise RAG journey for free</p>
                </div>

                <Suspense fallback={
                    <Card className="border-border/60 shadow-xl backdrop-blur-xl bg-card/80">
                        <CardContent className="p-8 flex items-center justify-center min-h-[400px]">
                            <AppIcon name="Loader2" className="w-8 h-8 animate-spin-slow text-primary" />
                        </CardContent>
                    </Card>
                }>
                    <SignupContent />
                </Suspense>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
