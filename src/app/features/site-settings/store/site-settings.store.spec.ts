import { TestBed } from '@angular/core/testing';

import { SiteSettingsStore } from './site-settings.store';

const mocks = vi.hoisted(() => ({ configured: vi.fn(), getDocument: vi.fn() }));

vi.mock('@features/auth/services/firebase-config', () => ({
  isFirebaseConfigured: mocks.configured,
}));
vi.mock('@features/photo-posts/services/firestore-rest', () => ({
  getDocument: mocks.getDocument,
}));

const photo = { alt: 'Santi', height: 800, id: 'framed-by-santi/posts/me', width: 600 };

describe('SiteSettingsStore', () => {
  beforeEach(() => {
    mocks.configured.mockReset().mockReturnValue(true);
    mocks.getDocument.mockReset();
  });

  it('should read the profile photo from settings/site', async () => {
    mocks.getDocument.mockResolvedValue({ data: { profilePhoto: photo }, id: 'site' });

    const store = TestBed.inject(SiteSettingsStore);
    expect(store.ready()).toBe(false);

    await vi.waitFor(() => expect(store.ready()).toBe(true));
    expect(store.profilePhoto()).toEqual(photo);
    expect(mocks.getDocument).toHaveBeenCalledWith('settings', 'site');
  });

  it('should have no profile photo when the settings were never saved', async () => {
    mocks.getDocument.mockResolvedValue(null);

    const store = TestBed.inject(SiteSettingsStore);

    await vi.waitFor(() => expect(store.ready()).toBe(true));
    expect(store.profilePhoto()).toBeNull();
  });

  it('should have no profile photo, but be ready, when the settings cannot be read', async () => {
    mocks.getDocument.mockRejectedValue(new Error('offline'));

    const store = TestBed.inject(SiteSettingsStore);

    await vi.waitFor(() => expect(store.ready()).toBe(true));
    expect(store.profilePhoto()).toBeNull();
  });

  it('should not touch Firestore when Firebase is not configured', () => {
    mocks.configured.mockReturnValue(false);

    const store = TestBed.inject(SiteSettingsStore);

    expect(store.ready()).toBe(true);
    expect(store.profilePhoto()).toBeNull();
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });

  it('should show a photo saved in the dashboard without reloading', async () => {
    mocks.getDocument.mockResolvedValue(null);
    const store = TestBed.inject(SiteSettingsStore);
    await vi.waitFor(() => expect(store.ready()).toBe(true));

    store.setProfilePhoto(photo);

    expect(store.profilePhoto()).toEqual(photo);
  });

  it('should not let a slow first read undo a photo saved meanwhile', async () => {
    let release: (value: unknown) => void = () => undefined;
    mocks.getDocument.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const store = TestBed.inject(SiteSettingsStore);

    store.setProfilePhoto(photo);
    release(null);
    await Promise.resolve();
    await Promise.resolve();

    expect(store.profilePhoto()).toEqual(photo);
    expect(store.ready()).toBe(true);
  });
});
