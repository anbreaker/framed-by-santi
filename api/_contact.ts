import type { FetchFn } from './_admin-auth.js';
import { buildContactEmail } from './_contact-email.js';

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10000;
/** A sender on the domain verified in Resend; the visitor's address goes in the reply-to. */
const FROM = 'Framed by Santi <contact@mail.rootdevs.es>';

/** The form in `src/app/features/about` keeps the same limits, so it never sends what is refused here. */
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactEnv {
  resendApiKey: string | undefined;
  /** Santi's address: it lives only here, never in the page. */
  toEmail: string | undefined;
}

interface ContactMessage {
  email: string;
  message: string;
  name: string;
  /** A field people never see: only bots fill it in. */
  website: string;
}

const json = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

const readRequest = async (request: Request): Promise<ContactMessage | null> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  const { email, message, name, website = '' } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    typeof name !== 'string' ||
    typeof website !== 'string'
  ) {
    return null;
  }

  const input = { email: email.trim(), message: message.trim(), name: name.trim(), website };

  const valid =
    input.name !== '' &&
    input.name.length <= MAX_NAME_LENGTH &&
    input.email.length <= MAX_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(input.email) &&
    input.message !== '' &&
    input.message.length <= MAX_MESSAGE_LENGTH;

  return valid ? input : null;
};

export const handleContact = async (
  request: Request,
  env: ContactEnv,
  fetchFn: FetchFn = fetch
): Promise<Response> => {
  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const { resendApiKey, toEmail } = env;

  if (!resendApiKey || !toEmail) {
    return json(500, { error: 'not-configured' });
  }

  const input = await readRequest(request);

  if (!input) {
    return json(400, { error: 'invalid-request' });
  }

  // A bot gets the same answer as a person, so it has no reason to try again another way.
  if (input.website !== '') {
    return json(200, { ok: true });
  }

  const { html, subject, text } = buildContactEmail(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetchFn(RESEND_URL, {
      body: JSON.stringify({
        from: FROM,
        html,
        reply_to: input.email,
        subject,
        text,
        to: [toEmail],
      }),
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    });

    return response.ok ? json(200, { ok: true }) : json(502, { error: 'send-failed' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return json(504, { error: 'timeout' });
    }

    return json(502, { error: 'send-failed' });
  } finally {
    clearTimeout(timeout);
  }
};
