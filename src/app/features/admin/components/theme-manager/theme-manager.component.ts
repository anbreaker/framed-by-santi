import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { DEFAULT_THEMES } from '@features/photo-posts/models/theme.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

import { PostsAdminService } from '../../services/posts-admin.service';
import { ThemesAdminError, ThemesAdminService } from '../../services/themes-admin.service';

/** Lists the themes with how many sets use each one, and deletes the ones created in the dashboard after asking. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedTextPipe, TranslocoDirective],
  selector: 'app-theme-manager',
  styleUrl: './theme-manager.component.css',
  templateUrl: './theme-manager.component.html',
})
export class ThemeManagerComponent {
  private readonly posts = inject(PostsAdminService);
  private readonly store = inject(PhotoPostsStore);
  private readonly themes = inject(ThemesAdminService);

  /** Emits the id of a theme once it is deleted, so the editor can drop it from the set being written. */
  protected readonly lang = inject(LanguageStore).currentLang;

  readonly removed = output<string>();
  protected readonly confirming = signal<string | null>(null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly open = signal(false);
  /** How many sets use each theme; null until counted, or when the sets could not be read. */
  protected readonly usage = signal<ReadonlyMap<string, number> | null>(null);
  protected readonly working = signal(false);

  protected readonly items = computed(() =>
    this.store.themes().map((theme) => ({
      isDefault: DEFAULT_THEMES.some((item) => item.id === theme.id),
      theme,
    }))
  );

  protected toggle(): void {
    this.open.update((isOpen) => !isOpen);
    this.confirming.set(null);
    this.errorKey.set(null);

    if (this.open() && this.usage() === null) void this.countUsage();
  }

  protected ask(id: string): void {
    this.errorKey.set(null);
    this.confirming.set(id);
  }

  protected cancel(): void {
    this.confirming.set(null);
  }

  protected async confirm(id: string): Promise<void> {
    this.working.set(true);
    this.errorKey.set(null);

    try {
      await this.themes.remove(id);
      this.store.removeTheme(id);
      this.removed.emit(id);
      this.confirming.set(null);
    } catch (error) {
      this.errorKey.set(
        error instanceof ThemesAdminError && error.reason === 'protected'
          ? 'admin.editor.themes.errors.protected'
          : 'admin.editor.themes.errors.deleteFailed'
      );
    } finally {
      this.working.set(false);
    }
  }

  private async countUsage(): Promise<void> {
    try {
      const entries = await this.posts.list();
      const counts = new Map<string, number>();

      entries.forEach(({ post }) =>
        new Set(post.tags).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
      );
      this.usage.set(counts);
    } catch {
      // Without the count the themes can still be managed.
    }
  }
}
