import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CONGRATULATIONS } from '@features/congratulations/data/congratulations.data';
import { Congratulation } from '@features/congratulations/models/congratulation.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminCongratulationsPageComponent } from './admin-congratulations.page';

describe('AdminCongratulationsPageComponent', () => {
  let fixture: ComponentFixture<AdminCongratulationsPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (messages: readonly Congratulation[]): Promise<void> => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminCongratulationsPageComponent, realTranslations()],
      providers: [provideRouter([]), { provide: CONGRATULATIONS, useValue: messages }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCongratulationsPageComponent);
    await fixture.whenStable();
  };

  it('should be its own page, with the admin navigation, a heading and the messages', async () => {
    await render([{ from: 'Ana', id: 'ana', message: 'Happy birthday!' }]);

    expect(root().querySelector('main#main-content')).not.toBeNull();
    expect(root().querySelector('app-admin-shell app-admin-nav')).not.toBeNull();
    expect(root().querySelector('h1')?.textContent).toContain('Congratulations');
    expect(root().querySelector('app-congratulations-carousel')?.textContent).toContain('Ana');
  });

  it('should say there are no messages yet instead of an empty carousel', async () => {
    await render([]);

    expect(root().querySelector('app-congratulations-carousel')).toBeNull();
    expect(root().querySelector('.admin-congratulations__empty')?.textContent).toContain(
      'No congratulations yet.'
    );
  });

  it('should keep search engines away, like the other admin pages', async () => {
    await render([]);

    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });
});
