import { TestBed } from '@angular/core/testing';

import { SiteSettingsAdminError, SiteSettingsAdminService } from './site-settings-admin.service';

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), setDoc: vi.fn() }));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  setDoc: mocks.setDoc,
}));

const photo = { alt: 'Santi García', height: 900, id: 'framed-by-santi/posts/me', width: 600 };

describe('SiteSettingsAdminService', () => {
  beforeEach(() => {
    mocks.getDb.mockReset().mockReturnValue({});
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
  });

  it('should save the profile photo as the only field of settings/site', async () => {
    await TestBed.inject(SiteSettingsAdminService).saveProfilePhoto(photo);

    expect(mocks.setDoc).toHaveBeenCalledWith({ path: 'settings/site' }, { profilePhoto: photo });
  });

  it('should fail clearly when Firebase is not configured or the write is refused', async () => {
    const service = TestBed.inject(SiteSettingsAdminService);

    mocks.setDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(service.saveProfilePhoto(photo)).rejects.toEqual(
      new SiteSettingsAdminError('request-failed')
    );

    mocks.getDb.mockReturnValue(null);
    await expect(service.saveProfilePhoto(photo)).rejects.toEqual(
      new SiteSettingsAdminError('not-configured')
    );
  });
});
