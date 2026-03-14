"use client";

import { useTranslation, Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useTranslation();

    const languages: { code: Locale; label: string; flag: string }[] = [
        { code: "en", label: "English", flag: "🇺🇸" },
        { code: "fr", label: "Français", flag: "🇫🇷" },
    ];

    const currentLang = languages.find((l) => l.code === locale) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-9 px-3 hover-lift border border-border/40">
                    <span className="text-base">{currentLang.flag}</span>
                    <span className="hidden md:inline font-medium">{currentLang.label}</span>
                    <AppIcon name="ChevronDown" className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-1 rounded-xl shadow-strong border-border/60">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLocale(lang.code)}
                        className={`gap-3 py-2 cursor-pointer rounded-lg transition-colors ${locale === lang.code ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                            }`}
                    >
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {locale === lang.code && <AppIcon name="Check" className="h-3.5 w-3.5 ml-auto" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
