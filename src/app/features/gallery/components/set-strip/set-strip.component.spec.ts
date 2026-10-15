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

  it('should show every photo of the set in the shared carousel, not just the first few', async () => {
    await setPost(cyclist());

    expect(root().querySelectorAll('app-photo-carousel .photo-carousel__item')).toHaveLength(
      cyclist().photos.length
    );
    expect(root().querySelector('.set-strip__more-tile')).toBeNull();
  });

  it('should open the whole set from the title and the button, at its start', async () => {
    await setPost(cyclist());

    const hrefs = (selector: string): (string | null)[] =>
      Array.from(root().querySelectorAll(selector)).map((link) => link.getAttribute('href'));

    expect(hrefs('h2 a')).toEqual(['/gallery/post-1']);
    expect(hrefs('.set-strip__open')).toEqual(['/gallery/post-1']);
    expect(text('.set-strip__open')).toBe('View full set');
  });

  it('should open the set on the very photo that was clicked', async () => {
    await setPost(cyclist());

    const hrefs = Array.from(root().querySelectorAll('.photo-carousel__link')).map((link) =>
      link.getAttribute('href')
    );

    expect(hrefs).toEqual(
      cyclist().photos.map((_, index) => `/gallery/post-1?photo=${index + 1}`)
    );
  });

  it('should use the singular for a set of one photo', async () => {
    const post = cyclist();

    await setPost({ ...post, photos: post.photos.slice(0, 1) });

    expect(text('.set-strip__meta')).toContain('1 photo');
  });
});
