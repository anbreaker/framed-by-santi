import { ContactEnv, handleContact } from './_contact';

const ENV: ContactEnv = { resendApiKey: 're_test', toEmail: 'santi@example.com' };

const VALID = {
  email: 'visitor@example.com',
  message: 'I love the Flatiron photo.',
  name: 'Marta',
  website: '',
};

const request = (body: unknown, method = 'POST'): Request =>
  new Request('https://example.test/api/contact', {
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    method,
  });

interface ResendCall {
  body: {
    from: string;
    html: string;
    reply_to: string;
    subject: string;
    text: string;
    to: string[];
  };
  headers: Record<string, string>;
  url: string;
}

/** A fake Resend: records every call and answers with the given response. */
const resend = (answer: () => Response | Promise<Response> = () => Response.json({ id: 'e1' })) => {
  const calls: ResendCall[] = [];
  const fetchFn = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({
      body: JSON.parse(init?.body as string),
      headers: init?.headers as Record<string, string>,
      url,
    });
    return answer();
  });

  return { calls, fetchFn };
};

describe('contact', () => {
  it('should send the message to Santi, with the visitor as the reply address', async () => {
    const { calls, fetchFn } = resend();

    const response = await handleContact(request(VALID), ENV, fetchFn);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].headers['Authorization']).toBe('Bearer re_test');
    expect(calls[0].body.to).toEqual(['santi@example.com']);
    expect(calls[0].body.reply_to).toBe('visitor@example.com');
    expect(calls[0].body.from).toContain('@mail.rootdevs.es');
    expect(calls[0].body.subject).toBe('[Framed by Santi] Marta');
    expect(calls[0].body.html).toContain('I love the Flatiron photo.');
    expect(calls[0].body.text).toContain('I love the Flatiron photo.');
  });

  it('should escape what the visitor wrote before putting it in the email', async () => {
    const { calls, fetchFn } = resend();

    await handleContact(
      request({ ...VALID, message: '<script>alert("x")</script>', name: "<b>O'Hara</b>" }),
      ENV,
      fetchFn
    );

    expect(calls[0].body.html).not.toContain('<script>');
    expect(calls[0].body.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(calls[0].body.html).toContain('&lt;b&gt;O&#39;Hara&lt;/b&gt;');
  });

  it('should keep the subject on one short line whatever the name holds', async () => {
    const { calls, fetchFn } = resend();

    await handleContact(
      request({ ...VALID, name: '  Marta\r\nBcc: someone   Pérez ' }),
      ENV,
      fetchFn
    );

    expect(calls[0].body.subject).toBe('[Framed by Santi] Marta Bcc: someone Pérez');
  });

  it('should pretend to accept a message from a bot that filled the hidden field, and send nothing', async () => {
    const { fetchFn } = resend();

    const response = await handleContact(
      request({ ...VALID, website: 'https://spam.example' }),
      ENV,
      fetchFn
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ['a body that is not JSON', 'not json'],
    ['no name', { ...VALID, name: '   ' }],
    ['a name that is too long', { ...VALID, name: 'a'.repeat(101) }],
    ['an invalid email', { ...VALID, email: 'visitor@example' }],
    ['an email that is too long', { ...VALID, email: `${'a'.repeat(250)}@example.com` }],
    ['no message', { ...VALID, message: '' }],
    ['a message that is too long', { ...VALID, message: 'a'.repeat(5001) }],
    ['a field that is not text', { ...VALID, message: 42 }],
  ])('should refuse %s without sending anything', async (_case, body) => {
    const { fetchFn } = resend();

    const response = await handleContact(request(body), ENV, fetchFn);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid-request' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should only accept POST', async () => {
    const { fetchFn } = resend();

    const response = await handleContact(request(null, 'GET'), ENV, fetchFn);

    expect(response.status).toBe(405);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should say it is not configured when the key or the address is missing', async () => {
    const { fetchFn } = resend();

    const noKey = await handleContact(request(VALID), { ...ENV, resendApiKey: undefined }, fetchFn);
    const noAddress = await handleContact(request(VALID), { ...ENV, toEmail: '' }, fetchFn);

    expect(noKey.status).toBe(500);
    expect(await noKey.json()).toEqual({ error: 'not-configured' });
    expect(noAddress.status).toBe(500);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should report a failure when Resend refuses the email', async () => {
    const { fetchFn } = resend(() => new Response('{}', { status: 422 }));

    const response = await handleContact(request(VALID), ENV, fetchFn);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'send-failed' });
  });

  it('should report a timeout when Resend takes too long', async () => {
    const { fetchFn } = resend(() => {
      throw new DOMException('aborted', 'AbortError');
    });

    const response = await handleContact(request(VALID), ENV, fetchFn);

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'timeout' });
  });
});
