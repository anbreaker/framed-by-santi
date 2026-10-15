import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { settlePhotoChange } from '@shared/testing/photo-swap';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PostViewerPageComponent } from './post-viewer.page';

describe('PostViewerPageComponent', () => {
  let fixture: ComponentFixture<PostViewerPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const counter = (): string => root().querySelector('.viewer__counter')?.textContent?.trim() ?? '';
  const mainImage = (): string =>
    root().querySelector('app-set-stage img')?.getAttribute('src') ?? '';
  const arrow = (name: 'next' | 'previous'): HTMLButtonElement =>
    root().querySelector(`.set-stage__arrow--${name}`) as HTMLButtonElement;
  const press = async (key: string): Promise<void> => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await fixture.whenStable();
  };
  const open = async (postId: string): Promise<void> => {
    fixture.componentRef.setInput('postId', postId);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PostViewerPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostViewerPageComponent);
  });

  it('should open on the first photo of the set with the film counter', async () => {
    await open('post-2');

    expect(mainImage()).toBe('/local-photos/post-2/01.webp');
    expect(counter()).toBe('01 / 10');
    expect(root().querySelector('h1')?.textContent).toBe('Flatiron, warm light');
  });

  it('should open on the photo asked for in the address and keep walking from there', async () => {
    fixture.componentRef.setInput('photo', '3');
    await open('post-2');

    expect(mainImage()).toBe('/local-photos/post-2/03.webp');
    expect(counter()).toBe('03 / 10');

    arrow('next').click();
    await fixture.whenStable();

    expect(counter()).toBe('04 / 10');
  });

  it('should start on the first photo when the requested one does not exist', async () => {
    await open('post-2');

    for (const requested of ['0', '99', 'abc', '2.5', '']) {
      fixture.componentRef.setInput('photo', '4');
      await fixture.whenStable();
      fixture.componentRef.setInput('photo', requested);
      await fixture.whenStable();

      expect(counter()).toBe('01 / 10');
    }
  });

  it('should walk the set with the arrows and stop at both ends', async () => {
    await open('post-2');
    expect(arrow('previous').disabled).toBe(true);

    arrow('next').click();
    await settlePhotoChange(fixture);
    expect(counter()).toBe('02 / 10');
    expect(mainImage()).toBe('/local-photos/post-2/02.webp');

    for (let step = 0; step < 12; step++) {
      arrow('next').disabled || arrow('next').click();
      await fixture.whenStable();
    }
    expect(counter()).toBe('10 / 10');
    expect(arrow('next').disabled).toBe(true);
  });

  it('should respond to the keyboard arrows', async () => {
    await open('post-2');

    await press('ArrowRight');
    await press('ArrowRight');
    expect(counter()).toBe('03 / 10');

    await press('ArrowLeft');
    expect(counter()).toBe('02 / 10');
  });

  it('should jump to the thumbnail that is picked', async () => {
    await open('post-2');

    (root().querySelectorAll('.set-thumbnails__button')[4] as HTMLButtonElement).click();
    await settlePhotoChange(fixture);

    expect(counter()).toBe('05 / 10');
    expect(mainImage()).toBe('/local-photos/post-2/05.webp');
  });

  it('should morph from the gallery cover of the same post', async () => {
    await open('post-3');

    const frame = root().querySelector('.set-stage__frame') as HTMLElement;

    expect(frame.style.getPropertyValue('view-transition-name')).toBe('cover-post-3');
  });

  it('should write the date in the active language', async () => {
    await open('post-1');
    expect(root().textContent).toContain('Taken on October 2, 2026');

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(root().textContent).toContain('Tomada el 2 de octubre de 2026');
  });

  it('should explain when the set does not exist and offer the way back', async () => {
    await open('does-not-exist');

    expect(root().textContent).toContain('We could not find this set.');
    expect(root().querySelector('a.btn')?.getAttribute('href')).toBe('/gallery');
    expect(root().querySelector('app-set-stage')).toBeNull();
  });

  it('should be the main landmark so the skip link can focus it', async () => {
    await open('post-1');

    const main = root().querySelector('main') as HTMLElement;

    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('should not claim the set is missing while the sets are still loading', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PostViewerPageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        { provide: PhotoPostsStore, useValue: { findById: () => undefined, ready: signal(false) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PostViewerPageComponent);

    await open('unknown-set');

    expect(root().querySelector('.viewer__missing')).toBeNull();
  });

  it('should say the set is missing once the sets have loaded and it is not there', async () => {
    await open('unknown-set');

    expect(root().querySelector('.viewer__missing')?.textContent).toContain(
      'We could not find this set.',
    );
  });
});
