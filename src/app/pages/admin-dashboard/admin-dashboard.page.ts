import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { PostEditorComponent } from '@features/admin/components/post-editor/post-editor.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostEditorComponent],
  selector: 'app-admin-dashboard-page',
  styleUrl: './admin-dashboard.page.css',
  templateUrl: './admin-dashboard.page.html',
})
export class AdminDashboardPageComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly robots = this.meta.addTag({ content: 'noindex, nofollow', name: 'robots' });

  ngOnDestroy(): void {
    if (this.robots) this.meta.removeTagElement(this.robots);
  }
}
