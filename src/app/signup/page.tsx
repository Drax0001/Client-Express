"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="p-6">
          <CardTitle>Create an account</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input type="text" placeholder="Your name" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <Input type="password" placeholder="••••••••" />
            </div>

            <div className="flex items-center justify-between">
              <Button type="submit">Create account</Button>
              <Link href="/login" className="text-sm text-primary">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
