import { handleContact } from './_contact.js';

export default {
  fetch(request: Request): Promise<Response> {
    return handleContact(request, {
      resendApiKey: process.env['RESEND_API_KEY'],
      toEmail: process.env['CONTACT_TO_EMAIL'],
    });
  },
};
