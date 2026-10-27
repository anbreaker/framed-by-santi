import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import { deferAnalytics } from './app/core/utils/defer-analytics';

import './styles/styles.css';

bootstrapApplication(AppComponent, appConfig)
  .then(deferAnalytics)
  .catch((error) => console.error(error));
