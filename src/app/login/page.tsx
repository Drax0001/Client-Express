"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";

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
    if (result?.ok) {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="p-6">
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send magic link"}
              </Button>
              <Link href="/signup" className="text-sm text-primary">
                Create account
              </Link>
            </div>

            {(sent || searchParams.get("check") === "1") && (
              <div className="text-sm text-muted-foreground">
                Check your email for a sign-in link.
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
