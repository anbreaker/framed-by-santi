import { FirebaseEnvironment } from '@environments/environment.model';

import { isFirebaseConfigured } from './firebase-client';

const CONFIG: FirebaseEnvironment = {
  apiKey: 'key',
  appId: 'app',
  authDomain: 'example.firebaseapp.com',
  messagingSenderId: '1',
  projectId: 'project',
  storageBucket: 'example.firebasestorage.app',
};

describe('isFirebaseConfigured', () => {
  it('should be true when the key, app id and project id are present', () => {
    expect(isFirebaseConfigured(CONFIG)).toBe(true);
  });

  it.each(['apiKey', 'appId', 'projectId'] as const)('should be false without %s', (field) => {
    expect(isFirebaseConfigured({ ...CONFIG, [field]: '' })).toBe(false);
  });
});
