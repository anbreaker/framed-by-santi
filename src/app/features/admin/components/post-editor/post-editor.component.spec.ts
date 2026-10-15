import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PostsAdminError, PostsAdminService } from '../../services/posts-admin.service';
import { ThemesAdminService } from '../../services/themes-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
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

  const upload = async (...ids: string[]): Promise<void> => {
    const panel = fixture.debugElement.query(By.directive(UploadPanelComponent));
    for (const id of ids) {
      (panel.componentInstance as UploadPanelComponent).uploaded.emit({
        height: 800,
        publicId: id,
        width: 1200,
      });
    }
    await fixture.whenStable();
  };

  beforeEach(async () => {
    create = vi.fn().mockResolvedValue('new-1');
    translate = vi.fn();
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

  it('should publish the alt text written for a photo in the viewer', async () => {
    await upload('a');
    await type('input[name$=".caption.en"]', 'Cyclist');
    await type('.photo-stage__alt', 'A cyclist at dusk');

    button('Publish').click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());

    expect(create.mock.calls[0][0].photos[0].alt).toBe('A cyclist at dusk');
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

    button('Translate from EN').click();
    await vi.waitFor(() => expect(root().textContent).toContain('Translated.'));

    expect(translate).toHaveBeenCalledWith('en', ['Cyclist', 'Set text']);
    (Array.from(root().querySelectorAll('.lang-tabs__button'))[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect((root().querySelector('input[name$=".caption.pt"]') as HTMLInputElement).value).toBe(
      'Ciclista PT'
    );
    expect(
      (root().querySelector('textarea[name$=".description.pt"]') as HTMLTextAreaElement).value
    ).toBe('Texto PT');
  });

  it('should not offer to translate without a caption in the active language', () => {
    expect(button('Translate from EN').disabled).toBe(true);
  });

  it('should say why a translation failed and leave the texts alone', async () => {
    translate.mockRejectedValue(new TranslationError('limit'));
    await type('input[name$=".caption.en"]', 'Cyclist');

    button('Translate from EN').click();
    await vi.waitFor(() => expect(root().textContent).toContain('limit was reached'));

    expect(button('Translate from EN').disabled).toBe(false);
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
