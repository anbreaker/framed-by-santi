import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { PostEntry, PostsAdminService } from '@features/admin/services/posts-admin.service';
import { ThemesAdminService } from '@features/admin/services/themes-admin.service';
import { TranslationService } from '@features/admin/services/translation.service';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminSetPageComponent } from './admin-set.page';

const ENTRY: PostEntry = {
  hidden: false,
  post: {
    caption: { en: 'Flatiron', es: 'Flatiron ES', pt: 'Flatiron PT' },
    id: 'set-9',
    photos: [{ alt: '', height: 800, id: 'a', publicId: 'a', width: 1200 }],
    tags: [],
    takenAt: '2025-10-02',
  },
};

describe('AdminSetPageComponent', () => {
  let fixture: ComponentFixture<AdminSetPageComponent>;
  let get: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const open = async (id?: string): Promise<void> => {
    fixture = TestBed.createComponent(AdminSetPageComponent);
    if (id !== undefined) fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    get = vi.fn().mockResolvedValue(ENTRY);
    create = vi.fn().mockResolvedValue('new-1');

    await TestBed.configureTestingModule({
      imports: [AdminSetPageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        { provide: PostsAdminService, useValue: { create, get, save: vi.fn() } },
        { provide: ThemesAdminService, useValue: { create: vi.fn(), remove: vi.fn() } },
        { provide: TranslationService, useValue: { translate: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should open an empty editor for a new set, without loading anything', async () => {
    await open();

    expect(root().querySelector('h1')?.textContent).toContain('New set');
    expect(get).not.toHaveBeenCalled();
  });

  it('should load the set by its id and open it in the editor', async () => {
    await open('set-9');
    await vi.waitFor(() => expect(root().querySelector('h1')?.textContent).toContain('Edit set'));

    expect(get).toHaveBeenCalledWith('set-9');
    expect((root().querySelector('input[name$=".caption.en"]') as HTMLInputElement).value).toBe(
      'Flatiron'
    );
  });

  it('should say when the set does not exist', async () => {
    get.mockResolvedValue(null);

    await open('missing');
    await vi.waitFor(() => expect(root().textContent).toContain('does not exist'));

    expect(root().querySelector('app-post-editor')).toBeNull();
  });

  it('should say when the set cannot be loaded and let the author try again', async () => {
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ENTRY);

    await open('set-9');
    await vi.waitFor(() => expect(root().textContent).toContain('Could not load'));
    (
      Array.from(root().querySelectorAll('button')).find((item) =>
        item.textContent?.includes('Try again')
      ) as HTMLButtonElement
    ).click();

    await vi.waitFor(() => expect(root().querySelector('app-post-editor')).not.toBeNull());
  });

  it('should link back to the library and go there once a set is saved', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await open();

    expect(root().querySelector('a[href="/admin/dashboard"]')).not.toBeNull();

    const editor = fixture.debugElement.query((node) => node.name === 'app-post-editor');
    editor.componentInstance.saved.emit('new-1');

    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });
});
