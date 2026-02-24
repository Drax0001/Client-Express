"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import en, { type TranslationKey } from "./en";
import fr from "./fr";

export type Locale = "en" | "fr";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, fr };

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
    locale: "en",
    setLocale: () => { },
    t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("locale") as Locale) || "en";
        }
        return "en";
    });

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        if (typeof window !== "undefined") {
            localStorage.setItem("locale", l);
        }
    }, []);

    const t = useCallback(
        (key: TranslationKey): string => {
            return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
        },
        [locale],
    );

    return (
        <I18nContext.Provider value= {{ locale, setLocale, t }
}>
    { children }
    </I18nContext.Provider>
  );
}

export function useTranslation() {
    return useContext(I18nContext);
}

export { type TranslationKey };
