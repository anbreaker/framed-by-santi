import { LocalizedPercentPipe } from './localized-percent.pipe';

describe('LocalizedPercentPipe', () => {
  const pipe = new LocalizedPercentPipe();
  const plain = (value: string): string => value.replace(/ /g, ' ');

  it('should format a ratio as a percentage in each site language', () => {
    expect(plain(pipe.transform(2.5, 'en'))).toBe('250%');
    expect(plain(pipe.transform(2.5, 'es'))).toBe('250 %');
    expect(plain(pipe.transform(2.5, 'pt'))).toBe('250%');
  });

  it('should round to whole percentages', () => {
    expect(plain(pipe.transform(1.4999, 'en'))).toBe('150%');
  });
});
