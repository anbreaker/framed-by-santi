import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { IMAGE_CODEC, PREVIEW_MAKER } from '../../utils/photo-upload-tokens';
import { ImageCodec } from '../../utils/prepare-photo';
import { UploadPanelComponent } from './upload-panel.component';

const fileOf = (name: string, type = 'image/jpeg'): File =>
  new File([new Uint8Array(1)], name, { type });

describe('UploadPanelComponent', () => {
  let fixture: ComponentFixture<UploadPanelComponent>;
  let upload: ReturnType<typeof vi.fn>;
  let decode: ReturnType<typeof vi.fn>;
  let makePreview: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const pick = async (...files: File[]): Promise<void> => {
    const input = root().querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() =>
      expect(root().querySelectorAll('.upload-panel__item').length).toBe(files.length)
    );
    await fixture.whenStable();
  };

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:original');
    makePreview = vi.fn(async (file: File) => `blob:small-${file.name}`);
    upload = vi.fn().mockResolvedValue({ height: 10, publicId: 'folder/a', width: 20 });
    decode = vi.fn().mockResolvedValue({ height: 3000, source: {}, width: 4000 });
    const codec: ImageCodec = { decode, encode: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UploadPanelComponent, realTranslations()],
      providers: [
        { provide: IMAGE_CODEC, useValue: codec },
        { provide: PREVIEW_MAKER, useValue: makePreview },
        { provide: PhotoUploadService, useValue: { upload } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadPanelComponent);
    await fixture.whenStable();
  });

  it('should explain the limit and accept only the supported image types', () => {
    const input = root().querySelector('input[type="file"]') as HTMLInputElement;

    expect(root().textContent).toContain('6000');
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(input.multiple).toBe(true);
  });

  it('should open the file chooser when the editor asks for photos', () => {
    const input = root().querySelector('input[type="file"]') as HTMLInputElement;
    const open = vi.spyOn(input, 'click');

    fixture.componentInstance.openPicker();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('should upload files handed over directly, like the ones dropped on the viewer', async () => {
    await fixture.componentInstance.addFiles([fileOf('a.jpg'), fileOf('b.jpg')]);

    await fixture.whenStable();

    expect(upload).toHaveBeenCalledTimes(2);
    expect(root().querySelectorAll('.upload-panel__item').length).toBe(2);
  });

  it('should announce each file at once, without waiting for its preview or any upload', () => {
    const queued: { localId: number; name: string; previewUrl: string }[] = [];
    fixture.componentInstance.queued.subscribe((item) => queued.push(item));

    void fixture.componentInstance.addFiles([fileOf('a.jpg'), fileOf('b.jpg')]);

    expect(queued).toEqual([
      { localId: 0, name: 'a.jpg', previewUrl: '' },
      { localId: 1, name: 'b.jpg', previewUrl: '' },
    ]);
    expect(upload).not.toHaveBeenCalled();
  });

  it('should send a small preview of each file as soon as it is ready, matched by its local id', async () => {
    const ready: { localId: number; previewUrl: string }[] = [];
    fixture.componentInstance.previewReady.subscribe((item) => ready.push(item));

    await fixture.componentInstance.addFiles([fileOf('a.jpg'), fileOf('b.jpg')]);

    expect(ready).toEqual([
      { localId: 0, previewUrl: 'blob:small-a.jpg' },
      { localId: 1, previewUrl: 'blob:small-b.jpg' },
    ]);
  });

  it('should make the previews one at a time, so many 40 MP photos never decode at once', async () => {
    let active = 0;
    let peak = 0;
    makePreview.mockImplementation(async (file: File) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return `blob:small-${file.name}`;
    });

    await fixture.componentInstance.addFiles(
      ['a', 'b', 'c', 'd'].map((name) => fileOf(`${name}.jpg`))
    );
    await vi.waitFor(() => expect(makePreview).toHaveBeenCalledTimes(4));
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(peak).toBe(1);
  });

  it('should fall back to showing the original file when a small preview cannot be made', async () => {
    const ready: { localId: number; previewUrl: string }[] = [];
    fixture.componentInstance.previewReady.subscribe((item) => ready.push(item));
    makePreview.mockRejectedValue(new Error('unsupported'));

    await fixture.componentInstance.addFiles([fileOf('a.jpg')]);

    expect(ready).toEqual([{ localId: 0, previewUrl: 'blob:original' }]);
  });

  it('should finish each photo with the uploaded result, matched by its local id', async () => {
    const finished: unknown[] = [];
    fixture.componentInstance.finished.subscribe((item) => finished.push(item));

    await pick(fileOf('a.jpg'));
    await vi.waitFor(() => expect(finished).toHaveLength(1));

    expect(finished).toEqual([
      { localId: 0, result: { height: 10, publicId: 'folder/a', width: 20 } },
    ]);
  });

  it('should finish with no result when the upload or the preparation fails', async () => {
    const finished: { localId: number; result: unknown }[] = [];
    fixture.componentInstance.finished.subscribe((item) => finished.push(item));
    upload.mockRejectedValueOnce(new PhotoUploadError('sign-failed'));
    decode.mockRejectedValueOnce(new Error('unreadable'));

    await fixture.componentInstance.addFiles([fileOf('a.jpg'), fileOf('b.jpg')]);

    expect(finished).toEqual([
      { localId: 0, result: null },
      { localId: 1, result: null },
    ]);
  });

  it('should upload each chosen photo and mark it as done', async () => {
    await pick(fileOf('a.jpg'), fileOf('b.jpg'));
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    await fixture.whenStable();

    const statuses = Array.from(root().querySelectorAll('.upload-panel__status')).map((status) =>
      status.textContent?.trim()
    );

    expect(statuses).toEqual(['Uploaded', 'Uploaded']);
  });

  it('should show the reason and keep going when one photo is rejected', async () => {
    await pick(fileOf('doc.pdf', 'application/pdf'), fileOf('ok.jpg'));
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await fixture.whenStable();

    const statuses = root().querySelectorAll('.upload-panel__status');

    expect(statuses[0].textContent).toContain('is not a supported image');
    expect(statuses[0].getAttribute('role')).toBe('alert');
    expect(statuses[1].textContent?.trim()).toBe('Uploaded');
  });

  it('should show a refused upload as an error', async () => {
    upload.mockRejectedValue(new PhotoUploadError('not-allowed'));

    await pick(fileOf('a.jpg'));
    await vi.waitFor(() =>
      expect(root().querySelector('.upload-panel__status--error')).not.toBeNull()
    );

    expect(root().textContent).toContain('not allowed');
  });

  it('should warn when a photo had to be resized', async () => {
    decode.mockResolvedValue({ height: 6000, source: {}, width: 9000 });
    const codec = TestBed.inject(IMAGE_CODEC) as ImageCodec;
    (codec.encode as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob(['x']));

    await pick(fileOf('big.jpg'));
    await vi.waitFor(() => expect(root().querySelector('.upload-panel__warning')).not.toBeNull());

    expect(root().querySelector('.upload-panel__warning')?.textContent).toContain('Resized');
  });
});
