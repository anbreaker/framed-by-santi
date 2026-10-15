import { handleCleanup } from './_cleanup-photos.js';

export default {
  fetch(request: Request): Promise<Response> {
    return handleCleanup(request, {
      apiKey: process.env['CLOUDINARY_API_KEY'],
      apiSecret: process.env['CLOUDINARY_API_SECRET'],
      cloudName: process.env['NG_APP_CLOUDINARY_CLOUD_NAME'],
      firebaseProjectId: process.env['FIREBASE_PROJECT_ID'],
    });
  },
};
