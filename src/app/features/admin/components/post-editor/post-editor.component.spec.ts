import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PostsAdminError, PostsAdminService } from '../../services/posts-admin.service';
import { ThemesAdminService } from '../../services/themes-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
import { ThemeManagerComponent } from '../theme-manager/theme-manager.component';
import { UploadPanelComponent } from '../upload-panel/upload-panel.component';
import { PostEditorComponent } from './post-editor.component';

describe('PostEditorComponent', () => {
  let fixture: ComponentFixture<PostEditorComponent>;
  let create: ReturnType<typeof vi.fn>;
  let translate: ReturnType<typeof vi.fn>;
  let createTheme: ReturnType<typeof vi.fn>;
  let saved: string[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (label: string): HTMLButtonElement =>
    Array.from(root().querySelectorAll('button')).find((item) =>
      item.textContent?.includes(label)
    ) as HTMLButtonElement;

  const type = async (selector: string, value: string): Promise<void> => {
    const input = root().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  let localId = 0;
  const panel = (): UploadPanelComponent =>
    fixture.debugElement.query(By.directive(UploadPanelComponent))
      .componentInstance as UploadPanelComponent;
  const queue = (name = 'x.jpg'): number => {
    const id = localId++;
    panel().queued.emit({ localId: id, name, previewUrl: 'blob:preview' });
    return id;
  };
  const finish = async (id: number, publicId: string | null): Promise<void> => {
    panel().finished.emit({
      localId: id,
      result: publicId === null ? null : { height: 800, publicId, width: 1200 },
    });
    await fixture.whenStable();
  };
  const upload = async (...ids: string[]): Promise<void> => {
    for (const id of ids) await finish(queue(), id);
  };

  beforeEach(async () => {
    create = vi.fn().mockResolvedValue('new-1');
    // Publishing translates what is missing; by default that fails, and publishing must go on anyway.
    translate = vi.fn().mockRejectedValue(new TranslationError('failed'));
    createTheme = vi.fn();
    saved = [];

    await TestBed.configureTestingModule({
      imports: [PostEditorComponent, realTranslations()],
      providers: [
        { provide: PostsAdminService, useValue: { create } },
        { provide: TranslationService, useValue: { translate } },
        { provide: ThemesAdminService, useValue: { create: createTheme } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostEditorComponent);
    fixture.componentInstance.saved.subscribe((id) => saved.push(id));
    await fixture.whenStable();
  });

  it('should not save without photos and say so', async () => {
    await type('input[name$=".caption.en"]', 'Cyclist');
    button('Publish').click();
    await fixture.whenStable();

    expect(create).not.toHaveBeenCalled();
    expect(root().textContent).toContain('Add at least one photo.');
  });

  it('should not save without a caption and show the caption error', async () => {
    await upload('a');
    button('Publish').click();
    await fixture.whenStable();

    expect(create).not.toHaveBeenCalled();
    expect(root().textContent).toContain('Write a caption');
  });

  it('should publish a visible post with its texts, hashtags, tags and photos', async () => {
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');
    await type('textarea[name$=".description.en"]', 'Set text');
    await type('input[name$=".hashtags"]', '#street nyc');
    await type('input[name$=".takenAt"]', '2026-10-02');
    (root().querySelector('.post-editor__chip') as HTMLButtonElement).click();
    await fixture.whenStable();

    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    const [post, visibility] = create.mock.calls[0];
    expect(visibility).toEqual({ hidden: false });
    expect(post).toMatchObject({
      caption: { en: 'Cyclist', es: '', pt: '' },
      description: { en: 'Set text', es: '', pt: '' },
      hashtags: ['street', 'nyc'],
      tags: ['architecture'],
      takenAt: '2026-10-02',
    });
    expect(post.photos).toEqual([
      { alt: 'Cyclist', height: 800, id: 'a', publicId: 'a', width: 1200 },
    ]);
    await vi.waitFor(() => expect(saved).toEqual(['new-1']));
  });

  it('should keep the post hidden when saved as a draft', async () => {
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');

    button('Save as draft').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][1]).toEqual({ hidden: true });
  });

  it('should reorder, set a cover and remove photos from the viewer, and publish them in that order', async () => {
    await upload('a', 'b', 'c');
    const click = async (label: string): Promise<void> => {
      button(label).click();
      await fixture.whenStable();
    };
    const thumb = async (index: number): Promise<void> => {
      (root().querySelectorAll('.photo-stage__thumb')[index] as HTMLButtonElement).click();
      await fixture.whenStable();
    };

    await click('Move later'); // a,b,c -> b,a,c
    await thumb(2);
    await click('Make cover'); // -> c,b,a
    await thumb(1);
    await click('Remove'); // -> c,a

    await type('input[name$=".caption.en"]', 'C');
    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].photos.map((photo: { id: string }) => photo.id)).toEqual([
      'c',
      'a',
    ]);
  });

  it('should upload the files dropped on the empty viewer and open the chooser from it', async () => {
    const panel = fixture.debugElement.query(By.directive(UploadPanelComponent))
      .componentInstance as UploadPanelComponent;
    const addFiles = vi.spyOn(panel, 'addFiles').mockResolvedValue(undefined);
    const openPicker = vi.spyOn(panel, 'openPicker').mockImplementation(() => undefined);
    const zone = root().querySelector('.photo-stage__empty') as HTMLElement;
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });

    zone.dispatchEvent(drop);
    zone.click();

    expect(addFiles).toHaveBeenCalledWith([file]);
    expect(openPicker).toHaveBeenCalledTimes(1);
  });

  it('should drop a theme from the set when that theme is deleted', async () => {
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');
    (root().querySelector('.post-editor__chip') as HTMLButtonElement).click(); // architecture
    await fixture.whenStable();
    const manager = fixture.debugElement.query(By.directive(ThemeManagerComponent))
      .componentInstance as ThemeManagerComponent;

    manager.removed.emit('architecture');
    await fixture.whenStable();
    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].tags).toEqual([]);
  });

  it('should publish the alt text written for a photo in the viewer', async () => {
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');
    await type('.photo-stage__alt', 'A cyclist at dusk');

    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].photos[0].alt).toBe('A cyclist at dusk');
  });

  it('should show a chosen photo right away from its local preview, before it is uploaded', async () => {
    queue('a.jpg');
    await fixture.whenStable();

    expect(root().querySelector('img.photo-stage__preview')?.getAttribute('src')).toBe(
      'blob:preview'
    );
    expect(root().textContent).toContain('1 photos');
  });

  it('should swap the preview for the uploaded photo and keep the alt text typed meanwhile', async () => {
    const id = queue();
    await fixture.whenStable();
    await type('.photo-stage__alt', 'A cyclist');

    await finish(id, 'folder/a');

    expect(root().querySelector('img.photo-stage__preview')).toBeNull();
    expect((root().querySelector('.photo-stage__alt') as HTMLInputElement).value).toBe('A cyclist');
  });

  it('should not publish while a photo is still uploading or has failed, and say so', async () => {
    const failed = queue();
    queue();
    await finish(failed, null);
    await type('input[name$=".caption.en"]', 'Cyclist');

    button('Publish').click();
    await fixture.whenStable();

    expect(create).not.toHaveBeenCalled();
    expect(root().textContent).toContain('uploads to finish');
  });

  it('should publish once the failed photo is removed and the rest are uploaded', async () => {
    const failed = queue();
    await finish(failed, null);
    await upload('good');
    await type('input[name$=".caption.en"]', 'Cyclist');
    (root().querySelectorAll('.photo-stage__thumb')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    button('Remove').click();
    await fixture.whenStable();

    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].photos.map((p: { id: string }) => p.id)).toEqual(['good']);
  });

  it('should write the texts of each language apart and flag the languages still missing', async () => {
    await type('input[name$=".caption.en"]', 'Cyclist');
    const tabs = (): HTMLButtonElement[] =>
      Array.from(root().querySelectorAll('.lang-tabs__button')) as HTMLButtonElement[];

    expect(tabs().map((tab) => tab.querySelector('.lang-tabs__missing') !== null)).toEqual([
      false,
      true,
      true,
    ]);

    tabs()[1].click();
    await fixture.whenStable();
    expect(root().querySelector('input[name$=".caption.en"]')).toBeNull();
    await type('input[name$=".caption.es"]', 'Ciclista');

    await upload('a');
    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].caption).toEqual({ en: 'Cyclist', es: 'Ciclista', pt: '' });
  });

  it('should translate from the active language into the other two and let the author edit the result', async () => {
    translate.mockResolvedValue({
      en: ['Cyclist', 'Set text'],
      es: ['Ciclista', 'Texto'],
      pt: ['Ciclista PT', 'Texto PT'],
    });
    await type('input[name$=".caption.en"]', 'Cyclist');
    await type('textarea[name$=".description.en"]', 'Set text');

    button('Translate').click();
    await vi.waitFor(() => expect(root().textContent).toContain('Translated.'));

    expect(translate).toHaveBeenCalledWith('auto', ['Cyclist', 'Set text']);
    (Array.from(root().querySelectorAll('.lang-tabs__button'))[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect((root().querySelector('input[name$=".caption.pt"]') as HTMLInputElement).value).toBe(
      'Ciclista PT'
    );
    expect(
      (root().querySelector('textarea[name$=".description.pt"]') as HTMLTextAreaElement).value
    ).toBe('Texto PT');
  });

  describe('publishing translates what is missing', () => {
    const missing = (cap: string[], desc: string[] = []): Record<string, string[]> => ({
      en: [cap[0], ...desc.slice(0, 1)],
      es: [cap[1], ...desc.slice(1, 2)],
      pt: [cap[2], ...desc.slice(2, 3)],
    });
    const tab = async (index: number): Promise<void> => {
      (root().querySelectorAll('.lang-tabs__button')[index] as HTMLButtonElement).click();
      await fixture.whenStable();
    };

    it('should fill only the empty languages and never replace what the author wrote', async () => {
      translate.mockResolvedValue(missing(['Cyclist', 'AUTO ES', 'Ciclista PT']));
      await upload('a');
      await type('input[name$=".caption.en"]', 'Cyclist');
      await tab(1);
      await type('input[name$=".caption.es"]', 'Ciclista');

      button('Publish').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());

      expect(create.mock.calls[0][0].caption).toEqual({
        en: 'Cyclist',
        es: 'Ciclista',
        pt: 'Ciclista PT',
      });
    });

    it('should translate the description too, from whichever language has one', async () => {
      translate.mockResolvedValue(
        missing(['Cyclist', 'Ciclista', 'Ciclista PT'], ['Set text', 'Serie', 'Série'])
      );
      await upload('a');
      await type('input[name$=".caption.en"]', 'Cyclist');
      await type('textarea[name$=".description.en"]', 'Set text');

      button('Publish').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());

      expect(translate).toHaveBeenCalledWith('auto', ['Cyclist', 'Set text']);
      expect(create.mock.calls[0][0].description).toEqual({
        en: 'Set text',
        es: 'Serie',
        pt: 'Série',
      });
    });

    it('should send only the texts that exist, using the language the author wrote in', async () => {
      translate.mockResolvedValue(missing(['Cyclist', 'Ciclista', 'Ciclista PT']));
      await upload('a');
      await tab(1);
      await type('input[name$=".caption.es"]', 'Ciclista');

      button('Publish').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());

      expect(translate).toHaveBeenCalledWith('auto', ['Ciclista']);
    });

    it('should not translate when saving a draft, to keep the quota for what gets published', async () => {
      await upload('a');
      await type('input[name$=".caption.en"]', 'Cyclist');

      button('Save as draft').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());

      expect(translate).not.toHaveBeenCalled();
    });

    it('should not translate when every language already has its text', async () => {
      await upload('a');
      await type('input[name$=".caption.en"]', 'Cyclist');
      await tab(1);
      await type('input[name$=".caption.es"]', 'Ciclista');
      await tab(2);
      await type('input[name$=".caption.pt"]', 'Ciclista PT');

      button('Publish').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());

      expect(translate).not.toHaveBeenCalled();
    });

    it('should publish anyway when the translation fails, and say which languages were left out', async () => {
      translate.mockRejectedValue(new TranslationError('limit'));
      await upload('a');
      await type('input[name$=".caption.en"]', 'Cyclist');

      button('Publish').click();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());
      await vi.waitFor(() => expect(root().textContent).toContain('could not be translated'));

      expect(create.mock.calls[0][1]).toEqual({ hidden: false });
      expect(create.mock.calls[0][0].caption).toEqual({ en: 'Cyclist', es: '', pt: '' });
    });
  });

  it('should not offer to translate without a caption in the active language', () => {
    expect(button('Translate').disabled).toBe(true);
  });

  it('should say why a translation failed and leave the texts alone', async () => {
    translate.mockRejectedValue(new TranslationError('limit'));
    await type('input[name$=".caption.en"]', 'Cyclist');

    button('Translate').click();
    await vi.waitFor(() => expect(root().textContent).toContain('limit was reached'));

    expect(button('Translate').disabled).toBe(false);
  });

  it('should select a theme right after creating it', async () => {
    const theme = { id: 'sunset', label: { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' } };
    translate.mockResolvedValue({ en: ['Sunset'], es: ['Atardecer'], pt: ['Pôr do sol'] });
    createTheme.mockResolvedValue(theme);
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');
    await type('.theme-creator input', 'Sunset');

    button('Create theme').click();
    await vi.waitFor(() => expect(createTheme).toHaveBeenCalled());
    await fixture.whenStable();
    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].tags).toEqual(['sunset']);
  });

  it('should tell the author when saving fails and allow trying again', async () => {
    create.mockRejectedValue(new PostsAdminError('request-failed'));
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');

    button('Publish').click();
    await vi.waitFor(() => expect(root().textContent).toContain('Could not save'));

    expect(button('Publish').disabled).toBe(false);
    expect(saved).toEqual([]);
  });
});
