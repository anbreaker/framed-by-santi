import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PostViewerPageComponent } from './post-viewer.page';

describe('PostViewerPageComponent with zoom', () => {
  let fixture: ComponentFixture<PostViewerPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const counter = (): string => root().querySelector('.viewer__counter')?.textContent?.trim() ?? '';
  const level = (): string => root().querySelector('.zoomable__level')?.textContent?.trim() ?? '';
  const click = async (label: string): Promise<void> => {
    (root().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };
  const press = async (key: string): Promise<void> => {
    window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, key }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PostViewerPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostViewerPageComponent);
    fixture.componentRef.setInput('postId', 'post-2');
    await fixture.whenStable();
  });

  it('should keep the photo in place when the arrow keys are used while zoomed in', async () => {
    await click('Zoom in');

    await press('ArrowRight');
    await press('ArrowLeft');

    expect(counter()).toBe('01 / 10');
  });

  it('should change photo with the arrow keys again after zooming back out', async () => {
    await click('Zoom in');
    await click('Reset zoom');

    await press('ArrowRight');

    expect(counter()).toBe('02 / 10');
  });

  it('should still change photo with the arrow buttons while zoomed, starting the next one unzoomed', async () => {
    await click('Zoom in');
    expect(level()).toBe('150%');

    await click('Next photo');

    expect(counter()).toBe('02 / 10');
    expect(level()).toBe('100%');
  });
});
