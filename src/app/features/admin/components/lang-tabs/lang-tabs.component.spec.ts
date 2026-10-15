import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { LangTabsComponent } from './lang-tabs.component';

describe('LangTabsComponent', () => {
  let fixture: ComponentFixture<LangTabsComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttons = (): HTMLButtonElement[] => Array.from(root().querySelectorAll('button'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LangTabsComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(LangTabsComponent);
    fixture.componentRef.setInput('active', 'en');
    fixture.componentRef.setInput('missing', ['pt']);
    await fixture.whenStable();
  });

  it('should offer one button per site language and mark the active one', () => {
    expect(buttons().map((button) => button.textContent?.trim().slice(0, 2))).toEqual([
      'EN',
      'ES',
      'PT',
    ]);
    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('should change the active language when a button is pressed', async () => {
    buttons()[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.active()).toBe('es');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('should flag the languages that still miss text, in words for screen readers too', () => {
    expect(buttons()[0].querySelector('.lang-tabs__missing')).toBeNull();
    expect(buttons()[2].querySelector('.lang-tabs__missing')).not.toBeNull();
    expect(buttons()[2].textContent).toContain('text missing');
  });
});
