import { environment } from '@environments/environment';
import { FirebaseEnvironment } from '@environments/environment.model';

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

/** True when the public Firebase web config is present; otherwise the app runs on local data. */
export function isFirebaseConfigured(config: FirebaseEnvironment = environment.firebase): boolean {
  return config.apiKey !== '' && config.appId !== '' && config.projectId !== '';
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;

  return getApps().length > 0 ? getApp() : initializeApp({ ...environment.firebase });
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app === null ? null : getAuth(app);
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app === null ? null : getFirestore(app);
}
