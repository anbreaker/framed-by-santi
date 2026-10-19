import { environment } from '@environments/environment';
import { FirebaseEnvironment } from '@environments/environment.model';

/** True when the public Firebase web config is present; otherwise the app runs on local data. */
export function isFirebaseConfigured(config: FirebaseEnvironment = environment.firebase): boolean {
  return config.apiKey !== '' && config.appId !== '' && config.projectId !== '';
}
