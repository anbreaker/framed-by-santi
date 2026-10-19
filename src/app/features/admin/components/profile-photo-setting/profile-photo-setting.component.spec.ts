import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { SiteSettingsAdminService } from '../../services/site-settings-admin.service';
import { ImageCodec } from '../../utils/prepare-photo';
import { IMAGE_CODEC } from '../upload-panel/upload-panel.component';
import { ProfilePhotoSettingComponent } from './profile-photo-setting.component';

describe('ProfilePhotoSettingComponent', () => {
  let fixture: ComponentFixture<ProfilePhotoSettingComponent>;
  const profilePhoto = signal<Photo | null>(null);
  const setProfilePhoto = vi.fn((photo: Photo) => profilePhoto.set(photo));
  const upload = vi.fn();
  const saveProfilePhoto = vi.fn();
  // A small JPEG fits as it is, so it is uploaded untouched.
  const codec: ImageCodec = {
    decode: vi.fn().mockResolvedValue({ height: 900, source: {}, width: 600 }),
    encode: vi.fn(),
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement =>
    root().querySelector('input[type="file"]') as HTMLInputElement;
  const choose = async (file: File): Promise<void> => {
    Object.defineProperty(input(), 'files', { configurable: true, value: [file] });
    input().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const jpeg = (): File => new File(['x'], 'me.jpg', { type: 'image/jpeg' });

  beforeEach(async () => {
    localStorage.clear();
    profilePhoto.set(null);
    setProfilePhoto.mockClear();
    upload
      .mockReset()
      .mockResolvedValue({ height: 900, publicId: 'framed-by-santi/posts/me', width: 600 });
    saveProfilePhoto.mockReset().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ProfilePhotoSettingComponent, realTranslations()],
      providers: [
        { provide: IMAGE_CODEC, useValue: codec },
        { provide: PhotoUploadService, useValue: { upload } },
        { provide: SiteSettingsAdminService, useValue: { saveProfilePhoto } },
        {
          provide: SiteSettingsStore,
          useValue: { profilePhoto, ready: signal(true), setProfilePhoto },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePhotoSettingComponent);
    await fixture.whenStable();
  });

  it('should show the current portrait, the one that ships with the site until one is chosen', async () => {
    expect(root().querySelector('h2')?.textContent).toContain('Profile photo');
    expect(root().querySelector('img')?.getAttribute('src')).toBe('/assets/images/profile.webp');

    profilePhoto.set({ alt: 'x', height: 900, id: 'framed-by-santi/posts/me', width: 600 });
    await fixture.whenStable();

    expect(root().querySelector('img')?.getAttribute('src')).toContain('framed-by-santi/posts/me');
  });

  it('should accept only the supported image types', () => {
    expect(input().accept).toBe('image/jpeg,image/png,image/webp');
  });

  it('should upload the chosen photo, save it and show it at once', async () => {
    await choose(jpeg());
    await vi.waitFor(() => expect(setProfilePhoto).toHaveBeenCalled());

    const saved = {
      alt: 'Santi García',
      height: 900,
      id: 'framed-by-santi/posts/me',
      publicId: 'framed-by-santi/posts/me',
      width: 600,
    };
    expect(upload).toHaveBeenCalledTimes(1);
    expect(saveProfilePhoto).toHaveBeenCalledWith(saved);
    expect(setProfilePhoto).toHaveBeenCalledWith(saved);
    await fixture.whenStable();
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Saved');
  });

  it('should say why the upload failed and keep the current portrait', async () => {
    upload.mockRejectedValue(new PhotoUploadError('not-allowed'));

    await choose(jpeg());
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('not allowed to upload')
    );

    expect(saveProfilePhoto).not.toHaveBeenCalled();
    expect(setProfilePhoto).not.toHaveBeenCalled();
  });

  it('should say when the photo was uploaded but could not be saved', async () => {
    saveProfilePhoto.mockRejectedValue(new Error('denied'));

    await choose(jpeg());
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('could not be saved')
    );

    expect(setProfilePhoto).not.toHaveBeenCalled();
  });

  it('should not let a second photo be chosen while one is being saved', async () => {
    upload.mockReturnValue(new Promise(() => undefined));

    await choose(jpeg());

    expect(input().disabled).toBe(true);
  });
});
