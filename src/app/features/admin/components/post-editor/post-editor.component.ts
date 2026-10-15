import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, maxLength, submit, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';

import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';
import { LanguageStore } from '@core/store/language.store';
import { Photo } from '@features/photo-posts/models/photo.model';
import { Theme } from '@features/photo-posts/models/theme.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { makeCover, movePhoto } from '@features/photo-posts/utils/reorder-photos';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

import { PostsAdminService } from '../../services/posts-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
import { buildPost, LanguageTexts, todayIso } from '../../utils/post-draft';
import { LangTabsComponent } from '../lang-tabs/lang-tabs.component';
import {
  AltChange,
  PhotoMove,
  PhotoStageComponent,
  StagePhoto,
} from '../photo-stage/photo-stage.component';
import { ThemeCreatorComponent } from '../theme-creator/theme-creator.component';
import {
  FinishedPhoto,
  QueuedPhoto,
  UploadPanelComponent,
} from '../upload-panel/upload-panel.component';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_CAPTION = 150;
export const MAX_DESCRIPTION = 2200;

type PhotosProblem = 'missing' | 'pending';
type SaveStatus = 'idle' | 'partial' | 'saved' | 'saving' | 'failed';
type TranslateStatus = 'done' | 'idle' | 'working';

const TRANSLATE_ERRORS: Record<TranslationError['reason'], string> = {
  failed: 'admin.editor.translate.errors.failed',
  limit: 'admin.editor.translate.errors.limit',
  'not-allowed': 'admin.editor.translate.errors.notAllowed',
};

const emptyTexts = (): LanguageTexts => ({ en: '', es: '', pt: '' });

/** Creates a post: upload photos, order them (the first is the cover), write the texts, save as draft or publish. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    LangTabsComponent,
    LocalizedTextPipe,
    PhotoStageComponent,
    ThemeCreatorComponent,
    TranslocoDirective,
    UploadPanelComponent,
  ],
  selector: 'app-post-editor',
  styleUrl: './post-editor.component.css',
  templateUrl: './post-editor.component.html',
})
export class PostEditorComponent {
  private readonly posts = inject(PostsAdminService);
  private readonly translation = inject(TranslationService);
  protected readonly allThemes = inject(PhotoPostsStore).themes;

  protected readonly lang = inject(LanguageStore).currentLang;

  private readonly uploads = viewChild.required(UploadPanelComponent);

  /** Emits the id of a post once it is saved. */
  readonly saved = output<string>();

  /** The language being written; it is also the source when translating. */
  protected readonly activeLang = signal<SupportedLang>('en');

  private readonly model = signal({
    caption: emptyTexts(),
    description: emptyTexts(),
    hashtags: '',
    takenAt: todayIso(),
  });
  protected readonly postForm = form(this.model, (path) => {
    SUPPORTED_LANGS.forEach((lang) => {
      maxLength(path.caption[lang], MAX_CAPTION);
      maxLength(path.description[lang], MAX_DESCRIPTION);
    });
    validate(path.caption, ({ value }) =>
      Object.values(value()).some((text) => text.trim() !== '')
        ? undefined
        : { kind: 'required', message: 'required' }
    );
    validate(path.takenAt, ({ value }) =>
      ISO_DATE.test(value()) ? undefined : { kind: 'date', message: 'date' }
    );
  });
  protected readonly langs = SUPPORTED_LANGS;
  protected readonly maxCaption = MAX_CAPTION;
  protected readonly maxDescription = MAX_DESCRIPTION;

  protected readonly photos = signal<readonly StagePhoto[]>([]);
  protected readonly photosProblem = signal<PhotosProblem | null>(null);
  protected readonly selectedTags = signal<readonly string[]>([]);
  protected readonly status = signal<SaveStatus>('idle');
  protected readonly translateErrorKey = signal<string | null>(null);
  protected readonly translateStatus = signal<TranslateStatus>('idle');

  protected readonly canSave = computed(() => this.status() !== 'saving');

  /** Languages that still miss text: no caption, or no description while another language has one. */
  protected readonly missingLangs = computed<readonly SupportedLang[]>(() => {
    const { caption, description } = this.model();
    const someDescription = Object.values(description).some((text) => text.trim() !== '');

    return SUPPORTED_LANGS.filter(
      (lang) => caption[lang].trim() === '' || (someDescription && description[lang].trim() === '')
    );
  });

  protected readonly canTranslate = computed(
    () =>
      this.translateStatus() !== 'working' && this.model().caption[this.activeLang()].trim() !== ''
  );

  /** A chosen file shows up at once from the local file; the upload finishes it later. */
  protected onQueued({ localId, previewUrl }: QueuedPhoto): void {
    this.photosProblem.set(null);
    this.photos.update((current) => [
      ...current,
      {
        alt: '',
        height: 0,
        id: `local-${localId}`,
        localId,
        previewUrl,
        state: 'uploading',
        width: 0,
      },
    ]);
  }

  protected onFinished({ localId, result }: FinishedPhoto): void {
    this.photos.update((current) =>
      current.map((photo) => {
        if (photo.localId !== localId) return photo;
        if (result === null) return { ...photo, state: 'failed' };

        if (photo.previewUrl && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(photo.previewUrl);
        }

        return {
          alt: photo.alt,
          height: result.height,
          id: result.publicId,
          publicId: result.publicId,
          width: result.width,
        };
      })
    );
  }

  protected onMoved({ from, to }: PhotoMove): void {
    this.photos.update((current) => movePhoto(current, from, to));
  }

  protected onCoverChosen(index: number): void {
    this.photos.update((current) => makeCover(current, index));
  }

  protected onRemoved(index: number): void {
    this.photos.update((current) => current.filter((_, position) => position !== index));
  }

  protected onAltChanged({ alt, index }: AltChange): void {
    this.photos.update((current) =>
      current.map((photo, position) => (position === index ? { ...photo, alt } : photo))
    );
  }

  protected openPicker(): void {
    this.uploads().openPicker();
  }

  /** Translates the caption and description written in the active language into the other two. */
  protected async translate(): Promise<void> {
    if (!this.canTranslate()) return;

    const source = this.activeLang();
    const { caption, description } = this.model();

    this.translateStatus.set('working');
    this.translateErrorKey.set(null);

    try {
      // The language is detected, so text typed in the wrong tab still comes out right in all three.
      const result = await this.translation.translate('auto', [
        caption[source],
        description[source],
      ]);

      this.model.update((current) => {
        const next = { caption: { ...current.caption }, description: { ...current.description } };

        SUPPORTED_LANGS.forEach((lang) => {
          next.caption[lang] = result[lang][0];
          next.description[lang] = result[lang][1];
        });

        return { ...current, ...next };
      });
      this.translateStatus.set('done');
    } catch (error) {
      this.translateStatus.set('idle');
      this.translateErrorKey.set(
        TRANSLATE_ERRORS[error instanceof TranslationError ? error.reason : 'failed']
      );
    }
  }

  protected selectNewTheme(theme: Theme): void {
    this.selectedTags.update((current) =>
      current.includes(theme.id) ? current : [...current, theme.id]
    );
  }

  protected toggleTheme(id: string): void {
    this.selectedTags.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  /**
   * Translates what the author left empty, so a published set has its texts in every language. It fills
   * only blank languages and never replaces what was written; returns false when the translation failed.
   */
  private async fillMissingLanguages(): Promise<boolean> {
    const model = this.model();
    const items = (['caption', 'description'] as const).flatMap((field) => {
      const texts = model[field];
      const written = [this.activeLang(), ...SUPPORTED_LANGS]
        .map((lang) => texts[lang])
        .find((text) => text.trim() !== '');
      const someEmpty = SUPPORTED_LANGS.some((lang) => texts[lang].trim() === '');

      return written !== undefined && someEmpty ? [{ field, text: written }] : [];
    });

    if (items.length === 0) return true;

    try {
      const result = await this.translation.translate(
        'auto',
        items.map((item) => item.text)
      );

      this.model.update((current) => {
        const next = { caption: { ...current.caption }, description: { ...current.description } };

        items.forEach(({ field }, index) => {
          SUPPORTED_LANGS.filter((lang) => next[field][lang].trim() === '').forEach((lang) => {
            next[field][lang] = result[lang][index];
          });
        });

        return { ...current, ...next };
      });

      return true;
    } catch {
      return false;
    }
  }

  /** Saves the post; `hidden` true keeps it as a draft only admins can see, false publishes it. */
  protected async save(hidden: boolean): Promise<void> {
    const photos = this.photos();
    const problem: PhotosProblem | null =
      photos.length === 0 ? 'missing' : photos.some((photo) => photo.state) ? 'pending' : null;

    this.photosProblem.set(problem);
    if (problem !== null) return;

    await submit(this.postForm, async () => {
      this.status.set('saving');

      // Drafts are not translated, to keep the quota for what is actually published.
      const translated = hidden ? true : await this.fillMissingLanguages();
      const value = this.model();
      const post = buildPost({
        ...value,
        photos: photos.map<Photo>(
          ({ localId: _localId, previewUrl: _preview, state: _state, ...photo }) => photo
        ),
        tags: this.selectedTags(),
      });

      try {
        const id = await this.posts.create(post, { hidden });
        this.status.set(translated ? 'saved' : 'partial');
        this.saved.emit(id);
      } catch {
        this.status.set('failed');
      }
    });
  }
}
