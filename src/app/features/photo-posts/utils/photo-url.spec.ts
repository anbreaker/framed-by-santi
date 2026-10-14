import { CloudinaryEnvironment } from '@environments/environment.model';

import { Photo } from '../models/photo.model';
import {
  cloudinaryUrl,
  DEFAULT_PHOTO_WIDTH,
  PHOTO_WIDTHS,
  photoSrcset,
  photoUrl,
  snapWidth,
} from './photo-url';

describe('photo URLs', () => {
  const photo: Photo = { alt: 'Flatiron', height: 1876, id: 'post-2/01', width: 1234 };
  const unconfigured: CloudinaryEnvironment = { cloudName: '', publicIdPrefix: '' };
  const cloudinary: CloudinaryEnvironment = {
    cloudName: 'demo-cloud',
    publicIdPrefix: 'framed-by-santi/test/',
  };
  const base = 'https://res.cloudinary.com/demo-cloud/image/upload';

  describe('without Cloudinary configured', () => {
    it('should point to the local WebP file of the photo', () => {
      expect(photoUrl(photo, 640, unconfigured)).toBe('/local-photos/post-2/01.webp');
    });

    it('should ignore the requested width and offer no srcset', () => {
      expect(photoUrl(photo, 2400, unconfigured)).toBe(photoUrl(photo, 480, unconfigured));
      expect(photoSrcset(photo, unconfigured)).toBeNull();
    });

    it('should be the default in tests, where no cloud name is provided', () => {
      expect(photoUrl(photo)).toBe('/local-photos/post-2/01.webp');
      expect(photoSrcset(photo)).toBeNull();
    });
  });

  describe('snapWidth', () => {
    it('should round up to the next fixed width so few variants are ever generated', () => {
      expect(snapWidth(100)).toBe(480);
      expect(snapWidth(480)).toBe(480);
      expect(snapWidth(481)).toBe(800);
      expect(snapWidth(1500)).toBe(1600);
    });

    it('should cap at the largest fixed width', () => {
      expect(snapWidth(6000)).toBe(PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1]);
    });
  });

  describe('with Cloudinary configured', () => {
    it('should build a delivery URL that never upscales and picks format and quality', () => {
      expect(cloudinaryUrl(cloudinary, 'post-2/01', 800)).toBe(
        `${base}/c_limit,f_auto,q_auto,w_800/framed-by-santi/test/post-2/01`
      );
    });

    it('should use the default width and the folder prefix for the plain src', () => {
      expect(photoUrl(photo, undefined, cloudinary)).toBe(
        `${base}/c_limit,f_auto,q_auto,w_${DEFAULT_PHOTO_WIDTH}/framed-by-santi/test/post-2/01`
      );
    });

    it('should snap an arbitrary width to a fixed variant', () => {
      expect(photoUrl(photo, 700, cloudinary)).toContain('w_800/');
    });

    it('should work without a folder prefix, as real photo ids will carry their own folder', () => {
      const real = { cloudName: 'demo-cloud', publicIdPrefix: '' };

      expect(photoUrl({ ...photo, id: 'framed-by-santi/posts/abc123' }, 480, real)).toBe(
        `${base}/c_limit,f_auto,q_auto,w_480/framed-by-santi/posts/abc123`
      );
    });
  });

  describe('photoSrcset', () => {
    it('should list the fixed widths that fit inside the photo and close with its own width', () => {
      // 1234 px wide: 480, 800 and 1200 fit; 1234 is the photo itself.
      const widths = (photoSrcset(photo, cloudinary) ?? '')
        .split(', ')
        .map((candidate) => candidate.split(' ')[1]);

      expect(widths).toEqual(['480w', '800w', '1200w', '1234w']);
    });

    it('should never promise more pixels than the photo has', () => {
      const small: Photo = { ...photo, width: 300 };
      const widths = (photoSrcset(small, cloudinary) ?? '')
        .split(', ')
        .map((candidate) => candidate.split(' ')[1]);

      expect(widths).toEqual(['300w']);
    });

    it('should use every fixed width, and no extra one, for a large original', () => {
      const original: Photo = { ...photo, width: 6000 };
      const widths = (photoSrcset(original, cloudinary) ?? '')
        .split(', ')
        .map((candidate) => candidate.split(' ')[1]);

      expect(widths).toEqual(['480w', '800w', '1200w', '1600w', '2400w']);
    });

    it('should not repeat a width when the photo has exactly a fixed width', () => {
      const exact: Photo = { ...photo, width: 800 };
      const widths = (photoSrcset(exact, cloudinary) ?? '')
        .split(', ')
        .map((candidate) => candidate.split(' ')[1]);

      expect(widths).toEqual(['480w', '800w']);
    });

    it('should pair every URL with the width it was generated for', () => {
      const candidates = (photoSrcset(photo, cloudinary) ?? '').split(', ');

      candidates.forEach((candidate) => {
        const [url, descriptor] = candidate.split(' ');

        expect(url).toContain(`w_${descriptor.replace('w', '')}/`);
      });
    });
  });
});
