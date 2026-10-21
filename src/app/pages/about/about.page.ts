import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AboutDetailsComponent } from '@features/about/components/about-details/about-details.component';
import { AboutProfileComponent } from '@features/about/components/about-profile/about-profile.component';
import { ContactFormComponent } from '@features/about/components/contact-form/contact-form.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutDetailsComponent, AboutProfileComponent, ContactFormComponent],
  selector: 'app-about-page',
  styleUrl: './about.page.css',
  templateUrl: './about.page.html',
})
export class AboutPageComponent {}
