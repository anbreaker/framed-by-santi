import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '../../models/photo.model';
import { PostPhotoComponent } from './post-photo.component';

vi.mock('@environments/environment', () => ({
  environment: {
    cloudinary: { cloudName: 'demo-cloud', publicIdPrefix: 'framed-by-santi/test/' },
    env: 'development',
    production: false,
  },
}));

describe('PostPhotoComponent with Cloudinary configured', () => {
  let fixture: ComponentFixture<PostPhotoComponent>;

  const photo: Photo = { alt: 'Flatiron', height: 1876, id: 'post-2/01', width: 1234 };

  const image = (): HTMLImageElement =>
    (fixture.nativeElement as HTMLElement).querySelector('img') as HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PostPhotoComponent] }).compileComponents();

    fixture = TestBed.createComponent(PostPhotoComponent);
    fixture.componentRef.setInput('photo', photo);
    await fixture.whenStable();
  });

  it('should fall back to a mid-size CDN variant in src', () => {
    expect(image().getAttribute('src')).toBe(
      'https://res.cloudinary.com/demo-cloud/image/upload/c_limit,f_auto,q_auto,w_1200/framed-by-santi/test/post-2/01'
    );
  });

  it('should offer the variants that fit the photo through srcset', () => {
    const srcset = image().getAttribute('srcset') ?? '';

    expect(srcset.split(', ')).toHaveLength(4);
    expect(srcset).toContain('w_480/');
    expect(srcset).toContain('480w');
    expect(srcset).toContain('1234w');
    expect(srcset).not.toContain('w_1600/');
  });

  it('should tell the browser how wide the image is rendered', async () => {
    expect(image().getAttribute('sizes')).toBe('100vw');

    fixture.componentRef.setInput('sizes', '(min-width: 768px) 45vw, 90vw');
    await fixture.whenStable();

    expect(image().getAttribute('sizes')).toBe('(min-width: 768px) 45vw, 90vw');
  });

  it('should keep the real size of the photo to reserve the space', () => {
    expect(image().width).toBe(1234);
    expect(image().height).toBe(1876);
  });
});
