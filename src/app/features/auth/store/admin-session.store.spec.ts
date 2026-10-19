import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { setAdminHint } from '../utils/admin-hint';
import { AdminSessionStore } from './admin-session.store';
import { AuthStore } from './auth.store';

describe('AdminSessionStore', () => {
  const isAdmin = signal(false);
  const signOut = vi.fn();
  const createAuth = vi.fn();
  const fakeAuth = { isAdmin, signOut } as unknown as AuthStore;

  beforeEach(() => {
    localStorage.clear();
    isAdmin.set(false);
    signOut.mockReset().mockResolvedValue(undefined);
    createAuth.mockReset().mockReturnValue(fakeAuth);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useFactory: createAuth }],
    });
  });

  it('should not load auth for a visitor, who never signed in on this browser', async () => {
    const session = TestBed.inject(AdminSessionStore);
    await new Promise((resolve) => setTimeout(resolve));

    expect(createAuth).not.toHaveBeenCalled();
    expect(session.isAdmin()).toBe(false);
  });

  it('should load auth by itself when the hint says someone signed in here', async () => {
    setAdminHint(true);
    isAdmin.set(true);

    const session = TestBed.inject(AdminSessionStore);

    await vi.waitFor(() => expect(session.isAdmin()).toBe(true));
    expect(createAuth).toHaveBeenCalledTimes(1);
  });

  it('should follow the admin state of the loaded auth', async () => {
    const session = TestBed.inject(AdminSessionStore);
    await session.load();
    expect(session.isAdmin()).toBe(false);

    isAdmin.set(true);
    expect(session.isAdmin()).toBe(true);
  });

  it('should load auth only once, however many times it is asked', async () => {
    const session = TestBed.inject(AdminSessionStore);

    const [first, second] = await Promise.all([session.load(), session.load()]);

    expect(first).toBe(fakeAuth);
    expect(second).toBe(fakeAuth);
    expect(createAuth).toHaveBeenCalledTimes(1);
  });

  it('should pick up an auth created elsewhere, like the sign in page, without loading it again', () => {
    const session = TestBed.inject(AdminSessionStore);
    isAdmin.set(true);

    session.attach(fakeAuth);

    expect(session.isAdmin()).toBe(true);
    expect(createAuth).not.toHaveBeenCalled();
  });

  it('should try loading auth again after a failed load', async () => {
    const session = TestBed.inject(AdminSessionStore);
    vi.spyOn(TestBed.inject(Injector), 'get').mockImplementationOnce(() => {
      throw new Error('offline');
    });

    await expect(session.load()).rejects.toThrow('offline');
    await expect(session.load()).resolves.toBe(fakeAuth);
  });

  it('should sign out through the loaded auth', async () => {
    const session = TestBed.inject(AdminSessionStore);

    await session.signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
