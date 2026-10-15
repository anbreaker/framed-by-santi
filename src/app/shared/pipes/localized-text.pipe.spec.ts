import { LocalizedTextPipe } from './localized-text.pipe';

describe('LocalizedTextPipe', () => {
  const pipe = new LocalizedTextPipe();

  it('should show the text in the active language', () => {
    expect(pipe.transform({ en: 'Cyclist', es: 'Ciclista', pt: 'Ciclista PT' }, 'es')).toBe(
      'Ciclista'
    );
  });

  it('should show a plain text as is and nothing for a missing one', () => {
    expect(pipe.transform('Cyclist', 'pt')).toBe('Cyclist');
    expect(pipe.transform(undefined, 'pt')).toBe('');
  });
});
