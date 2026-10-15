import { Environment } from './environment.model';

export const environment: Environment = {
  cloudinary: {
    cloudName: import.meta.env.NG_APP_CLOUDINARY_CLOUD_NAME ?? '',
    publicIdPrefix: import.meta.env.NG_APP_CLOUDINARY_ID_PREFIX ?? '',
  },
  env: 'development',
  production: false,
};
