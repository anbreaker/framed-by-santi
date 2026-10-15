import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PostEntry, PostsAdminService } from '../../services/posts-admin.service';
import { SetLibraryComponent } from './set-library.component';

const photo = (id: string): PhotoPost['photos'][number] => ({
  alt: '',
  height: 800,
  id,
  publicId: id,
  width: 1200,
});
const entry = (
  id: string,
  caption: PhotoPost['caption'],
  hidden: boolean,
  photos = 3
): PostEntry => ({
  hidden,
  post: {
    caption,
    id,
    photos: Array.from({ length: photos }, (_, index) => photo(`${id}-${index}`)),
    tags: ['street'],
    takenAt: '2025-10-02',
  },
});

const ENTRIES = [
  entry('a', { en: 'Flatiron', es: 'Flatiron ES', pt: 'Flatiron PT' }, false, 6),
  entry('b', 'Cyclist', true, 1),
  entry('c', 'Fireworks', false, 10),
];

describe('SetLibraryComponent', () => {
  let fixture: ComponentFixture<SetLibraryComponent>;
  let list: ReturnType<typeof vi.fn>;
  let setHidden: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const cards = (): HTMLElement[] => Array.from(root().querySelectorAll('.set-library__card'));
  const titles = (): string[] =>
    cards().map((card) => card.querySelector('.set-library__title')?.textContent?.trim() ?? '');
  const chip = (label: string): HTMLButtonElement =>
    Array.from(root().querySelectorAll('.set-library__chip')).find((item) =>
      item.textContent?.includes(label)
    ) as HTMLButtonElement;
  const toggle = (index: number): HTMLInputElement =>
    cards()[index].querySelector('input[role="switch"]') as HTMLInputElement;
  const create = async (): Promise<void> => {
    fixture = TestBed.createComponent(SetLibraryComponent);
    await fixture.whenStable();
    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    list = vi.fn().mockResolvedValue(ENTRIES);
    setHidden = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [SetLibraryComponent, realTranslations()],
      providers: [provideRouter([]), { provide: PostsAdminService, useValue: { list, setHidden } }],
    }).compileComponents();
  });

  it('should show every set with its title, photo count and whether it is published', async () => {
    await create();

    expect(titles()).toEqual(['Flatiron', 'Cyclist', 'Fireworks']);
    expect(cards()[0].querySelector('.set-library__count')?.textContent).toContain('6');
    expect(cards()[0].querySelector('.set-library__badge')?.textContent).toContain('Published');
    expect(cards()[1].querySelector('.set-library__badge')?.textContent).toContain('Draft');
    expect(root().textContent).toContain('3 sets');
  });

  it('should link each set to its editor and offer a button to create a new one', async () => {
    await create();

    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(
      expect.arrayContaining(['/admin/sets/new', '/admin/sets/a', '/admin/sets/b', '/admin/sets/c'])
    );
  });

  it('should filter by status and show how many sets each filter has', async () => {
    await create();

    expect(chip('All').textContent).toContain('3');
    expect(chip('Published').textContent).toContain('2');
    expect(chip('Drafts').textContent).toContain('1');

    chip('Drafts').click();
    await fixture.whenStable();
    expect(titles()).toEqual(['Cyclist']);

    chip('Published').click();
    await fixture.whenStable();
    expect(titles()).toEqual(['Flatiron', 'Fireworks']);
  });

  it('should publish or hide a set from its switch without opening it', async () => {
    await create();

    toggle(1).click(); // Cyclist: draft -> published
    await vi.waitFor(() => expect(setHidden).toHaveBeenCalledWith('b', false));
    await fixture.whenStable();

    expect(cards()[1].querySelector('.set-library__badge')?.textContent).toContain('Published');
    expect(chip('Drafts').textContent).toContain('0');

    toggle(0).click(); // Flatiron: published -> hidden
    await vi.waitFor(() => expect(setHidden).toHaveBeenCalledWith('a', true));
  });

  it('should put the switch back and say so when the change fails', async () => {
    setHidden.mockRejectedValue(new Error('denied'));
    await create();

    toggle(1).click();
    await vi.waitFor(() => expect(root().querySelector('[role="alert"]')).not.toBeNull());
    await fixture.whenStable();

    expect(cards()[1].querySelector('.set-library__badge')?.textContent).toContain('Draft');
    expect(toggle(1).checked).toBe(false);
  });

  it('should invite to create the first set when there are none', async () => {
    list.mockResolvedValue([]);
    await create();

    expect(cards()).toEqual([]);
    expect(root().textContent).toContain('Nothing here yet');
  });

  it('should say when a filter has nothing, and when the sets cannot be loaded, with a way to retry', async () => {
    await create();
    chip('Drafts').click();
    await fixture.whenStable();
    toggle(0).click();
    await vi.waitFor(() => expect(setHidden).toHaveBeenCalled());
    await fixture.whenStable();
    expect(root().textContent).toContain('No drafts');

    list.mockReset();
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ENTRIES);
    fixture = TestBed.createComponent(SetLibraryComponent);
    await vi.waitFor(() => expect(root().textContent).toContain('Could not load'));

    (
      Array.from(root().querySelectorAll('button')).find((item) =>
        item.textContent?.includes('Try again')
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(titles().length).toBe(3));
  });
});
