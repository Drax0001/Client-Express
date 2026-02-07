"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/ui/app-icon";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image src="/images/clientExpressLogo.png" alt="ClientExpress" width={44} height={24} className="rounded-xl shadow-medium" />
            <span className="font-bold text-xl">ClientExpress</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <a href="/login">Sign in</a>
            </Button>
            <Button asChild>
              <a href="/signup">Create account</a>
            </Button>
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
            Upload PDFs or web pages, then ask questions. Get answers grounded in your
            content with a clean workflow: Projects → Ingest → Chat.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="/projects">Open the app</a>
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
                    <AppIcon name="MessageSquare" className="h-6 w-6 text-primary" />
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
                  <span>Works great for manuals, policies, and internal docs.</span>
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

          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold">Ready to try it?</h3>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Create a project, ingest a document, and chat with your knowledge base.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href="/projects">Get started</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/signup">Create an account</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
