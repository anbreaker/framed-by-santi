import { TestBed } from '@angular/core/testing';

import { ContactService } from './contact.service';

describe('ContactService', () => {
  const message = { email: 'marta@example.com', message: 'Hi', name: 'Marta', website: '' };
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should post the message to the contact function', async () => {
    fetchSpy.mockResolvedValue(Response.json({ ok: true }));

    const sent = await TestBed.inject(ContactService).send(message);

    expect(sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/contact', {
      body: JSON.stringify(message),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });

  it('should say it was not sent when the function refuses it or cannot be reached', async () => {
    const service = TestBed.inject(ContactService);

    fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    expect(await service.send(message)).toBe(false);

    fetchSpy.mockRejectedValueOnce(new TypeError('offline'));
    expect(await service.send(message)).toBe(false);
  });
});
