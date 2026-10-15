import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DEFAULT_THEMES } from '@features/photo-posts/models/theme.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { GalleryPageComponent } from './gallery.page';

describe('GalleryPageComponent without published sets', () => {
  let fixture: ComponentFixture<GalleryPageComponent>;
  const ready = signal(true);

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    ready.set(true);

    await TestBed.configureTestingModule({
      imports: [GalleryPageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        {
          provide: PhotoPostsStore,
          useValue: {
            availableThemes: signal([]),
            filterByTag: () => [],
            posts: signal([]),
            ready,
            themes: signal(DEFAULT_THEMES),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryPageComponent);
    await fixture.whenStable();
  });

  it('should say nothing is published yet instead of blaming a filter', () => {
    expect(root().querySelector('.gallery-page__empty')?.textContent?.trim()).toBe(
      'Nothing has been published yet.',
    );
    expect(root().querySelector('app-set-strip')).toBeNull();
  });

  it('should show neither a message nor a count while the sets are still loading', async () => {
    ready.set(false);
    await fixture.whenStable();

    expect(root().querySelector('.gallery-page__empty')).toBeNull();
    expect(root().querySelector('.meta')).toBeNull();
    expect(root().querySelector('h1')?.textContent).toBe('Gallery');
  });
});
