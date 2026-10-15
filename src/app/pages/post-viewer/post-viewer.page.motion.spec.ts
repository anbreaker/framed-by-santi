import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PostViewerPageComponent } from './post-viewer.page';

const preload = vi.hoisted(() => vi.fn());
vi.mock('@features/post-viewer/utils/preload-photo', () => ({ preloadPhoto: preload }));

describe('PostViewerPageComponent motion', () => {
  let fixture: ComponentFixture<PostViewerPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const direction = (): string | null =>
    root().querySelector('.set-stage__frame > app-zoomable-photo')?.getAttribute('data-direction') ?? null;
  const next = (): void => (root().querySelector('.set-stage__arrow--next') as HTMLButtonElement).click();
  const previous = (): void =>
    (root().querySelector('.set-stage__arrow--previous') as HTMLButtonElement).click();
  const thumbnail = (index: number): HTMLButtonElement =>
    root().querySelectorAll('app-set-thumbnails button')[index] as HTMLButtonElement;

  beforeEach(async () => {
    localStorage.clear();
    preload.mockClear();

    await TestBed.configureTestingModule({
      imports: [PostViewerPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostViewerPageComponent);
    fixture.componentRef.setInput('postId', 'post-2');
    fixture.componentRef.setInput('photo', '3');
    await fixture.whenStable();
  });

  it('should warm up the photos before and after the one shown, so the next change never waits', () => {
    const ids = preload.mock.calls.map(([photo]) => photo?.id);

    expect(ids).toEqual(expect.arrayContaining(['post-2/02', 'post-2/04']));
    expect(ids).not.toContain('post-2/03');
  });

  it('should warm up the new neighbours after moving on', async () => {
    preload.mockClear();

    next();
    await fixture.whenStable();

    expect(preload.mock.calls.map(([photo]) => photo?.id)).toEqual(
      expect.arrayContaining(['post-2/03', 'post-2/05'])
    );
  });

  it('should tell the stage which way the set is being walked', async () => {
    next();
    await fixture.whenStable();
    expect(direction()).toBe('next');

    previous();
    await fixture.whenStable();
    expect(direction()).toBe('previous');
  });

  it('should compare positions when a thumbnail is picked', async () => {
    thumbnail(7).click();
    await fixture.whenStable();
    expect(direction()).toBe('next');

    thumbnail(1).click();
    await fixture.whenStable();
    expect(direction()).toBe('previous');
  });
});
