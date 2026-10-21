import { InjectionToken } from '@angular/core';

import { Congratulation } from '../models/congratulation.model';

/**
 * The messages Santi sees under Felicitaciones, in the order they are shown. Add one object per friend:
 *
 * ```ts
 * {
 *   id: 'ana',
 *   from: 'Ana',
 *   message: 'Happy birthday, Santi!\nSee you soon.',
 *   media: { kind: 'youtube', video: 'https://youtu.be/<id>' },
 *   // or { kind: 'photo', src: '/assets/congratulations/ana.webp', alt: 'Ana and Santi in Lisbon' }
 *   // or { kind: 'cloudinary', publicId: 'framed-by-santi/congratulations/ana' }
 *   // or no media at all, for a message alone
 * },
 * ```
 */
const CONGRATULATION_LIST: readonly Congratulation[] = [];

/** The messages to show, provided so tests can swap them. */
export const CONGRATULATIONS = new InjectionToken<readonly Congratulation[]>('CONGRATULATIONS', {
  factory: (): readonly Congratulation[] => CONGRATULATION_LIST,
});
