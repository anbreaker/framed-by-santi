import { PROFILE_PHOTO, PROFILE_PHOTO_SOURCE } from '@features/about/const/profile-photo.const';

import { portraitFor } from './portrait';

describe('portraitFor', () => {
  it('should be the photo chosen in the dashboard, served from Cloudinary', () => {
    const photo = { alt: 'Santi', height: 900, id: 'framed-by-santi/posts/me', width: 600 };

    expect(portraitFor(photo)).toEqual({ photo, source: null });
  });

  it('should be the portrait that ships with the site when none was chosen', () => {
    expect(portraitFor(null)).toEqual({ photo: PROFILE_PHOTO, source: PROFILE_PHOTO_SOURCE });
  });
});
