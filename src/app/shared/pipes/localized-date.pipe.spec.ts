import { LocalizedDatePipe } from './localized-date.pipe';

describe('LocalizedDatePipe', () => {
  const pipe = new LocalizedDatePipe();

  it('should format a short date in each site language', () => {
    expect(pipe.transform('2026-10-02', 'en')).toBe('Oct 2, 2026');
    expect(pipe.transform('2026-10-02', 'es')).toBe('2 oct 2026');
    expect(pipe.transform('2026-10-02', 'pt')).toBe('2/10/2026');
  });

  it('should format a long date in each site language', () => {
    expect(pipe.transform('2026-10-02', 'en', 'long')).toBe('October 2, 2026');
    expect(pipe.transform('2026-10-02', 'es', 'long')).toBe('2 de octubre de 2026');
    expect(pipe.transform('2026-10-02', 'pt', 'long')).toBe('2 de outubro de 2026');
  });

  it('should keep the calendar day regardless of the visitor time zone', () => {
    // A plain `new Date('2026-09-01')` is UTC midnight and would render as Aug 31 west of UTC
    expect(pipe.transform('2026-09-01', 'en')).toBe('Sep 1, 2026');
  });

  it('should return an empty string for an empty date', () => {
    expect(pipe.transform('', 'en')).toBe('');
  });
});
