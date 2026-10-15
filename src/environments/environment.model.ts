export interface CloudinaryEnvironment {
  /** Public cloud name. Empty means "not configured": photos are served from `/local-photos/`. */
  cloudName: string;
  /** Folder (with trailing slash) that precedes every photo id, for example `framed-by-santi/test/`. */
  publicIdPrefix: string;
}

export interface Environment {
  cloudinary: CloudinaryEnvironment;
  env: 'development' | 'production';
  production: boolean;
}
