'use client';

import { usePathname } from 'next/navigation';
import { PUBLIC_LANGUAGES, useLocale } from './LocaleProvider';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const { language, setLanguage } = useLocale();

  if (pathname?.startsWith('/admin')) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-3 py-2 shadow-lg border border-gray-200">
        <span className="text-xs text-gray-500">Idioma</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-sm bg-transparent border-none focus:outline-none"
        >
          {PUBLIC_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
