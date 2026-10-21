/** The same limits `api/_contact.ts` checks, so the form never sends what the server refuses. */
export const MAX_CONTACT_NAME_LENGTH = 100;
export const MAX_CONTACT_EMAIL_LENGTH = 254;
export const MAX_CONTACT_MESSAGE_LENGTH = 5000;
export const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
