"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="p-6">
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <Input type="password" placeholder="••••••••" />
            </div>

            <div className="flex items-center justify-between">
              <Button type="submit">Sign in</Button>
              <Link href="/signup" className="text-sm text-primary">
                Create account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
