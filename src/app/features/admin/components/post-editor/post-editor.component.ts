import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
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

import { PostEntry, PostsAdminService } from '../../services/posts-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
import { fillMissingLanguages, toLanguageTexts } from '../../utils/fill-languages';
import { buildPost, LanguageTexts, todayIso } from '../../utils/post-draft';
import { LangTabsComponent } from '../lang-tabs/lang-tabs.component';
import {
  AltChange,
  PhotoMove,
  PhotoStageComponent,
  StagePhoto,
} from '../photo-stage/photo-stage.component';
import { ThemeCreatorComponent } from '../theme-creator/theme-creator.component';
import { ThemeManagerComponent } from '../theme-manager/theme-manager.component';
import {
  FinishedPhoto,
  PreviewReady,
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
    ThemeManagerComponent,
    TranslocoDirective,
    UploadPanelComponent,
  ],
  selector: 'app-post-editor',
  styleUrl: './post-editor.component.css',
  templateUrl: './post-editor.component.html',
  host: {
    '(window:dragover)': 'keepFilesFromOpening($event)',
    '(window:drop)': 'keepFilesFromOpening($event)',
  },
})
export class PostEditorComponent implements OnInit {
  private readonly posts = inject(PostsAdminService);
  private readonly translation = inject(TranslationService);
  protected readonly allThemes = inject(PhotoPostsStore).themes;

  protected readonly lang = inject(LanguageStore).currentLang;

  private readonly uploads = viewChild.required(UploadPanelComponent);

  /** A saved set to change; without it the editor starts empty to create a new one. */
  readonly initial = input<PostEntry | null>(null);

  /** Emits the id of a post once it is saved. */
  readonly saved = output<string>();

  /** The language being written; it is also the source when translating. */
  protected readonly activeLang = signal<SupportedLang>('en');

  private readonly model = signal({
    caption: emptyTexts(),
    description: emptyTexts(),
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
  protected readonly editing = computed(() => this.initial() !== null);
  protected readonly savedAsPublished = computed(() => this.initial()?.hidden === false);

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

  ngOnInit(): void {
    const entry = this.initial();
    if (entry === null) return;

    const { post } = entry;

    this.model.set({
      caption: toLanguageTexts(post.caption),
      description: toLanguageTexts(post.description),
      takenAt: post.takenAt,
    });
    this.photos.set(post.photos.map((photo) => ({ ...photo })));
    this.selectedTags.set([...post.tags]);
  }

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
        previewUrl: previewUrl || undefined,
        state: 'uploading',
        width: 0,
      },
    ]);
  }

  protected onPreviewReady({ localId, previewUrl }: PreviewReady): void {
    const waiting = this.photos().some((photo) => photo.localId === localId);

    if (!waiting) {
      // The photo is already uploaded or was removed: nothing will show this preview, so release it.
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previewUrl);
      return;
    }

    this.photos.update((current) =>
      current.map((photo) => (photo.localId === localId ? { ...photo, previewUrl } : photo))
    );
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

  /**
   * A file dropped outside the viewer would be opened by the browser, which leaves the editor and loses
   * what was written. Dragging a thumbnail carries no files, so reordering is left alone.
   */
  protected keepFilesFromOpening(event: DragEvent): void {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
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

  protected onThemeRemoved(id: string): void {
    this.selectedTags.update((current) => current.filter((item) => item !== id));
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
    const { caption, description } = this.model();

    try {
      const filled = await fillMissingLanguages(
        { caption, description },
        (source, texts) => this.translation.translate(source, texts),
        this.activeLang()
      );

      this.model.update((current) => ({ ...current, ...filled }));

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
        const existing = this.initial()?.post;
        const existingId = existing?.id;
        const id = existingId ?? (await this.posts.create(post, { hidden }));

        if (existingId !== undefined)
          await this.posts.save(
            {
              ...post,
              ...(existing?.createdAt !== undefined && { createdAt: existing.createdAt }),
              id: existingId,
            },
            { hidden }
          );

        this.status.set(translated ? 'saved' : 'partial');
        this.saved.emit(id);
      } catch {
        this.status.set('failed');
      }
    });
  }
}
