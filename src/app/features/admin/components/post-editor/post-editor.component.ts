import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { form, FormField, maxLength, submit, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';

import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';
import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';
import { Theme } from '@features/photo-posts/models/theme.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { makeCover, movePhoto } from '@features/photo-posts/utils/reorder-photos';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

import { UploadedPhoto } from '../../services/photo-upload.service';
import { PostsAdminService } from '../../services/posts-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';
import { buildPost, LanguageTexts, todayIso } from '../../utils/post-draft';
import { LangTabsComponent } from '../lang-tabs/lang-tabs.component';
import { ThemeCreatorComponent } from '../theme-creator/theme-creator.component';
import { UploadPanelComponent } from '../upload-panel/upload-panel.component';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_CAPTION = 150;
export const MAX_DESCRIPTION = 2200;

type SaveStatus = 'idle' | 'saved' | 'saving' | 'failed';
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
    PostPhotoComponent,
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

  /** Emits the id of a post once it is saved. */
  readonly saved = output<string>();

  /** The language being written; it is also the source when translating. */
  protected readonly activeLang = signal<SupportedLang>('en');
  protected readonly dragFrom = signal<number | null>(null);

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

  protected readonly photos = signal<readonly Photo[]>([]);
  protected readonly photosMissing = signal(false);
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

  protected addPhoto(uploaded: UploadedPhoto): void {
    this.photosMissing.set(false);
    this.photos.update((current) => [
      ...current,
      {
        alt: '',
        height: uploaded.height,
        id: uploaded.publicId,
        publicId: uploaded.publicId,
        width: uploaded.width,
      },
    ]);
  }

  protected move(from: number, to: number): void {
    this.photos.update((current) => movePhoto(current, from, to));
  }

  protected cover(index: number): void {
    this.photos.update((current) => makeCover(current, index));
  }

  protected remove(index: number): void {
    this.photos.update((current) => current.filter((_, position) => position !== index));
  }

  protected setAlt(index: number, event: Event): void {
    const alt = (event.target as HTMLInputElement).value;
    this.photos.update((current) =>
      current.map((photo, position) => (position === index ? { ...photo, alt } : photo))
    );
  }

  /** Translates the caption and description written in the active language into the other two. */
  protected async translate(): Promise<void> {
    if (!this.canTranslate()) return;

    const source = this.activeLang();
    const { caption, description } = this.model();

    this.translateStatus.set('working');
    this.translateErrorKey.set(null);

    try {
      const result = await this.translation.translate(source, [
        caption[source],
        description[source],
      ]);

      this.model.update((current) => {
        const next = { caption: { ...current.caption }, description: { ...current.description } };

        SUPPORTED_LANGS.filter((lang) => lang !== source).forEach((lang) => {
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

  protected toggleTheme(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTags.update((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    );
  }

  protected onDrop(to: number): void {
    const from = this.dragFrom();
    this.dragFrom.set(null);
    if (from !== null) this.move(from, to);
  }

  /** Saves the post; `hidden` true keeps it as a draft only admins can see, false publishes it. */
  protected async save(hidden: boolean): Promise<void> {
    this.photosMissing.set(this.photos().length === 0);
    if (this.photosMissing()) return;

    await submit(this.postForm, async () => {
      this.status.set('saving');

      const value = this.model();
      const post = buildPost({
        ...value,
        photos: this.photos(),
        tags: this.selectedTags(),
      });

      try {
        const id = await this.posts.create(post, { hidden });
        this.status.set('saved');
        this.saved.emit(id);
      } catch {
        this.status.set('failed');
      }
    });
  }
}
