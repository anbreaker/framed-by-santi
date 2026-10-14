import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AboutTeaserComponent } from '@features/landing/components/about-teaser/about-teaser.component';
import { LandingHeroComponent } from '@features/landing/components/landing-hero/landing-hero.component';
import { LatestSetComponent } from '@features/landing/components/latest-set/latest-set.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutTeaserComponent, LandingHeroComponent, LatestSetComponent],
  selector: 'app-home-page',
  styleUrl: './home.page.css',
  templateUrl: './home.page.html',
})
export class HomePageComponent {}
