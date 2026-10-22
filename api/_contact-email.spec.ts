import { buildContactEmail } from './_contact-email';

const MESSAGE = {
  email: 'marta@example.com',
  message: 'I love the Flatiron photo.\nIs there a print?',
  name: 'Marta',
};

describe('contact email', () => {
  it('should put the name in a one-line subject', () => {
    expect(buildContactEmail(MESSAGE).subject).toBe('[Framed by Santi] Marta');
    expect(buildContactEmail({ ...MESSAGE, name: ' Marta\r\nBcc: x   Pérez ' }).subject).toBe(
      '[Framed by Santi] Marta Bcc: x Pérez'
    );
  });

  it('should show who wrote, the message and a button to reply, in the site look', () => {
    const { html } = buildContactEmail(MESSAGE);

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('Framed by Santi');
    expect(html).toContain('#e5b53b');
    expect(html).toContain('Marta');
    expect(html).toContain('marta@example.com');
    expect(html).toContain('I love the Flatiron photo.\nIs there a print?');
    expect(html).toContain('href="mailto:marta%40example.com?subject=');
    expect(html).toContain('Responder a Marta');
    expect(html).toContain('Yo solo aprieto botones.');
  });

  it('should sign off with the same credit as the site footer', () => {
    const { html } = buildContactEmail(MESSAGE);

    expect(html).toContain('Hecho con cariño por un amigo');
    expect(html).toContain('href="https://rootdevs.es"');
    expect(html).toContain(
      'src="https://framedbysanti.rootdevs.es/assets/email/rootdevs-logo.png" alt="rootdevs"'
    );
  });

  it('should escape everything the visitor wrote', () => {
    const { html } = buildContactEmail({
      email: 'a"b@example.com',
      message: '<script>alert("x")</script>',
      name: "<b>O'Hara</b>",
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;O&#39;Hara&lt;/b&gt;');
    expect(html).toContain('a&quot;b@example.com');
  });

  it('should come with a plain text version for mail apps that do not show HTML', () => {
    const { text } = buildContactEmail(MESSAGE);

    expect(text).toContain('Marta (marta@example.com)');
    expect(text).toContain('I love the Flatiron photo.\nIs there a print?');
    expect(text).toContain('Responde a este correo');
    expect(text).not.toContain('<');
  });
});
