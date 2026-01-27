'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BRANDING_FONT_DEFAULTS, getFontFamilyById } from '@/lib/branding';

type PublicSettings = {
  branding?: {
    primaryFont?: string;
    secondaryFont?: string;
  };
};

export function PublicStyling() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname?.startsWith('/admin');

    if (isAdmin) {
      document.body.classList.remove('public-view');
      return;
    }

    document.body.classList.add('public-view');

    let cancelled = false;

    const applyDefaults = () => {
      document.documentElement.style.setProperty(
        '--brand-font-primary',
        getFontFamilyById(BRANDING_FONT_DEFAULTS.primary),
      );
      document.documentElement.style.setProperty(
        '--brand-font-secondary',
        getFontFamilyById(BRANDING_FONT_DEFAULTS.secondary),
      );
    };

    const loadBranding = async () => {
      try {
        const res = await fetch('/api/settings/public', { cache: 'no-store' });
        if (!res.ok) {
          applyDefaults();
          return;
        }
        const data = (await res.json()) as PublicSettings;
        const primary = data.branding?.primaryFont || BRANDING_FONT_DEFAULTS.primary;
        const secondary =
          data.branding?.secondaryFont || BRANDING_FONT_DEFAULTS.secondary;
        if (cancelled) return;
        document.documentElement.style.setProperty(
          '--brand-font-primary',
          getFontFamilyById(primary),
        );
        document.documentElement.style.setProperty(
          '--brand-font-secondary',
          getFontFamilyById(secondary),
        );
      } catch {
        applyDefaults();
      }
    };

    void loadBranding();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
