import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { ZoomablePhotoComponent } from './zoomable-photo.component';

vi.mock('@environments/environment', () => ({
  environment: {
    cloudinary: { cloudName: 'demo-cloud', publicIdPrefix: 'framed-by-santi/test/' },
    env: 'development',
    production: false,
  },
}));

describe('ZoomablePhotoComponent with Cloudinary configured', () => {
  let fixture: ComponentFixture<ZoomablePhotoComponent>;

  const photo: Photo = { alt: 'Portrait', height: 3000, id: 'post-test/01', width: 2000 };

  const sizes = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('sizes') ?? null;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ZoomablePhotoComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoomablePhotoComponent);
    fixture.componentRef.setInput('photo', photo);
    await fixture.whenStable();
  });

  it('should ask for a sharper variant only while the photo is zoomed in', async () => {
    expect(sizes()).toBe('100vw');

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'button[aria-label="Zoom in"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(sizes()).toBe('250vw');

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'button[aria-label="Reset zoom"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(sizes()).toBe('100vw');
  });
});
