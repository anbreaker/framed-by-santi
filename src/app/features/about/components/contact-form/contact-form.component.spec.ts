import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageStore } from '@core/store/language.store';
import { ContactService } from '@features/about/services/contact.service';
import { realTranslations } from '@shared/testing/transloco-testing';

import { ContactFormComponent } from './contact-form.component';

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let send: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (id: string): HTMLInputElement =>
    root().querySelector(`#${id}`) as HTMLInputElement;
  const errors = (): string[] =>
    [...root().querySelectorAll('.contact-form__error')].map(
      (node) => node.textContent?.trim() ?? ''
    );
  const statusText = (): string =>
    root().querySelector('[role="status"]')?.textContent?.trim() ?? '';

  const type = (id: string, value: string): void => {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const fillIn = async (): Promise<void> => {
    type('contact-name', '  Marta  ');
    type('contact-email', ' marta@example.com ');
    type('contact-message', ' I love the Flatiron photo. ');
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true })
    );
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    send = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, realTranslations()],
      providers: [{ provide: ContactService, useValue: { send } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    await fixture.whenStable();
  });

  it('should invite visitors to write to Santi, without showing his address', () => {
    expect(root().querySelector('h2')?.textContent?.trim()).toBe('Write to me');
    expect(root().querySelector('a[href^="mailto:"]')).toBeNull();
    expect(root().textContent).not.toContain('@');
  });

  it('should send the trimmed message and then say it is on its way', async () => {
    await fillIn();
    await submit();

    expect(send).toHaveBeenCalledWith({
      email: 'marta@example.com',
      message: 'I love the Flatiron photo.',
      name: 'Marta',
      website: '',
    });
    expect(statusText()).toBe(
      "Got it! I'll reply as soon as I put the camera down (so, soon… I think XD)."
    );
    expect(field('contact-name').value).toBe('');
    expect(field('contact-message').value).toBe('');
  });

  it('should point at every field that is missing or wrong, and send nothing', async () => {
    type('contact-email', 'marta@example');
    type('contact-message', 'a'.repeat(5001));
    await submit();

    expect(send).not.toHaveBeenCalled();
    expect(errors()).toEqual([
      'And you are…? Add your name (up to 100 characters).',
      "I can't reply to that email. Mind checking it?",
      'Write me something, even just a hello (up to 5000 characters).',
    ]);
    expect(field('contact-name').getAttribute('aria-invalid')).toBe('true');
  });

  it('should keep what was written and say so when the message could not be sent', async () => {
    send.mockResolvedValue(false);

    await fillIn();
    await submit();

    expect(statusText()).toBe(
      "Well, that didn't send. Not even pressing buttons fixes this one. Try again in a moment."
    );
    expect(field('contact-name').value).toBe('  Marta  ');
  });

  it('should hand over the hidden field, so the server can drop messages from bots', async () => {
    const trap = root().querySelector('input[name="website"]') as HTMLInputElement;

    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();

    await fillIn();
    trap.value = 'https://spam.example';
    trap.dispatchEvent(new Event('input'));
    await submit();

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://spam.example' }));
  });

  it('should speak the language of the site', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(root().querySelector('h2')?.textContent?.trim()).toBe('Escríbeme');
    expect(root().querySelector('button')?.textContent?.trim()).toBe('Enviar mensaje');
  });
});
