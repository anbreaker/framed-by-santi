import { Photo } from '../models/photo.model';
import { photoUrl } from './photo-url';

describe('photoUrl', () => {
  const photo: Photo = { alt: 'Flatiron', height: 1876, id: 'post-2/01', width: 1234 };

  it('should point to the local WebP file of the photo', () => {
    expect(photoUrl(photo)).toBe('/local-photos/post-2/01.webp');
  });

  it('should ignore the requested width until a CDN builder replaces it', () => {
    expect(photoUrl(photo, 640)).toBe(photoUrl(photo));
  });
});
