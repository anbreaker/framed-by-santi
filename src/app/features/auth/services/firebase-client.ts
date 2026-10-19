import { environment } from '@environments/environment';

import { isFirebaseConfigured } from './firebase-config';

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

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
