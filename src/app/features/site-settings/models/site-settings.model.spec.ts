import { toSiteSettings } from './site-settings.model';

const photo = { alt: 'Santi', height: 800, id: 'framed-by-santi/posts/me', width: 600 };

describe('toSiteSettings', () => {
  it('should read the profile photo', () => {
    expect(toSiteSettings({ profilePhoto: photo })).toEqual({ profilePhoto: photo });
  });

  it('should have no profile photo when it is missing or not a valid photo', () => {
    expect(toSiteSettings({})).toEqual({ profilePhoto: null });
    expect(toSiteSettings({ profilePhoto: { ...photo, width: 0 } })).toEqual({
      profilePhoto: null,
    });
    expect(toSiteSettings(null)).toEqual({ profilePhoto: null });
  });
});
