import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { coverRatio } from '@features/photo-posts/utils/cover-ratio';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PostGridComponent } from './post-grid.component';

describe('PostGridComponent', () => {
  let fixture: ComponentFixture<PostGridComponent>;

  const items = (): HTMLElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PostGridComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostGridComponent);
    fixture.componentRef.setInput('posts', TestBed.inject(PhotoPostsStore).posts());
    await fixture.whenStable();
  });

  it('should render one tile per post, in the given order', () => {
    const hrefs = items().map((item) => item.querySelector('a')?.getAttribute('href'));

    expect(hrefs).toEqual(
      TestBed.inject(PhotoPostsStore)
        .posts()
        .map((post) => `/gallery/${post.id}`)
    );
  });

  it('should give each row item the ratio of its cover so rows stay justified', () => {
    const ratios = items().map((item) => item.style.getPropertyValue('--ratio'));

    expect(ratios).toEqual(
      TestBed.inject(PhotoPostsStore)
        .posts()
        .map((post) => String(coverRatio(post)))
    );
  });

  it('should expose the list semantics to assistive technology', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('ul')?.getAttribute('role')).toBe(
      'list'
    );
  });
});
