import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Instagram glyph drawn in the current text color, for links that already name Instagram. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-instagram-icon',
  styleUrl: './instagram-icon.component.css',
  templateUrl: './instagram-icon.component.html',
})
export class InstagramIconComponent {}
