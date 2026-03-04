export type BrandingFontOption = {
  id: string;
  label: string;
  family: string;
};

export const BRANDING_FONTS: BrandingFontOption[] = [
  {
    id: 'Manrope',
    label: 'Manrope (Sans)',
    family: "'Manrope', system-ui, -apple-system, sans-serif",
  },
  {
    id: 'Source Sans 3',
    label: 'Source Sans 3 (Sans)',
    family: "'Source Sans 3', system-ui, -apple-system, sans-serif",
  },
  {
    id: 'Space Grotesk',
    label: 'Space Grotesk (Sans)',
    family: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  },
  {
    id: 'Merriweather',
    label: 'Merriweather (Serif)',
    family: "'Merriweather', 'Times New Roman', serif",
  },
  {
    id: 'Playfair Display',
    label: 'Playfair Display (Serif)',
    family: "'Playfair Display', 'Times New Roman', serif",
  },
];

export const BRANDING_FONT_DEFAULTS = {
  primary: 'Manrope',
  secondary: 'Merriweather',
};

export function getFontFamilyById(id?: string): string {
  const match = BRANDING_FONTS.find((font) => font.id === id);
  return match?.family || BRANDING_FONTS[0].family;
}
