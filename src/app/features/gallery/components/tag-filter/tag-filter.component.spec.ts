import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { DEFAULT_THEMES } from '@features/photo-posts/models/theme.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { TagFilterComponent } from './tag-filter.component';

describe('TagFilterComponent', () => {
  let fixture: ComponentFixture<TagFilterComponent>;

  const links = (): HTMLAnchorElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
  const labels = (): string[] => links().map((link) => link.textContent?.trim() ?? '');
  const render = async (selected: string | null): Promise<void> => {
    fixture.componentRef.setInput('selected', selected);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [TagFilterComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TagFilterComponent);
    fixture.componentRef.setInput(
      'themes',
      DEFAULT_THEMES.filter((theme) => ['bw', 'night'].includes(theme.id))
    );
  });

  it('should offer "All" plus one chip per tag with translated names', async () => {
    await render(null);

    expect(labels()).toEqual(['All', 'Black & white', 'Night']);
  });

  it('should translate the chips when the language changes', async () => {
    await render(null);

    TestBed.inject(LanguageStore).setLang('pt');
    await fixture.whenStable();

    expect(labels()).toEqual(['Todas', 'Preto e branco', 'Noite']);
  });

  it('should link each chip to its tag and "All" to no tag', async () => {
    await render(null);

    const hrefs = links().map((link) => link.getAttribute('href'));

    expect(hrefs[0]).not.toContain('tag=');
    expect(hrefs[1]).toContain('tag=bw');
    expect(hrefs[2]).toContain('tag=night');
  });

  it('should flag only the selected chip as current', async () => {
    await render('night');

    expect(links().map((link) => link.getAttribute('aria-current'))).toEqual([null, null, 'true']);
  });

  it('should flag "All" as current when nothing is selected', async () => {
    await render(null);

    expect(links().map((link) => link.getAttribute('aria-current'))).toEqual(['true', null, null]);
  });
});
