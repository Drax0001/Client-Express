import Link from "next/link";
import Image from "next/image";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60 shadow-soft">
      <div className="container flex h-20 items-center justify-between px-6">
        <div className="mr-4 hidden md:flex">
          <Link
            className="mr-6 flex items-center space-x-3 hover:opacity-90 transition-all hover-lift group"
            href="/projects"
          >
            <Image src="/images/clientExpressLogo.png" alt="ClientExpress" width={44} height={24} className="rounded-xl shadow-medium group-hover:shadow-strong transition-shadow" />
            <span className="hidden font-bold text-xl sm:inline-block">
              ClientExpress
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/projects"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Docs
            </Link>
          </nav>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden touch-manipulation rounded-lg"
            >
              <AppIcon name="Menu" className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="pr-0 w-72 bg-background border-r border-border/50"
          >
            <Link
              className="flex items-center space-x-3 mb-8 p-3 rounded-xl bg-card shadow-soft"
              href="/projects"
            >
              <Image src="/images/clientExpressLogo.png" alt="ClientExpress" width={37} height={20} className="rounded-lg" />
              <span className="font-bold text-lg">
                ClientExpress
              </span>
            </Link>
            <div className="flex flex-col space-y-2">
              <Link
                href="/projects"
                className="flex items-center py-3 px-4 rounded-xl hover:bg-accent transition-all touch-manipulation shadow-soft hover:shadow-medium font-medium"
              >
                Projects
              </Link>
              <Link
                href="/docs"
                className="flex items-center py-3 px-4 rounded-xl hover:bg-accent transition-all touch-manipulation shadow-soft hover:shadow-medium font-medium text-muted-foreground"
              >
                Docs
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link className="flex items-center space-x-2 md:hidden" href="/projects">
              <Image src="/images/clientExpressLogo.png" alt="ClientExpress" width={44} height={24} />
              <span className="font-bold">ClientExpress</span>
            </Link>
          </div>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <KeyboardShortcutsDialog />
          </nav>
        </div>
      </div>
    </header>
  );
}
