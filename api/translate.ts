import { handleTranslate } from './_translate';

export default {
  fetch(request: Request): Promise<Response> {
    return handleTranslate(request, {
      deeplApiKey: process.env['DEEPL_API_KEY'],
      firebaseProjectId: process.env['FIREBASE_PROJECT_ID'],
    });
  },
};
