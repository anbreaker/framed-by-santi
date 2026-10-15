import { ComponentFixture } from '@angular/core/testing';

/** Time the viewer needs after a new photo has arrived to dissolve the new one in over the old one. */
const SWAP_MS = 650;

/**
 * The photo viewer keeps the old photo until the new one has loaded, then fades through the background.
 * jsdom never loads images, so tests tell it the new photo has arrived and wait for the swap to finish.
 */
export async function settlePhotoChange(fixture: ComponentFixture<unknown>): Promise<void> {
  const root = fixture.nativeElement as HTMLElement;

  // The photo that is loading is only in the page once the change has been rendered.
  await fixture.whenStable();
  root.querySelector('.set-stage__photo--incoming img')?.dispatchEvent(new Event('load'));
  await new Promise((resolve) => setTimeout(resolve, SWAP_MS));
  await fixture.whenStable();
}
