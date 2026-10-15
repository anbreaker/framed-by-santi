import { isLocalizedText, LocalizedText } from './localized-text.model';

/** A theme groups posts in the gallery filter. Posts store the theme `id` in their `tags`. */
export interface Theme {
  id: string;
  label: LocalizedText;
}

/** The original themes. They always exist, so posts that use them keep working without Firestore. */
export const DEFAULT_THEMES: readonly Theme[] = [
  { id: 'architecture', label: { en: 'Architecture', es: 'Arquitectura', pt: 'Arquitetura' } },
  { id: 'bw', label: { en: 'Black & white', es: 'Blanco y negro', pt: 'Preto e branco' } },
  { id: 'night', label: { en: 'Night', es: 'Noche', pt: 'Noite' } },
  { id: 'sky', label: { en: 'Sky', es: 'Cielo', pt: 'Céu' } },
  { id: 'street', label: { en: 'Street', es: 'Calle', pt: 'Rua' } },
];

/** Turns a Firestore theme document into a `Theme`, or null when it has no full translated label. */
export function toTheme(id: string, data: unknown): Theme | null {
  if (typeof data !== 'object' || data === null) return null;

  const { label } = data as Record<string, unknown>;
  return isLocalizedText(label) ? { id, label } : null;
}

/** A url-safe id from a theme name: lowercase, no accents, words joined by a dash. */
export function themeIdFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
