import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '../../models/photo.model';
import { PostPhotoComponent } from './post-photo.component';

describe('PostPhotoComponent', () => {
  let fixture: ComponentFixture<PostPhotoComponent>;

  const photo: Photo = { alt: 'Flatiron, warm light', height: 1876, id: 'post-2/01', width: 1234 };

  const image = (): HTMLImageElement =>
    (fixture.nativeElement as HTMLElement).querySelector('img') as HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PostPhotoComponent] }).compileComponents();

    fixture = TestBed.createComponent(PostPhotoComponent);
    fixture.componentRef.setInput('photo', photo);
    await fixture.whenStable();
  });

  it('should render the photo from its URL with its real size to reserve the space', () => {
    expect(image().getAttribute('src')).toBe('/local-photos/post-2/01.webp');
    expect(image().width).toBe(1234);
    expect(image().height).toBe(1876);
  });

  it('should use the alt text of the photo unless an override is given', async () => {
    expect(image().alt).toBe('Flatiron, warm light');

    fixture.componentRef.setInput('alt', 'Translated alt');
    await fixture.whenStable();

    expect(image().alt).toBe('Translated alt');
  });

  it('should lazy load by default and load eagerly with high priority on demand', async () => {
    expect(image().getAttribute('loading')).toBe('lazy');
    expect(image().hasAttribute('fetchpriority')).toBe(false);

    fixture.componentRef.setInput('eager', true);
    await fixture.whenStable();

    expect(image().getAttribute('loading')).toBe('eager');
    expect(image().getAttribute('fetchpriority')).toBe('high');
  });
});
