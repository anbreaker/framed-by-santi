import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthStatus, AuthStore } from '@features/auth/store/auth.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { LoginFormComponent } from './login-form.component';

interface FakeAuth {
  isAdmin: WritableSignal<boolean>;
  sendPasswordReset: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  status: WritableSignal<AuthStatus>;
  whenReady: ReturnType<typeof vi.fn>;
}

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let auth: FakeAuth;
  let navigate: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (name: string): HTMLInputElement =>
    root().querySelector(`input[name="${name}"]`) as HTMLInputElement;
  const notice = (): HTMLElement | null => root().querySelector('.login-form__notice');

  const type = (name: string, value: string): void => {
    field(name).value = value;
    field(name).dispatchEvent(new Event('input'));
  };

  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const create = async (): Promise<void> => {
    fixture = TestBed.createComponent(LoginFormComponent);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    auth = {
      isAdmin: signal(false),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      status: signal<AuthStatus>('signed-out'),
      whenReady: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent, realTranslations()],
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('should render email and password fields with the right autocomplete hints', async () => {
    await create();

    expect(field('email').type).toBe('email');
    expect(field('email').autocomplete).toBe('username');
    expect(field('password').type).toBe('password');
    expect(field('password').autocomplete).toBe('current-password');
  });

  it('should ask for both fields before calling Firebase', async () => {
    await create();
    type('email', 'a@b.c');

    await submit();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(notice()?.textContent).toContain('Enter your email and password.');
  });

  it('should sign in and open the dashboard when the account is an admin', async () => {
    auth.signIn.mockImplementation(async () => auth.isAdmin.set(true));
    await create();
    type('email', ' santi@example.test ');
    type('password', 'secret');

    await submit();

    expect(auth.signIn).toHaveBeenCalledWith('santi@example.test', 'secret');
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('should answer a non-admin account like a wrong password and sign it out', async () => {
    await create();
    type('email', 'visitor@example.test');
    type('password', 'secret');

    await submit();

    expect(auth.signOut).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(notice()?.textContent).toContain('We could not sign you in');
  });

  it('should show the same generic message when Firebase rejects the sign-in', async () => {
    auth.signIn.mockRejectedValue(new Error('auth/invalid-credential'));
    await create();
    type('email', 'a@b.c');
    type('password', 'wrong');

    await submit();

    expect(notice()?.textContent).toContain('We could not sign you in');
    expect(notice()?.textContent).not.toContain('invalid-credential');
    expect(notice()?.getAttribute('role')).toBe('alert');
  });

  it('should ask for the email before sending a password reset', async () => {
    await create();

    (root().querySelector('.login-form__link') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(auth.sendPasswordReset).not.toHaveBeenCalled();
    expect(notice()?.textContent).toContain('Type your email first.');
  });

  it('should send the reset and answer the same whether or not the address exists', async () => {
    auth.sendPasswordReset.mockRejectedValue(new Error('auth/user-not-found'));
    await create();
    type('email', 'nobody@example.test');

    (root().querySelector('.login-form__link') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(auth.sendPasswordReset).toHaveBeenCalledWith('nobody@example.test');
    expect(notice()?.textContent).toContain('If that address can sign in');
    expect(notice()?.getAttribute('role')).toBe('status');
  });

  it('should skip the form for an admin who is already signed in', async () => {
    auth.isAdmin.set(true);

    await create();

    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('should explain that sign-in is unavailable when Firebase is not configured', async () => {
    auth.status.set('unavailable');

    await create();

    expect(root().querySelector('form')).toBeNull();
    expect(root().textContent).toContain('Sign-in is not available right now.');
  });
});
