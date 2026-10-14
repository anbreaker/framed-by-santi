import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PostTileComponent } from './post-tile.component';

describe('PostTileComponent', () => {
  let fixture: ComponentFixture<PostTileComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const link = (): HTMLAnchorElement => root().querySelector('a') as HTMLAnchorElement;
  const setPost = async (post: PhotoPost): Promise<void> => {
    fixture.componentRef.setInput('post', post);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PostTileComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostTileComponent);
  });

  it('should open the post and name it for assistive technology', async () => {
    const post = TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost;

    await setPost(post);

    expect(link().getAttribute('href')).toBe('/gallery/post-1');
    expect(link().getAttribute('aria-label')).toBe('Open set: Cyclist in motion');
  });

  it('should mark sets with a stack badge showing how many photos they hold', async () => {
    await setPost(TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost);

    expect(root().querySelector('.post-tile__stack')?.textContent?.trim()).toBe('10');
  });

  it('should show the cover and peek at the second photo of a set', async () => {
    const post = TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost;

    await setPost(post);

    const sources = Array.from(root().querySelectorAll('img')).map((image) =>
      image.getAttribute('src')
    );
    expect(sources).toEqual(['/local-photos/post-1/01.webp', '/local-photos/post-1/02.webp']);
  });

  it('should skip the badge and the peek for a post with a single photo', async () => {
    const single: PhotoPost = {
      caption: 'Alone',
      id: 'post-single',
      photos: [{ alt: 'Alone', height: 100, id: 'post-single/01', width: 100 }],
      tags: [],
      takenAt: '2026-01-01',
    };

    await setPost(single);

    expect(root().querySelector('.post-tile__stack')).toBeNull();
    expect(root().querySelectorAll('img')).toHaveLength(1);
  });

  it('should name its cover so it can morph into the viewer photo', async () => {
    await setPost(TestBed.inject(PhotoPostsStore).findById('post-2') as PhotoPost);

    const media = root().querySelector('.post-tile__media') as HTMLElement;

    expect(media.style.getPropertyValue('view-transition-name')).toBe('cover-post-2');
  });

  it('should hide decorative images from assistive technology', async () => {
    await setPost(TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost);

    const alts = Array.from(root().querySelectorAll('img')).map((image) => image.alt);

    expect(alts).toEqual(['', '']);
  });
});
