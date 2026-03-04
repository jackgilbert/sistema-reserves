'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type LocaleContextValue = {
  language: string;
  locale: string;
  setLanguage: (next: string) => void;
};

const LOCALE_STORAGE_KEY = 'publicLocale';
const LOCALE_SOURCE_KEY = 'publicLocaleSource';

const SUPPORTED_LANGUAGES = ['es', 'en', 'ca', 'fr', 'de'] as const;

const LOCALE_MAP: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  ca: 'ca-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function normalizeLanguage(value?: string | null): string {
  if (!value) return 'es';
  const lower = value.toLowerCase();
  const base = lower.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base as (typeof SUPPORTED_LANGUAGES)[number])
    ? base
    : 'es';
}

function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'es';
  const lang = navigator.languages?.[0] || navigator.language || 'es';
  return normalizeLanguage(lang);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState('es');

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const source = localStorage.getItem(LOCALE_SOURCE_KEY);

    let next = normalizeLanguage(stored);

    if (!stored || source !== 'manual') {
      next = getBrowserLanguage();
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      localStorage.setItem(LOCALE_SOURCE_KEY, 'auto');
    }

    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  const setLanguage = (next: string) => {
    const normalized = normalizeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    localStorage.setItem(LOCALE_SOURCE_KEY, 'manual');
    setLanguageState(normalized);
    document.documentElement.lang = normalized;
  };

  const value = useMemo(
    () => ({
      language,
      locale: LOCALE_MAP[language] || 'es-ES',
      setLanguage,
    }),
    [language],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      language: 'es',
      locale: 'es-ES',
      setLanguage: () => {},
    };
  }
  return ctx;
}

export const PUBLIC_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ca', label: 'Català', flag: '🏴' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];
