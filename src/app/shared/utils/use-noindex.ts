import { DestroyRef, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/** Keeps search engines out of an admin page while it is open. Call it from the page's constructor. */
export function useNoIndex(): void {
  const meta = inject(Meta);
  const tag = meta.addTag({ content: 'noindex, nofollow', name: 'robots' });

  inject(DestroyRef).onDestroy(() => {
    if (tag) meta.removeTagElement(tag);
  });
}
