import { TestBed } from '@angular/core/testing';

import { ThemesAdminService } from './themes-admin.service';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, name: string, id: string) => ({ id, name }),
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
}));

const label = { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' };

describe('ThemesAdminService', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getDb.mockReturnValue({});
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.setDoc.mockResolvedValue(undefined);
  });

  it('should create the theme with an id built from the English name', async () => {
    const theme = await TestBed.inject(ThemesAdminService).create(label);

    expect(theme).toEqual({ id: 'sunset', label });
    expect(mocks.setDoc).toHaveBeenCalledWith({ id: 'sunset', name: 'themes' }, { label });
  });

  it('should use another language for the id when English is empty', async () => {
    const theme = await TestBed.inject(ThemesAdminService).create({ ...label, en: '' });

    expect(theme.id).toBe('atardecer');
  });

  it('should refuse a name that gives no usable id', async () => {
    const failure = TestBed.inject(ThemesAdminService).create({ en: '?', es: '!', pt: '' });

    await expect(failure).rejects.toMatchObject({ reason: 'invalid-name' });
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('should not overwrite a theme that already exists', async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true });

    const failure = TestBed.inject(ThemesAdminService).create(label);

    await expect(failure).rejects.toMatchObject({ reason: 'exists' });
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('should fail with a typed error when Firebase is missing or the write fails', async () => {
    mocks.getDb.mockReturnValue(null);
    await expect(TestBed.inject(ThemesAdminService).create(label)).rejects.toMatchObject({
      reason: 'not-configured',
    });

    mocks.getDb.mockReturnValue({});
    mocks.setDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(TestBed.inject(ThemesAdminService).create(label)).rejects.toMatchObject({
      reason: 'request-failed',
    });
  });
});
