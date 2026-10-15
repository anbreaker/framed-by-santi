import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PostsAdminService } from '../../services/posts-admin.service';
import { ThemesAdminError, ThemesAdminService } from '../../services/themes-admin.service';
import { ThemeManagerComponent } from './theme-manager.component';

const SUNSET = { id: 'sunset', label: { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' } };
const post = (tags: string[]): { hidden: boolean; post: PhotoPost } => ({
  hidden: false,
  post: { caption: 'C', id: 'p', photos: [], tags, takenAt: '2026-10-01' },
});

describe('ThemeManagerComponent', () => {
  let fixture: ComponentFixture<ThemeManagerComponent>;
  let remove: ReturnType<typeof vi.fn>;
  let list: ReturnType<typeof vi.fn>;
  let removed: string[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(root().querySelectorAll('button')).find((item) =>
      item.textContent?.includes(label)
    ) as HTMLButtonElement | undefined;
  const click = async (label: string): Promise<void> => {
    button(label)?.click();
    await fixture.whenStable();
  };
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll('.theme-manager__item'));

  beforeEach(async () => {
    remove = vi.fn().mockResolvedValue(undefined);
    list = vi.fn().mockResolvedValue([post(['sunset', 'street']), post(['sunset']), post([])]);
    removed = [];

    await TestBed.configureTestingModule({
      imports: [ThemeManagerComponent, realTranslations()],
      providers: [
        { provide: ThemesAdminService, useValue: { remove } },
        { provide: PostsAdminService, useValue: { list } },
      ],
    }).compileComponents();

    TestBed.inject(PhotoPostsStore).addTheme(SUNSET);
    fixture = TestBed.createComponent(ThemeManagerComponent);
    fixture.componentInstance.removed.subscribe((id) => removed.push(id));
    await fixture.whenStable();
  });

  it('should stay closed until asked, so it does not load every set for nothing', () => {
    expect(rows()).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it('should list the themes, marking the default ones as protected and offering delete for the rest', async () => {
    await click('Manage themes');
    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    await fixture.whenStable();

    const sunset = rows().find((row) => row.textContent?.includes('Sunset')) as HTMLElement;
    const street = rows().find((row) => row.textContent?.includes('Street')) as HTMLElement;

    expect(sunset.querySelector('button')?.textContent).toContain('Delete');
    expect(street.querySelector('button')).toBeNull();
    expect(street.textContent).toContain('Default');
  });

  it('should show how many sets use each theme', async () => {
    await click('Manage themes');
    await vi.waitFor(() => expect(root().textContent).toContain('2 sets'));
  });

  it('should ask before deleting and let the author back out', async () => {
    await click('Manage themes');
    await vi.waitFor(() => expect(root().textContent).toContain('2 sets'));

    await click('Delete');
    expect(root().textContent).toContain('Delete “Sunset”?');
    expect(remove).not.toHaveBeenCalled();

    await click('Cancel');
    expect(root().textContent).not.toContain('Delete “Sunset”?');
    expect(remove).not.toHaveBeenCalled();
  });

  it('should delete the theme once confirmed, forget it and say so', async () => {
    await click('Manage themes');
    await vi.waitFor(() => expect(root().textContent).toContain('2 sets'));
    await click('Delete');

    await click('Yes, delete');
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith('sunset'));
    await fixture.whenStable();

    expect(
      TestBed.inject(PhotoPostsStore)
        .themes()
        .some((theme) => theme.id === 'sunset')
    ).toBe(false);
    expect(removed).toEqual(['sunset']);
    expect(rows().some((row) => row.textContent?.includes('Sunset'))).toBe(false);
  });

  it('should keep the theme and explain when the delete fails', async () => {
    remove.mockRejectedValue(new ThemesAdminError('request-failed'));
    await click('Manage themes');
    await vi.waitFor(() => expect(root().textContent).toContain('2 sets'));
    await click('Delete');

    await click('Yes, delete');
    await vi.waitFor(() => expect(root().querySelector('[role="alert"]')).not.toBeNull());

    expect(
      TestBed.inject(PhotoPostsStore)
        .themes()
        .some((theme) => theme.id === 'sunset')
    ).toBe(true);
    expect(removed).toEqual([]);
  });

  it('should still manage themes when the sets cannot be counted', async () => {
    list.mockRejectedValue(new Error('offline'));

    await click('Manage themes');
    await fixture.whenStable();

    expect(rows().length).toBeGreaterThan(0);
    expect(root().textContent).not.toContain('2 sets');
  });
});
