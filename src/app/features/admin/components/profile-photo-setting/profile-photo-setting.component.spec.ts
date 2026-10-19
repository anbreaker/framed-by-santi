import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { SiteSettingsAdminService } from '../../services/site-settings-admin.service';
import { IMAGE_CODEC, PREVIEW_MAKER } from '../../utils/photo-upload-tokens';
import { ImageCodec } from '../../utils/prepare-photo';
import {
  PROFILE_PHOTO_TIMEOUTS,
  ProfilePhotoSettingComponent,
} from './profile-photo-setting.component';

describe('ProfilePhotoSettingComponent', () => {
  let fixture: ComponentFixture<ProfilePhotoSettingComponent>;
  const profilePhoto = signal<Photo | null>(null);
  const setProfilePhoto = vi.fn((photo: Photo) => profilePhoto.set(photo));
  const upload = vi.fn();
  const saveProfilePhoto = vi.fn();
  const isProfilePhotoSaved = vi.fn();
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
  const makePreview = vi.fn();
  const timeouts = { save: 1000, upload: 1000 };
  const status = (): string => root().querySelector('[role="status"]')?.textContent?.trim() ?? '';
  const shownImage = (): string | null =>
    root().querySelector('.profile-photo-setting__photo img')?.getAttribute('src') ?? null;

  beforeEach(async () => {
    localStorage.clear();
    profilePhoto.set(null);
    setProfilePhoto.mockClear();
    upload
      .mockReset()
      .mockResolvedValue({ height: 900, publicId: 'framed-by-santi/posts/me', width: 600 });
    saveProfilePhoto.mockReset().mockResolvedValue(undefined);
    isProfilePhotoSaved.mockReset().mockResolvedValue(false);
    makePreview.mockReset().mockResolvedValue('blob:preview');
    timeouts.save = 1000;
    timeouts.upload = 1000;
    URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ProfilePhotoSettingComponent, realTranslations()],
      providers: [
        { provide: IMAGE_CODEC, useValue: codec },
        { provide: PREVIEW_MAKER, useValue: makePreview },
        { provide: PROFILE_PHOTO_TIMEOUTS, useValue: timeouts },
        { provide: PhotoUploadService, useValue: { upload } },
        { provide: SiteSettingsAdminService, useValue: { isProfilePhotoSaved, saveProfilePhoto } },
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

  it('should show the chosen photo at once, while it uploads', async () => {
    upload.mockReturnValue(new Promise(() => undefined));

    await choose(jpeg());
    await vi.waitFor(() => expect(shownImage()).toBe('blob:preview'));

    expect(status()).toBe('Uploading photo…');
  });

  it('should say when it is uploading and when it is saving', async () => {
    let finishSave: () => void = () => undefined;
    saveProfilePhoto.mockReturnValue(new Promise<void>((resolve) => (finishSave = resolve)));

    await choose(jpeg());
    await vi.waitFor(() => expect(status()).toBe('Saving…'));

    finishSave();
    await vi.waitFor(() => expect(status()).toContain('Saved'));
    expect(shownImage()).toContain('framed-by-santi/posts/me');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('should give up with a clear message when the upload takes too long', async () => {
    timeouts.upload = 20;
    upload.mockReturnValue(new Promise(() => undefined));

    await choose(jpeg());
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('taking too long')
    );

    expect(saveProfilePhoto).not.toHaveBeenCalled();
    expect(input().disabled).toBe(false);
    expect(shownImage()).toBe('/assets/images/profile.webp');
  });

  it('should give up with a clear message when the save takes too long', async () => {
    timeouts.save = 20;
    saveProfilePhoto.mockReturnValue(new Promise(() => undefined));

    await choose(jpeg());
    await vi.waitFor(() =>
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('taking too long')
    );

    expect(setProfilePhoto).not.toHaveBeenCalled();
  });

  it('should count a slow save as saved when the server already has the photo', async () => {
    timeouts.save = 20;
    saveProfilePhoto.mockReturnValue(new Promise(() => undefined));
    isProfilePhotoSaved.mockResolvedValue(true);

    await choose(jpeg());
    await vi.waitFor(() => expect(status()).toContain('Saved'));

    expect(isProfilePhotoSaved).toHaveBeenCalledWith('framed-by-santi/posts/me');
    expect(setProfilePhoto).toHaveBeenCalled();
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('should show only the preview of the last photo chosen', async () => {
    // The first upload fails at once, before its slow preview is ready; then another photo is chosen.
    upload.mockRejectedValueOnce(new PhotoUploadError('upload-failed'));
    upload.mockReturnValue(new Promise(() => undefined));
    let firstPreview: (url: string) => void = () => undefined;
    makePreview
      .mockReturnValueOnce(new Promise<string>((resolve) => (firstPreview = resolve)))
      .mockResolvedValueOnce('blob:second');

    await choose(jpeg());
    await vi.waitFor(() => expect(input().disabled).toBe(false));
    await choose(jpeg());
    await vi.waitFor(() => expect(shownImage()).toBe('blob:second'));

    firstPreview('blob:first');
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(shownImage()).toBe('blob:second');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
  });

  it('should still upload when a preview cannot be made', async () => {
    makePreview.mockRejectedValue(new Error('no decoder'));

    await choose(jpeg());
    await vi.waitFor(() => expect(setProfilePhoto).toHaveBeenCalled());
  });

  it('should not let a second photo be chosen while one is being saved', async () => {
    upload.mockReturnValue(new Promise(() => undefined));

    await choose(jpeg());

    expect(input().disabled).toBe(true);
  });
});
