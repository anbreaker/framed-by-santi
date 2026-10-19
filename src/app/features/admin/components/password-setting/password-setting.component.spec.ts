import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthStore, AuthUser } from '@features/auth/store/auth.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PasswordSettingComponent } from './password-setting.component';

describe('PasswordSettingComponent', () => {
  let fixture: ComponentFixture<PasswordSettingComponent>;
  const user = signal<AuthUser | null>({ email: 'santi@example.com', uid: 'uid-1' });
  const sendPasswordReset = vi.fn();

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (): HTMLButtonElement =>
    root().querySelector('.password-setting__send') as HTMLButtonElement;
  const steps = (): string[] =>
    Array.from(root().querySelectorAll('.password-setting__steps li')).map(
      (item) => item.textContent?.trim() ?? ''
    );
  const alert = (): string => root().querySelector('[role="alert"]')?.textContent?.trim() ?? '';

  beforeEach(async () => {
    localStorage.clear();
    user.set({ email: 'santi@example.com', uid: 'uid-1' });
    sendPasswordReset.mockReset().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [PasswordSettingComponent, realTranslations()],
      providers: [{ provide: AuthStore, useValue: { sendPasswordReset, user } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordSettingComponent);
    await fixture.whenStable();
  });

  it('should say the link goes to the email of the account that is signed in', () => {
    expect(root().querySelector('h2')?.textContent).toContain('Password');
    expect(root().textContent).toContain('santi@example.com');
    expect(button().textContent).toContain('Send a link to change the password');
    expect(steps()).toEqual([]);
  });

  it('should send the link to that email only, and then say clearly what to do next', async () => {
    button().click();
    await vi.waitFor(() => expect(steps().length).toBe(3));

    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(sendPasswordReset).toHaveBeenCalledWith('santi@example.com');
    expect(root().querySelector('[role="status"]')?.textContent).toContain(
      'Email sent to santi@example.com'
    );
    expect(steps()[0]).toContain('spam');
    expect(steps()[1]).toContain('send a new one from here');
    expect(steps()[2]).toContain('sign in again');
    expect(button().textContent).toContain('Send the email again');
  });

  it('should not send twice while one email is on its way', async () => {
    sendPasswordReset.mockReturnValue(new Promise(() => undefined));

    button().click();
    await fixture.whenStable();
    button().click();

    expect(button().disabled).toBe(true);
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('should explain when too many emails were asked for in a row', async () => {
    sendPasswordReset.mockRejectedValue({ code: 'auth/too-many-requests' });

    button().click();
    await vi.waitFor(() => expect(alert()).toContain('Wait a few minutes'));

    expect(steps()).toEqual([]);
    expect(button().disabled).toBe(false);
  });

  it('should say when the email could not be sent', async () => {
    sendPasswordReset.mockRejectedValue(new Error('offline'));

    button().click();
    await vi.waitFor(() => expect(alert()).toContain('could not be sent'));
  });

  it('should not offer the link to an account without an email', async () => {
    user.set({ email: null, uid: 'uid-2' });
    await fixture.whenStable();

    expect(button().disabled).toBe(true);
    expect(root().textContent).toContain('has no email');
  });
});
