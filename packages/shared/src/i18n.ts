/**
 * Multilanguage support types and utilities
 */

export const SupportedLanguages = {
  ES: 'es',
  EN: 'en',
  CA: 'ca', // Catalan
  FR: 'fr',
  DE: 'de',
} as const;

export type SupportedLanguage = typeof SupportedLanguages[keyof typeof SupportedLanguages];

/**
 * Translatable text with values for each language
 */
export interface TranslatedText {
  es?: string;
  en?: string;
  ca?: string;
  fr?: string;
  de?: string;
}

/**
 * Offering translations structure
 */
export interface OfferingTranslations {
  [lang: string]: {
    name: string;
    description?: string;
  };
}

/**
 * Site-wide translations structure
 */
export interface SiteTranslations {
  [lang: string]: {
    siteTitle?: string;
    siteDescription?: string;
    [key: string]: string | undefined; // Allow custom translation keys
  };
}

/**
 * Get translated text for a specific language with fallback
 */
export function getTranslation(
  translations: TranslatedText | undefined,
  language: string,
  fallbackLanguage: string = 'es'
): string | undefined {
  if (!translations) return undefined;
  
  // Try requested language
  if (translations[language as keyof TranslatedText]) {
    return translations[language as keyof TranslatedText];
  }
  
  // Try fallback language
  if (translations[fallbackLanguage as keyof TranslatedText]) {
    return translations[fallbackLanguage as keyof TranslatedText];
  }
  
  // Return first available translation
  const availableLanguages = Object.keys(translations);
  if (availableLanguages.length > 0) {
    return translations[availableLanguages[0] as keyof TranslatedText];
  }
  
  return undefined;
}

/**
 * Validate that all required languages have translations
 */
export function validateTranslations(
  translations: Record<string, any>,
  requiredLanguages: string[],
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const lang of requiredLanguages) {
    if (!translations[lang]) {
      errors.push(`Missing translations for language: ${lang}`);
      continue;
    }
    
    for (const field of requiredFields) {
      if (!translations[lang][field]) {
        errors.push(`Missing field "${field}" for language: ${lang}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
