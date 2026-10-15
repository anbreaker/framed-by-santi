import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostEditorComponent } from '@features/admin/components/post-editor/post-editor.component';
import { PostEntry, PostsAdminService } from '@features/admin/services/posts-admin.service';
import { useNoIndex } from '@features/admin/utils/use-noindex';

type SetState = 'failed' | 'loading' | 'missing' | 'ready';

/** Opens the editor empty for a new set, or loads the set of the route's id to change it. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostEditorComponent, RouterLink, TranslocoDirective],
  selector: 'app-admin-set-page',
  styleUrl: './admin-set.page.css',
  templateUrl: './admin-set.page.html',
})
export class AdminSetPageComponent {
  private readonly posts = inject(PostsAdminService);
  private readonly router = inject(Router);

  /** Bound from the route; without it this is a new set. */
  readonly id = input<string | undefined>();

  protected readonly entry = signal<PostEntry | null>(null);
  protected readonly state = signal<SetState>('ready');

  /** One key per set, so opening another set creates a fresh editor instead of reusing the old one. */
  protected readonly editorKeys = computed(() => [this.id() ?? 'new']);

  constructor() {
    useNoIndex();
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  protected async load(id = this.id()): Promise<void> {
    this.entry.set(null);

    if (id === undefined) {
      this.state.set('ready');
      return;
    }

    this.state.set('loading');

    try {
      const entry = await this.posts.get(id);

      this.entry.set(entry);
      this.state.set(entry === null ? 'missing' : 'ready');
    } catch {
      this.state.set('failed');
    }
  }

  protected async onSaved(): Promise<void> {
    await this.router.navigateByUrl('/admin/dashboard');
  }
}
