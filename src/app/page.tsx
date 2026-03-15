"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/ui/app-icon";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function Home() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loader-creative" aria-label={t("common.loading")}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand/5">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 min-w-0 hover:opacity-90 transition-opacity">
            <Image
              src="/images/clientExpressLogo.png"
              alt="ClientExpress"
              width={40}
              height={40}
              className="shrink-0"
            />
            <span className="font-bold text-lg truncate">ClientExpress</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {status === "authenticated" ? (
              <Button asChild size="sm">
                <Link href="/projects">{t("sidebar.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{t("common.signIn")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">{t("common.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              <AppIcon name={mobileMenuOpen ? "X" : "Menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border/50 bg-background px-4 pb-4 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between py-2 border-b border-border/40 mb-1">
              <span className="text-xs font-semibold text-muted-foreground ml-1">Settings</span>
              <div className="flex gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
            {status === "authenticated" ? (
              <Button asChild className="w-full">
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)}>{t("sidebar.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="w-full">
                  <a href="/login" onClick={() => setMobileMenuOpen(false)}>{t("common.signIn")}</a>
                </Button>
                <Button asChild className="w-full">
                  <a href="/signup" onClick={() => setMobileMenuOpen(false)}>{t("common.getStarted")}</a>
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      {/* HERO */}
      <main>
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <Badge variant="secondary">{t("landing.heroTagline1")}</Badge>
            <Badge variant="outline">{t("landing.heroTagline2")}</Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
            {t("landing.hero")}
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landing.heroDesc")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={status === "authenticated" ? "/projects" : "/login"}>
                {t("landing.heroCta")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#how-it-works">{t("landing.howItWorks")}</Link>
            </Button>
          </div>

          {/* Feature cards */}
          <div className="mt-12">
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                {[
                  { icon: "Folder", title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
                  { icon: "FileText", title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
                  { icon: "MessageSquare", title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
                ].map((item) => (
                  <div key={item.title} className="p-6 sm:p-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <AppIcon name={item.icon as any} className="h-6 w-6 text-primary" />
                    </div>
                    <div className="mt-4 font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4 text-center md:text-left order-2 md:order-1">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {t("landing.focusTitle")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("landing.focusDesc")}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center justify-center md:justify-start gap-2">
                  <AppIcon name="Shield" className="h-4 w-4 shrink-0" />
                  {t("landing.focusPoint1")}
                </li>
                <li className="flex items-center justify-center md:justify-start gap-2">
                  <AppIcon name="Lock" className="h-4 w-4 shrink-0" />
                  {t("landing.focusPoint2")}
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center order-1 md:order-2">
              <div className="w-full max-w-sm sm:max-w-md h-56 sm:h-72 bg-muted rounded-2xl border border-border/60 shadow-sm flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/hero-placeholder.svg"
                  alt="Illustration"
                  width={360}
                  height={240}
                />
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              {t("landing.pricingTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing.pricingDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {/* Starter */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-2">{t("landing.planStarter")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("landing.planStarterDesc")}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">Free</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["1 Project", "3 Sources (Max 2MB each)", "50 Messages / month"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <AppIcon name="Check" className="w-5 h-5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href={status === "authenticated" ? "/projects" : "/signup"}>{t("common.getStarted")}</Link>
              </Button>
            </div>

            {/* Pro — highlighted, no scale-105 on mobile */}
            <div className="bg-card border-2 border-primary rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col relative overflow-hidden lg:scale-105 lg:z-10">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                {t("landing.mostPopular")}
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("landing.planPro")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("landing.planProDesc")}
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">5,000</span>
                <span className="text-muted-foreground">{t("landing.fcfaMo")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["5 Projects", "50 Sources (Max 10MB each)", "1,000 Messages / month", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <AppIcon name="Check" className="w-5 h-5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/checkout?plan=PRO">{t("landing.upgradePro")}</Link>
              </Button>
            </div>

            {/* Business */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:col-span-2 lg:col-span-1">
              <h3 className="text-xl font-semibold mb-2">{t("landing.planBusiness")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("landing.planBusinessDesc")}
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">15,000</span>
                <span className="text-muted-foreground">{t("landing.fcfaMo")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited Projects", "500 Sources (Max 50MB each)", "Unlimited Messages", "API Access (Coming soon)"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <AppIcon name="Check" className="w-5 h-5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/checkout?plan=BUSINESS">{t("landing.upgradeBusiness")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("landing.readyTitle")}
          </h3>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            {t("landing.readyDesc")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
              <Link href={status === "authenticated" ? "/projects" : "/signup"}>
                {t("common.getStarted")}
              </Link>
            </Button>
            {status !== "authenticated" && (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                <Link href="/login">{t("common.signIn")}</Link>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ClientExpress. {t("landing.copyright")}
      </footer>
    </div>
  );
}
