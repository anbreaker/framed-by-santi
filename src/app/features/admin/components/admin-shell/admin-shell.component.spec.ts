import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminShellComponent } from './admin-shell.component';

@Component({
  imports: [AdminShellComponent],
  template: '<app-admin-shell><p class="section">Library</p></app-admin-shell>',
})
class HostComponent {}

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should put the admin navigation in a sidebar, beside the section, not above it', () => {
    const sidebar = root().querySelector('.admin-shell__sidebar');
    const content = root().querySelector('.admin-shell__content');

    expect(sidebar?.querySelector('app-admin-nav')).not.toBeNull();
    expect(content?.querySelector('.section')?.textContent).toBe('Library');
    expect(sidebar?.parentElement).toBe(content?.parentElement);
  });
});
