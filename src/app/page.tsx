"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/ui/app-icon";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  // Guard: show nothing until auth session is resolved
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-muted" />
          <div className="w-48 h-4 rounded bg-muted" />
          <div className="w-32 h-3 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/clientExpressLogo.png"
              alt="ClientExpress"
              width={60}
              height={60}
              className=""
            />
            <span className="font-bold text-xl">ClientExpress</span>
          </div>
          <div className="flex items-center gap-3">
            {status === "authenticated" ? (
              <Button asChild>
                <a href="/projects">Dashboard</a>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <a href="/login">Sign in</a>
                </Button>
                <Button asChild>
                  <a href="/signup">Create account</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge variant="secondary">RAG for your docs</Badge>
            <Badge variant="outline">Private by design</Badge>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Turn documents into a knowledge assistant
          </h1>

          <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload PDFs or web pages, then ask questions. Get answers grounded
            in your content with a clean workflow: Projects → Ingest → Chat.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <a
                href={
                  status === "authenticated"
                    ? "/projects"
                    : "/login"
                }
              >
                Open the app
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center">
            <div className="w-full max-w-3xl bg-card border border-border/60 rounded-2xl shadow-soft overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/60">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <AppIcon name="Folder" className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mt-4 font-semibold">Projects</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Keep knowledge bases isolated.
                  </div>
                </div>
                <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/60">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <AppIcon name="FileText" className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mt-4 font-semibold">Ingest</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Upload documents and build context.
                  </div>
                </div>
                <div className="p-6 md:p-8">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <AppIcon
                      name="MessageSquare"
                      className="h-6 w-6 text-primary"
                    />
                  </div>
                  <div className="mt-4 font-semibold">Chat</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Ask questions, get grounded answers.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="how-it-works" className="max-w-5xl mx-auto mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Built for focus and clarity
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The assistant retrieves only what's relevant from your project's
                documents, then answers in plain language. No noisy dashboards.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Icon size={16} className="text-muted-foreground">
                    <path
                      d="M12 2c-2.21 0-4 1.79-4 4v1H6a2 2 0 00-2 2v3a6 6 0 006 6h4a6 6 0 006-6V9a2 2 0 00-2-2h-2V6c0-2.21-1.79-4-4-4z"
                      fill="currentColor"
                    />
                  </Icon>
                  <span>
                    Works great for manuals, policies, and internal docs.
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <AppIcon name="Shield" className="h-4 w-4" />
                  <span>Keep content separated by project.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md h-72 bg-muted rounded-2xl border border-border/60 shadow-soft flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/hero-placeholder.svg"
                  alt="Illustration placeholder"
                  width={360}
                  height={240}
                />
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started for free, then scale up as your knowledge needs grow.
              Billed in FCFA for the local market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm flex flex-col relative overflow-hidden">
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Perfect for individuals testing the waters.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">Free</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 1
                  Project
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 3
                  Sources (Max 2MB each)
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 50
                  Messages / month
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <a href={status === "authenticated" ? "/projects" : "/signup"}>
                  Get Started
                </a>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-xl flex flex-col relative overflow-hidden scale-105 z-10">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-sm text-muted-foreground mb-6">
                For students, freelancers, and small teams.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">5,000</span>
                <span className="text-muted-foreground">FCFA / mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 5
                  Projects
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 50
                  Sources (Max 10MB each)
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 1000
                  Messages / month
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" />{" "}
                  Priority support
                </li>
              </ul>
              <Button asChild className="w-full">
                <a href="/checkout?plan=PRO">Upgrade to Pro</a>
              </Button>
            </div>

            {/* Business Plan */}
            <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm flex flex-col relative overflow-hidden">
              <h3 className="text-xl font-semibold mb-2">Business</h3>
              <p className="text-sm text-muted-foreground mb-6">
                For growing SMEs and organizations.
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">15,000</span>
                <span className="text-muted-foreground">FCFA / mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" />{" "}
                  Unlimited Projects
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> 500
                  Sources (Max 50MB each)
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" />{" "}
                  Unlimited Messages
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <AppIcon name="Check" className="w-5 h-5 text-primary" /> API
                  Access (Coming soon)
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <a href="/checkout?plan=BUSINESS">Upgrade to Business</a>
              </Button>
            </div>
          </div>
        </section>

        <div className="mt-24 text-center">
          <h3 className="text-3xl font-bold tracking-tight">
            Ready to try it?
          </h3>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
            Create a project, ingest a document, and chat with your customized
            knowledge base today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <a href={status === "authenticated" ? "/projects" : "/signup"}>
                Get started
              </a>
            </Button>
            {status !== "authenticated" && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
              >
                <a href="/signup">Create an account</a>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
