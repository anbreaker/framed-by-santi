import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { localize } from '@features/photo-posts/models/localized-text.model';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

import { PhotoCleanupService } from '../../services/photo-cleanup.service';
import { PostEntry, PostsAdminService } from '../../services/posts-admin.service';
import { TranslationService } from '../../services/translation.service';
import { fillMissingLanguages, toLanguageTexts } from '../../utils/fill-languages';

type StatusFilter = 'all' | 'drafts' | 'published';

/** Every set with its status, a switch to publish or hide it, and a way into its editor. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedTextPipe, PostPhotoComponent, RouterLink, TranslocoDirective],
  selector: 'app-set-library',
  styleUrl: './set-library.component.css',
  templateUrl: './set-library.component.html',
})
export class SetLibraryComponent {
  private readonly posts = inject(PostsAdminService);
  private readonly store = inject(PhotoPostsStore);
  private readonly translation = inject(TranslationService);
  protected readonly lang = inject(LanguageStore).currentLang;

  private readonly cleanup = inject(PhotoCleanupService);
  private readonly datePipe = new LocalizedDatePipe();
  /** Id of the set that is waiting for the deletion to be confirmed, if any. */
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly entries = signal<readonly PostEntry[] | null>(null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly filter = signal<StatusFilter>('all');
  protected readonly filters: readonly StatusFilter[] = ['all', 'published', 'drafts'];
  protected readonly loadFailed = signal(false);

  protected readonly counts = computed<Record<StatusFilter, number>>(() => {
    const entries = this.entries() ?? [];

    return {
      all: entries.length,
      drafts: entries.filter((entry) => entry.hidden).length,
      published: entries.filter((entry) => !entry.hidden).length,
    };
  });

  protected readonly shown = computed(() => {
    const filter = this.filter();

    return (this.entries() ?? []).filter(
      (entry) => filter === 'all' || (filter === 'drafts') === entry.hidden
    );
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loadFailed.set(false);
    this.entries.set(null);

    try {
      this.entries.set(await this.posts.list());
      // Opening the library is the moment to clear photos no set uses; it runs quietly and at most daily.
      void this.cleanup.runIfDue();
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** Date and themes of a set, in the language of the site. */
  protected meta(post: PhotoPost): string {
    const lang = this.lang();
    const names = post.tags.flatMap((tag) => {
      const theme = this.store.themes().find((item) => item.id === tag);
      return theme === undefined ? [] : [localize(theme.label, lang)];
    });

    return [this.datePipe.transform(post.takenAt, lang), names.join(', ')]
      .filter((part) => part !== '')
      .join(' · ');
  }

  /**
   * Flips the switch at once and puts it back if saving fails, so it never lies about the real state.
   * The checkbox itself is reset too: when the revert lands before the next render, Angular sees no change.
   * Publishing also translates the languages left blank, like the editor does; if that fails the set is
   * published anyway and the author is told, since the site falls back to the language that is written.
   */
  protected async setPublished(postId: string, input: HTMLInputElement): Promise<void> {
    const published = input.checked;

    this.errorKey.set(null);
    this.setHidden(postId, !published);

    try {
      if (published) {
        await this.publish(postId);
      } else {
        await this.posts.setHidden(postId, true);
      }
      // Keeps the public site in step with the switch, without a reload.
      void this.store.refresh();
    } catch {
      this.setHidden(postId, published);
      input.checked = !published;
      this.errorKey.set('admin.library.toggleFailed');
    }
  }

  /** Publishes a set, saving it together with its missing translations when there are any. */
  private async publish(postId: string): Promise<void> {
    const post = this.entries()?.find((entry) => entry.post.id === postId)?.post;
    if (post === undefined) return this.posts.setHidden(postId, false);

    const texts = {
      caption: toLanguageTexts(post.caption),
      description: toLanguageTexts(post.description),
    };
    let filled = texts;

    try {
      filled = await fillMissingLanguages(texts, (source, items) =>
        this.translation.translate(source, items)
      );
    } catch {
      this.errorKey.set('admin.editor.status.partial');
    }

    if (filled === texts) return this.posts.setHidden(postId, false);

    const translated = {
      ...post,
      caption: filled.caption,
      ...(Object.values(filled.description).some((text) => text !== '') && {
        description: filled.description,
      }),
    };

    await this.posts.save(translated, { hidden: false });
    this.entries.update((entries) =>
      (entries ?? []).map((entry) =>
        entry.post.id === postId ? { ...entry, post: translated } : entry
      )
    );
  }

  protected askToDelete(postId: string): void {
    this.errorKey.set(null);
    this.confirmingId.set(postId);
  }

  protected cancelDelete(): void {
    this.confirmingId.set(null);
  }

  /** Deletes the set from Firestore for good; its photos are cleared from Cloudinary later by the clean-up. */
  protected async confirmDelete(postId: string): Promise<void> {
    this.errorKey.set(null);

    try {
      await this.posts.remove(postId);
      this.entries.update((entries) => (entries ?? []).filter((entry) => entry.post.id !== postId));
      this.confirmingId.set(null);
      void this.store.refresh();
    } catch {
      this.confirmingId.set(null);
      this.errorKey.set('admin.library.deleteFailed');
    }
  }

  private setHidden(postId: string, hidden: boolean): void {
    this.entries.update((entries) =>
      (entries ?? []).map((entry) => (entry.post.id === postId ? { ...entry, hidden } : entry))
    );
  }
}
