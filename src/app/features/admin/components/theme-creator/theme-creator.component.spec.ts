import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { ThemesAdminError, ThemesAdminService } from '../../services/themes-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
import { ThemeCreatorComponent } from './theme-creator.component';

const LABEL = { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' };

describe('ThemeCreatorComponent', () => {
  let fixture: ComponentFixture<ThemeCreatorComponent>;
  let translate: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let created: unknown[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector('input') as HTMLInputElement;
  const button = (): HTMLButtonElement => root().querySelector('button') as HTMLButtonElement;
  const type = async (value: string): Promise<void> => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    translate = vi
      .fn()
      .mockResolvedValue({ en: ['Sunset'], es: ['Atardecer'], pt: ['Pôr do sol'] });
    create = vi.fn().mockResolvedValue({ id: 'sunset', label: LABEL });
    created = [];

    await TestBed.configureTestingModule({
      imports: [ThemeCreatorComponent, realTranslations()],
      providers: [
        { provide: TranslationService, useValue: { translate } },
        { provide: ThemesAdminService, useValue: { create } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeCreatorComponent);
    fixture.componentRef.setInput('sourceLang', 'en');
    fixture.componentInstance.created.subscribe((theme) => created.push(theme));
    await fixture.whenStable();
  });

  it('should keep the button disabled until a name is typed', async () => {
    expect(button().disabled).toBe(true);

    await type('Sunset');

    expect(button().disabled).toBe(false);
  });

  it('should translate the name from the source language, create the theme and offer it everywhere', async () => {
    await type('  Sunset ');

    button().click();
    await vi.waitFor(() => expect(created).toHaveLength(1));

    expect(translate).toHaveBeenCalledWith('en', ['Sunset']);
    expect(create).toHaveBeenCalledWith(LABEL);
    expect(
      TestBed.inject(PhotoPostsStore)
        .themes()
        .some((theme) => theme.id === 'sunset')
    ).toBe(true);
    expect(created[0]).toEqual({ id: 'sunset', label: LABEL });
    expect(input().value).toBe('');
  });

  it('should explain a translation limit and keep what was typed', async () => {
    translate.mockRejectedValue(new TranslationError('limit'));
    await type('Sunset');

    button().click();
    await vi.waitFor(() => expect(root().querySelector('[role="alert"]')).not.toBeNull());

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('limit');
    expect(create).not.toHaveBeenCalled();
    expect(input().value).toBe('Sunset');
  });

  it('should say when the theme already exists', async () => {
    create.mockRejectedValue(new ThemesAdminError('exists'));
    await type('Sunset');

    button().click();
    await vi.waitFor(() => expect(root().querySelector('[role="alert"]')).not.toBeNull());

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('already exists');
    expect(created).toEqual([]);
  });
});
