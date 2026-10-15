import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { ImageCodec } from '../../utils/prepare-photo';
import { IMAGE_CODEC, UploadPanelComponent } from './upload-panel.component';

const fileOf = (name: string, type = 'image/jpeg'): File =>
  new File([new Uint8Array(1)], name, { type });

describe('UploadPanelComponent', () => {
  let fixture: ComponentFixture<UploadPanelComponent>;
  let upload: ReturnType<typeof vi.fn>;
  let decode: ReturnType<typeof vi.fn>;

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
    upload = vi.fn().mockResolvedValue({ height: 10, publicId: 'folder/a', width: 20 });
    decode = vi.fn().mockResolvedValue({ height: 3000, source: {}, width: 4000 });
    const codec: ImageCodec = { decode, encode: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UploadPanelComponent, realTranslations()],
      providers: [
        { provide: IMAGE_CODEC, useValue: codec },
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

  it('should emit each photo once it is uploaded', async () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.uploaded.subscribe((photo) => emitted.push(photo));

    await pick(fileOf('a.jpg'));
    await vi.waitFor(() =>
      expect(emitted).toEqual([{ height: 10, publicId: 'folder/a', width: 20 }])
    );
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
