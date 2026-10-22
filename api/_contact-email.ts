/** What a visitor wrote, already checked by `_contact.ts`. */
export interface ContactEmailInput {
  email: string;
  message: string;
  name: string;
}

export interface ContactEmail {
  html: string;
  subject: string;
  text: string;
}

const SITE_URL = 'https://framedbysanti.rootdevs.es';
const ROOTDEVS_URL = 'https://rootdevs.es';
/** PNG at 3x its 80px width: the Gmail app re-encodes WebP with transparency and it comes out pixelated. */
const ROOTDEVS_LOGO = `${SITE_URL}/assets/email/rootdevs-logo.png`;

/** The site palette (src/styles/base/tokens.css); mail apps ignore CSS variables, so the values are written out. */
const COLOR = {
  accent: '#e5b53b',
  bg: '#0e0d0c',
  hairline: '#2c2824',
  muted: '#b0a79c',
  onAccent: '#14110a',
  surface: '#171513',
  surfaceRaised: '#221f1b',
  text: '#f2ede5',
};

/** Mail apps do not load the site fonts, so each family falls back to a close system one. */
const FONT_DISPLAY = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const FONT_BODY =
  "'Hanken Grotesk', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Line breaks and runs of spaces become single spaces, so the subject stays one line. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

const replyLink = (email: string): string =>
  `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Re: tu mensaje en Framed by Santi')}`;

const html = ({ email, message, name }: ContactEmailInput): string => {
  const safeName = escapeHtml(oneLine(name));
  const safeEmail = escapeHtml(email);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Nuevo mensaje de ${safeName}</title>
  <style>
    /* Narrow screens: the credit stacks and centers instead of squeezing the text. */
    @media (max-width: 480px) {
      .credit-cell { display: block !important; padding: 0 !important; text-align: center !important; width: 100% !important; }
      .credit-logo-cell { padding-top: 12px !important; }
      .credit-logo { margin: 0 auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td style="padding:0 0 28px;border-bottom:1px solid ${COLOR.hairline};">
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:26px;color:${COLOR.text};">Framed by Santi</p>
              <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.muted};">
                Nuevo mensaje desde la web
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 0 8px;">
              <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.muted};">Te escribe</p>
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:40px;line-height:1.05;color:${COLOR.text};">${safeName}</p>
              <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:15px;">
                <a href="mailto:${safeEmail}" style="color:${COLOR.accent};text-decoration:none;">${safeEmail}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 0;">
              <div style="background:${COLOR.surface};border-left:3px solid ${COLOR.accent};padding:24px;">
                <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:${COLOR.text};white-space:pre-wrap;">${escapeHtml(message)}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 0 40px;">
              <a href="${escapeHtml(replyLink(email))}" style="display:inline-block;background:${COLOR.accent};color:${COLOR.onAccent};font-family:${FONT_BODY};font-size:15px;font-weight:600;padding:14px 28px;text-decoration:none;">
                Responder a ${safeName}
              </a>
              <p style="margin:16px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${COLOR.muted};">
                O dale a «Responder» en tu correo: la respuesta le llega directamente a ${safeName}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0;border-top:1px solid ${COLOR.hairline};">
              <p style="margin:0;font-family:${FONT_DISPLAY};font-size:20px;font-style:italic;color:${COLOR.accent};">Yo solo aprieto botones.</p>
              <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:12px;color:${COLOR.muted};">
                <a href="${SITE_URL}" style="color:${COLOR.muted};">framedbysanti.rootdevs.es</a> · Nueva York · Fujifilm X100VI
              </p>
              <!-- A table keeps text and logo side by side in every mail app; the padding lowers the logo so its word, not its roots, lines up with the text. -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 0;">
                <tr>
                  <td class="credit-cell" valign="middle" style="font-family:${FONT_BODY};font-size:13px;white-space:nowrap;width:1%;">
                    <a href="${ROOTDEVS_URL}" style="color:${COLOR.muted};text-decoration:none;">Hecho con cariño por un amigo</a>
                  </td>
                  <td class="credit-cell credit-logo-cell" valign="middle" style="padding:8px 0 0 8px;">
                    <a href="${ROOTDEVS_URL}"><img src="${ROOTDEVS_LOGO}" alt="rootdevs" width="80" height="30" class="credit-logo" style="border:0;display:block;height:30px;width:80px;" /></a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const text = ({ email, message, name }: ContactEmailInput): string =>
  [
    'Nuevo mensaje desde framedbysanti.rootdevs.es',
    '',
    `${oneLine(name)} (${email})`,
    '',
    message,
    '',
    '—',
    `Responde a este correo y la respuesta le llega directamente a ${oneLine(name)}.`,
  ].join('\n');

/** The email Santi gets when someone writes from the About page. */
export const buildContactEmail = (input: ContactEmailInput): ContactEmail => ({
  html: html(input),
  subject: `[Framed by Santi] ${oneLine(input.name)}`,
  text: text(input),
});
