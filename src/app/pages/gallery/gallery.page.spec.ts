import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { GalleryPageComponent } from './gallery.page';

describe('GalleryPageComponent', () => {
  let fixture: ComponentFixture<GalleryPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const tiles = (): number => root().querySelectorAll('app-set-strip').length;
  const setTag = async (tag: string | undefined): Promise<void> => {
    fixture.componentRef.setInput('tag', tag);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [GalleryPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryPageComponent);
    await fixture.whenStable();
  });

  it('should be the main landmark with the gallery heading', () => {
    const main = root().querySelector('main') as HTMLElement;

    expect(main.id).toBe('main-content');
    expect(root().querySelector('h1')?.textContent).toBe('Gallery');
  });

  it('should list every post and count them when no tag is requested', () => {
    expect(tiles()).toBe(TestBed.inject(PhotoPostsStore).posts().length);
    expect(root().querySelector('.meta')?.textContent?.trim()).toBe('5 sets');
  });

  it('should filter by the tag from the query parameter and count the result', async () => {
    await setTag('night');

    expect(tiles()).toBe(2);
    expect(root().querySelector('.meta')?.textContent?.trim()).toBe('2 sets');
  });

  it('should ignore an unknown tag instead of showing an empty gallery', async () => {
    await setTag('does-not-exist');

    expect(tiles()).toBe(TestBed.inject(PhotoPostsStore).posts().length);
  });

  it('should use the singular form when a single set matches', async () => {
    await setTag('sky');

    expect(root().querySelector('.meta')?.textContent?.trim()).toBe('1 set');
  });

  it('should count sets in the active language', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    await setTag('night');

    expect(root().querySelector('.meta')?.textContent?.trim()).toBe('2 series');
    expect(root().querySelector('h1')?.textContent).toBe('Galería');
  });
});
