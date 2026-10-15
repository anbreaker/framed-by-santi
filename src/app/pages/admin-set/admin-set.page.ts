import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PostEditorComponent } from '@features/admin/components/post-editor/post-editor.component';
import { useNoIndex } from '@features/admin/utils/use-noindex';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostEditorComponent],
  selector: 'app-admin-set-page',
  styleUrl: './admin-set.page.css',
  templateUrl: './admin-set.page.html',
})
export class AdminSetPageComponent {
  constructor() {
    useNoIndex();
  }
}
