import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { SetStripComponent } from './set-strip.component';

describe('SetStripComponent', () => {
  let fixture: ComponentFixture<SetStripComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (selector: string): string | undefined =>
    root().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const setPost = async (post: PhotoPost): Promise<void> => {
    fixture.componentRef.setInput('post', post);
    await fixture.whenStable();
  };
  const cyclist = (): PhotoPost => TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SetStripComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SetStripComponent);
  });

  it('should name the set with its date and how many photos it holds', async () => {
    await setPost(cyclist());

    expect(text('h2')).toBe('Cyclist in motion');
    expect(text('.set-strip__meta')).toBe('Oct 2, 2026 · 10 photos');
  });

  it('should preview the first photos and count the ones left out', async () => {
    await setPost(cyclist());

    const sources = Array.from(root().querySelectorAll('img')).map((image) =>
      image.getAttribute('src'),
    );

    expect(sources).toHaveLength(5);
    expect(sources[0]).toBe('/local-photos/post-1/01.webp');
    expect(text('.set-strip__more-tile')).toBe('+5');
  });

  it('should open the whole set from the title, the button and the counter tile', async () => {
    await setPost(cyclist());

    const hrefs = (selector: string): (string | null)[] =>
      Array.from(root().querySelectorAll(selector)).map((link) => link.getAttribute('href'));

    expect(hrefs('h2 a')).toEqual(['/gallery/post-1']);
    expect(hrefs('.set-strip__open')).toEqual(['/gallery/post-1']);
    expect(hrefs('.set-strip__more-tile')).toEqual(['/gallery/post-1']);
    expect(text('.set-strip__open')).toBe('View full set');
  });

  it('should open the set on the very photo that was clicked', async () => {
    await setPost(cyclist());

    const hrefs = Array.from(root().querySelectorAll('.set-strip__link')).map((link) =>
      link.getAttribute('href'),
    );

    expect(hrefs).toEqual([1, 2, 3, 4, 5].map((n) => `/gallery/post-1?photo=${n}`));
  });

  it('should show every photo and no counter tile when the set is short', async () => {
    const post = cyclist();

    await setPost({ ...post, photos: post.photos.slice(0, 3) });

    expect(root().querySelectorAll('img')).toHaveLength(3);
    expect(root().querySelector('.set-strip__more-tile')).toBeNull();
    expect(text('.set-strip__meta')).toContain('3 photos');
  });

  it('should use the singular for a set of one photo', async () => {
    const post = cyclist();

    await setPost({ ...post, photos: post.photos.slice(0, 1) });

    expect(text('.set-strip__meta')).toContain('1 photo');
  });
});
