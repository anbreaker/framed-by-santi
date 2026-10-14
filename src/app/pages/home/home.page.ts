import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-home-page',
  styleUrl: './home.page.css',
  templateUrl: './home.page.html',
})
export class HomePageComponent {}
