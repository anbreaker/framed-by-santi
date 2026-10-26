import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Congratulation } from '@features/congratulations/models/congratulation.model';
import {
  CongratulationsStatus,
  CongratulationsStore,
} from '@features/congratulations/store/congratulations.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminCongratulationsPageComponent } from './admin-congratulations.page';

describe('AdminCongratulationsPageComponent', () => {
  let fixture: ComponentFixture<AdminCongratulationsPageComponent>;
  const load = vi.fn();

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const notice = (): string =>
    root().querySelector('.admin-congratulations__empty')?.textContent?.trim() ?? '';

  const render = async (
    status: CongratulationsStatus,
    messages: readonly Congratulation[] = []
  ): Promise<void> => {
    localStorage.clear();
    // A robots meta left by another spec would hide a page that forgets to add its own.
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
    load.mockReset().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [AdminCongratulationsPageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        {
          provide: CongratulationsStore,
          useValue: { items: signal(messages), load, status: signal(status) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCongratulationsPageComponent);
    await fixture.whenStable();
  };

  it('should be its own page, with the admin navigation, a heading and the saved messages', async () => {
    await render('ready', [
      { createdAt: 1, from: 'Ana', id: 'ana', media: [], message: 'Happy birthday!' },
    ]);

    expect(root().querySelector('main#main-content')).not.toBeNull();
    expect(root().querySelector('app-admin-shell app-admin-nav')).not.toBeNull();
    expect(root().querySelector('h1')?.textContent).toContain('Congratulations');
    expect(root().querySelector('app-congratulations-carousel')?.textContent).toContain('Ana');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should say there are no messages yet instead of an empty carousel', async () => {
    await render('ready');

    expect(root().querySelector('app-congratulations-carousel')).toBeNull();
    expect(notice()).toBe('No congratulations yet.');
  });

  it('should say it is loading while the messages are read', async () => {
    await render('loading');

    expect(notice()).toBe('Loading the messages…');
  });

  it('should say the messages could not be read', async () => {
    await render('failed');

    expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'The messages could not be loaded. Check your connection and reload the page.'
    );
  });

  it('should keep search engines away, like the other admin pages', async () => {
    await render('ready');

    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });
});
