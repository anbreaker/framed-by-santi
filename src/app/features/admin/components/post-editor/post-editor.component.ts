import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { form, FormField, maxLength, required, submit, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';

import { Photo } from '@features/photo-posts/models/photo.model';
import { POST_TAGS, PostTag } from '@features/photo-posts/models/post-tag.model';
import { makeCover, movePhoto } from '@features/photo-posts/utils/reorder-photos';

import { UploadedPhoto } from '../../services/photo-upload.service';
import { PostsAdminService } from '../../services/posts-admin.service';
import { buildPost, todayIso } from '../../utils/post-draft';
import { UploadPanelComponent } from '../upload-panel/upload-panel.component';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_CAPTION = 150;
export const MAX_DESCRIPTION = 2200;

type SaveStatus = 'idle' | 'saved' | 'saving' | 'failed';

/** Creates a post: upload photos, order them (the first is the cover), write the texts, save as draft or publish. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, TranslocoDirective, UploadPanelComponent],
  selector: 'app-post-editor',
  styleUrl: './post-editor.component.css',
  templateUrl: './post-editor.component.html',
})
export class PostEditorComponent {
  private readonly posts = inject(PostsAdminService);

  /** Emits the id of a post once it is saved. */
  readonly saved = output<string>();

  protected readonly dragFrom = signal<number | null>(null);

  private readonly model = signal({
    caption: '',
    description: '',
    hashtags: '',
    takenAt: todayIso(),
  });

  protected readonly postForm = form(this.model, (path) => {
    required(path.caption);
    maxLength(path.caption, MAX_CAPTION);
    maxLength(path.description, MAX_DESCRIPTION);
    validate(path.takenAt, ({ value }) =>
      ISO_DATE.test(value()) ? undefined : { kind: 'date', message: 'date' }
    );
  });

  protected readonly allTags = POST_TAGS;
  protected readonly maxCaption = MAX_CAPTION;
  protected readonly maxDescription = MAX_DESCRIPTION;

  protected readonly photos = signal<readonly Photo[]>([]);
  protected readonly photosMissing = signal(false);
  protected readonly selectedTags = signal<readonly PostTag[]>([]);
  protected readonly status = signal<SaveStatus>('idle');

  protected readonly canSave = computed(() => this.status() !== 'saving');

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

  protected toggleTag(tag: PostTag, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTags.update((current) =>
      checked ? [...current, tag] : current.filter((item) => item !== tag)
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
