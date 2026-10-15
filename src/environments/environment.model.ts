export interface CloudinaryEnvironment {
  /** Public cloud name. Empty means "not configured": photos are served from `/local-photos/`. */
  cloudName: string;
  /** Folder (with trailing slash) that precedes every photo id, for example `framed-by-santi/test/`. */
  publicIdPrefix: string;
}

/** Public Firebase web config. Empty values mean "not configured": the app runs on local data. */
export interface FirebaseEnvironment {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
}

export interface Environment {
  cloudinary: CloudinaryEnvironment;
  env: 'development' | 'production';
  firebase: FirebaseEnvironment;
  production: boolean;
}
