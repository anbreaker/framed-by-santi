import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { SetThumbnailsComponent } from './set-thumbnails.component';

describe('SetThumbnailsComponent', () => {
  let fixture: ComponentFixture<SetThumbnailsComponent>;
  let picked: number[];

  const photos: Photo[] = [0, 1, 2].map((index) => ({
    alt: `Photo ${index}`,
    height: 100,
    id: `post-test/0${index + 1}`,
    width: 100,
  }));

  const buttons = (): HTMLButtonElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  beforeEach(async () => {
    localStorage.clear();
    picked = [];

    await TestBed.configureTestingModule({
      imports: [SetThumbnailsComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SetThumbnailsComponent);
    fixture.componentRef.setInput('photos', photos);
    fixture.componentRef.setInput('activeIndex', 1);
    fixture.componentInstance.picked.subscribe((index) => picked.push(index));
    await fixture.whenStable();
  });

  it('should render one button per photo, named by its position in the set', () => {
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Photo 1 of 3',
      'Photo 2 of 3',
      'Photo 3 of 3',
    ]);
  });

  it('should flag only the active photo as current', () => {
    expect(buttons().map((button) => button.getAttribute('aria-current'))).toEqual([
      null,
      'true',
      null,
    ]);
  });

  it('should report the index of the picked photo', () => {
    buttons()[2].click();

    expect(picked).toEqual([2]);
  });

  it('should keep thumbnails decorative because the buttons already have names', () => {
    const alts = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('img')).map(
      (image) => image.alt
    );

    expect(alts).toEqual(['', '', '']);
  });
});
