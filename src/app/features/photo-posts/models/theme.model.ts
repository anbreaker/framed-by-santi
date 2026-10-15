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
  const hasText = isLocalizedText(label) && Object.values(label).some((text) => text.trim() !== '');

  return hasText ? { id, label } : null;
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

/** A small stable hash (FNV-1a), so the same name always gets the same id. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;

  for (const char of text) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

/**
 * The id of a new theme: the first language whose name gives a plain id, English first. A name with no
 * Latin letters, such as 夜, gets `theme-<hash>`. No letter or digit at all gives no id.
 */
export function themeIdFor(label: LocalizedText): string {
  const names = [label.en, label.es, label.pt];
  const plain = names.map(themeIdFromName).find((id) => id !== '');

  if (plain !== undefined) return plain;

  const named = names.find((name) => /[\p{L}\p{N}]/u.test(name));
  return named === undefined ? '' : `theme-${shortHash(named.trim().toLowerCase())}`;
}
