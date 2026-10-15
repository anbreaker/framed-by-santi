import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { StagePhoto } from './photo-stage.component';
import { PhotoStageComponent } from './photo-stage.component';

const photo = (id: string, alt = ''): StagePhoto => ({
  alt,
  height: 800,
  id,
  publicId: id,
  width: 1200,
});

describe('PhotoStageComponent', () => {
  let fixture: ComponentFixture<PhotoStageComponent>;
  let moved: { from: number; to: number }[];
  let covered: number[];
  let removed: number[];
  let alts: { alt: string; index: number }[];
  let added: number;
  let dropped: File[][];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byLabel = (label: string): HTMLButtonElement =>
    root().querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
  const text = (selector: string): string =>
    root().querySelector(selector)?.textContent?.trim() ?? '';
  const thumbs = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll('.photo-stage__thumb')) as HTMLButtonElement[];
  const show = async (photos: readonly StagePhoto[]): Promise<void> => {
    fixture.componentRef.setInput('photos', photos);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    moved = [];
    covered = [];
    removed = [];
    alts = [];
    added = 0;
    dropped = [];

    await TestBed.configureTestingModule({
      imports: [PhotoStageComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoStageComponent);
    const component = fixture.componentInstance;
    component.moved.subscribe((move) => moved.push(move));
    component.coverChosen.subscribe((index) => covered.push(index));
    component.removed.subscribe((index) => removed.push(index));
    component.altChanged.subscribe((change) => alts.push(change));
    component.addRequested.subscribe(() => added++);
    component.filesDropped.subscribe((files) => dropped.push(files));
    await show([photo('a'), photo('b'), photo('c')]);
  });

  it('should show the first photo as the cover, with its position', () => {
    expect(text('.photo-stage__count')).toBe('1 / 3');
    expect(text('.photo-stage__badge')).toContain('Cover');
    expect(root().querySelectorAll('.photo-stage__thumb').length).toBe(3);
  });

  it('should step through the photos with the arrows and stop at both ends', async () => {
    expect(byLabel('Previous photo').getAttribute('aria-disabled')).toBe('true');

    byLabel('Next photo').click();
    await fixture.whenStable();
    expect(text('.photo-stage__count')).toBe('2 / 3');
    expect(text('.photo-stage__badge')).toContain('Photo 2');

    byLabel('Next photo').click();
    await fixture.whenStable();
    expect(byLabel('Next photo').getAttribute('aria-disabled')).toBe('true');

    byLabel('Next photo').click();
    await fixture.whenStable();
    expect(text('.photo-stage__count')).toBe('3 / 3');
  });

  it('should jump to a photo when its thumbnail is chosen and mark it as current', async () => {
    thumbs()[2].click();
    await fixture.whenStable();

    expect(text('.photo-stage__count')).toBe('3 / 3');
    expect(thumbs().map((thumb) => thumb.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
    ]);
  });

  it('should ask to move the current photo earlier or later and follow it', async () => {
    thumbs()[1].click();
    await fixture.whenStable();

    (
      Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Move later')
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(moved).toEqual([{ from: 1, to: 2 }]);

    (
      Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Move earlier')
      ) as HTMLButtonElement
    ).click();
    // the stage follows the photo it moved, so the next move starts from its new place
    expect(moved[1]).toEqual({ from: 2, to: 1 });
  });

  it('should not offer to move the cover earlier or make it the cover again', () => {
    const labelled = (label: string): HTMLButtonElement =>
      Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes(label)
      ) as HTMLButtonElement;

    expect(labelled('Move earlier').getAttribute('aria-disabled')).toBe('true');
    expect(labelled('Make cover').getAttribute('aria-disabled')).toBe('true');
  });

  it('should ask to make the current photo the cover and to remove it', async () => {
    thumbs()[2].click();
    await fixture.whenStable();
    const labelled = (label: string): HTMLButtonElement =>
      Array.from(root().querySelectorAll('button')).find((b) =>
        b.textContent?.includes(label)
      ) as HTMLButtonElement;

    labelled('Remove').click();
    labelled('Make cover').click();

    expect(covered).toEqual([2]);
    expect(removed).toEqual([2]);
  });

  it('should keep the current position valid when photos are removed', async () => {
    thumbs()[2].click();
    await fixture.whenStable();

    await show([photo('a'), photo('b')]);

    expect(text('.photo-stage__count')).toBe('2 / 2');
  });

  it('should send the alt text typed for the current photo', async () => {
    thumbs()[1].click();
    await fixture.whenStable();
    const input = root().querySelector('.photo-stage__alt') as HTMLInputElement;

    input.value = 'A cyclist';
    input.dispatchEvent(new Event('input'));

    expect(alts).toEqual([{ alt: 'A cyclist', index: 1 }]);
  });

  it('should reorder by dragging one thumbnail onto another', async () => {
    thumbs()[0].dispatchEvent(new Event('dragstart'));
    thumbs()[2].dispatchEvent(new Event('drop'));
    await fixture.whenStable();

    expect(moved).toEqual([{ from: 0, to: 2 }]);
  });

  it('should show a photo that is still uploading from its local preview, with its state', async () => {
    await show([
      { ...photo('a'), localId: 1, previewUrl: 'blob:mine', state: 'uploading' },
      photo('b'),
    ]);

    const preview = root().querySelector('img.photo-stage__preview') as HTMLImageElement;
    expect(preview.getAttribute('src')).toBe('blob:mine');
    expect(text('.photo-stage__state')).toContain('Uploading');
    expect(thumbs()[0].querySelector('img')?.getAttribute('src')).toBe('blob:mine');
  });

  it('should show a placeholder instead of a broken image while the preview is being prepared', async () => {
    await show([{ ...photo('a'), localId: 1, state: 'uploading' }]);

    expect(root().querySelector('.photo-stage__placeholder')?.textContent).toContain('Preparing');
    expect(root().querySelector('img')).toBeNull();
    expect(thumbs()[0].querySelector('.photo-stage__thumb-placeholder')).not.toBeNull();
  });

  it('should say when a photo failed to upload and keep it visible so it can be removed', async () => {
    await show([{ ...photo('a'), localId: 1, previewUrl: 'blob:mine', state: 'failed' }]);

    expect(text('.photo-stage__state')).toContain('Failed');
    expect(root().querySelector('img.photo-stage__preview')).not.toBeNull();
    expect(thumbs()[0].classList).toContain('photo-stage__thumb--failed');
  });

  it('should show no state for a photo that is already uploaded', () => {
    expect(root().querySelector('.photo-stage__state')).toBeNull();
    expect(root().querySelector('img.photo-stage__preview')).toBeNull();
  });

  it('should ask for photos from the add button', () => {
    byLabel('Add photos').click();

    expect(added).toBe(1);
  });

  it('should invite to choose photos when there are none', async () => {
    await show([]);

    expect(root().querySelector('.photo-stage__count')).toBeNull();
    const zone = root().querySelector('button.photo-stage__empty') as HTMLButtonElement;
    expect(zone.textContent).toContain('Choose photos');

    zone.click();
    expect(added).toBe(1);
  });

  it('should be one big button: clicking the text or the icon asks for photos too', async () => {
    await show([]);

    (root().querySelector('.photo-stage__empty-text') as HTMLElement).click();
    (root().querySelector('.photo-stage__empty svg') as unknown as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(added).toBe(2);
  });

  it('should accept files dropped on the empty zone and show it is ready to receive them', async () => {
    await show([]);
    const zone = root().querySelector('.photo-stage__empty') as HTMLElement;
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const dragOver = new Event('dragover', { cancelable: true });
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });

    zone.dispatchEvent(dragOver);
    await fixture.whenStable();
    expect(dragOver.defaultPrevented).toBe(true);
    expect(zone.classList).toContain('photo-stage__empty--over');

    zone.dispatchEvent(drop);
    await fixture.whenStable();

    expect(dropped).toEqual([[file]]);
    expect(drop.defaultPrevented).toBe(true);
    expect(zone.classList).not.toContain('photo-stage__empty--over');
  });

  it('should ignore a drop that carries no files', async () => {
    await show([]);
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [] } });

    (root().querySelector('.photo-stage__empty') as HTMLElement).dispatchEvent(drop);

    expect(dropped).toEqual([]);
  });
});
