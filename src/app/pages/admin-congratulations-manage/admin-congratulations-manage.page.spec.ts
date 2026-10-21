import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PhotoUploadService } from '@features/admin/services/photo-upload.service';
import { Congratulation } from '@features/congratulations/models/congratulation.model';
import { CongratulationsStore } from '@features/congratulations/store/congratulations.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminCongratulationsManagePageComponent } from './admin-congratulations-manage.page';

const ana: Congratulation = {
  createdAt: 1,
  from: 'Ana',
  id: 'ana',
  media: { kind: 'youtube', video: 'dQw4w9WgXcQ' },
  message: 'Happy birthday!',
};
const bruno: Congratulation = {
  createdAt: 2,
  from: 'Bruno',
  id: 'bruno',
  media: {
    kind: 'photo',
    photo: {
      alt: 'Bruno',
      height: 600,
      id: 'p1',
      publicId: 'framed-by-santi/posts/p1',
      width: 900,
    },
  },
  message: 'Cheers',
};

describe('AdminCongratulationsManagePageComponent', () => {
  let fixture: ComponentFixture<AdminCongratulationsManagePageComponent>;
  const items = signal<readonly Congratulation[]>([]);
  const status = signal<'failed' | 'idle' | 'loading' | 'ready'>('ready');
  const store = { items, load: vi.fn(), remove: vi.fn(), save: vi.fn(), status };
  const uploads = { upload: vi.fn(), uploadVideo: vi.fn() };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (label: string): HTMLButtonElement =>
    root().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
  const buttonWithText = (text: string): HTMLButtonElement =>
    Array.from(root().querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === text
    ) as HTMLButtonElement;
  const status$ = (): string => root().querySelector('.manage__status')?.textContent?.trim() ?? '';
  const cards = (): string[] =>
    Array.from(root().querySelectorAll('.manage__card h3')).map(
      (title) => title.textContent?.trim() ?? ''
    );

  const type = async (id: string, value: string): Promise<void> => {
    const input = root().querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
    items.set([ana, bruno]);
    status.set('ready');
    store.load.mockReset().mockResolvedValue(undefined);
    store.remove.mockReset().mockImplementation(async (id: string) => {
      items.update((list) => list.filter((item) => item.id !== id));
    });
    store.save.mockReset().mockImplementation(async (draft: object, id?: string) => ({
      ...draft,
      createdAt: 3,
      id: id ?? 'new',
    }));
    uploads.upload.mockReset();
    uploads.uploadVideo.mockReset();

    await TestBed.configureTestingModule({
      imports: [AdminCongratulationsManagePageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        { provide: CongratulationsStore, useValue: store },
        { provide: PhotoUploadService, useValue: uploads },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCongratulationsManagePageComponent);
    await fixture.whenStable();
  });

  it('should be its own page, with the admin navigation, a link to the view Santi gets and the saved messages', () => {
    expect(root().querySelector('main#main-content app-admin-shell')).not.toBeNull();
    expect(root().querySelector('h1')?.textContent).toContain('Manage congratulations');
    expect(
      root().querySelector('.manage__header a[href="/admin/congratulations"]')?.textContent
    ).toContain('View as Santi');
    expect(store.load).toHaveBeenCalledTimes(1);
    expect(cards()).toEqual(['Ana', 'Bruno']);
    expect(root().querySelector('.manage__card img')?.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('should save a new message with its YouTube video and say so', async () => {
    await type('congrats-from', 'Carla');
    await type('congrats-message', 'Hugs');
    const youtube = Array.from(
      root().querySelectorAll('.congrats-form__kind input')
    )[2] as HTMLInputElement;
    youtube.checked = true;
    youtube.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await type('congrats-youtube', 'https://youtu.be/dQw4w9WgXcQ');

    await submit();

    expect(store.save).toHaveBeenCalledWith(
      { from: 'Carla', media: { kind: 'youtube', video: 'dQw4w9WgXcQ' }, message: 'Hugs' },
      undefined
    );
    expect(status$()).toBe('Message saved.');
    expect((root().querySelector('#congrats-from') as HTMLInputElement).value).toBe('');
  });

  it('should upload a new photo first and save it as the photos of the sets are saved', async () => {
    uploads.upload.mockResolvedValue({
      height: 600,
      publicId: 'framed-by-santi/posts/new',
      width: 900,
    });
    await type('congrats-from', 'Carla');
    await type('congrats-message', 'Hugs');
    const photo = Array.from(
      root().querySelectorAll('.congrats-form__kind input')
    )[1] as HTMLInputElement;
    photo.checked = true;
    photo.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const file = new File(['x'], 'carla.jpg', { type: 'image/jpeg' });
    const input = root().querySelector('#congrats-photo') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: { item: () => file } });
    input.dispatchEvent(new Event('change'));
    await type('congrats-alt', 'Carla');

    await submit();

    expect(uploads.upload).toHaveBeenCalledWith(file);
    expect(store.save).toHaveBeenCalledWith(
      {
        from: 'Carla',
        media: {
          kind: 'photo',
          photo: {
            alt: 'Carla',
            height: 600,
            id: 'framed-by-santi/posts/new',
            publicId: 'framed-by-santi/posts/new',
            width: 900,
          },
        },
        message: 'Hugs',
      },
      undefined
    );
  });

  it('should say the file could not be uploaded, and save nothing', async () => {
    uploads.uploadVideo.mockRejectedValue(new Error('upload-failed'));
    await type('congrats-from', 'Carla');
    await type('congrats-message', 'Hugs');
    const video = Array.from(
      root().querySelectorAll('.congrats-form__kind input')
    )[3] as HTMLInputElement;
    video.checked = true;
    video.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const input = root().querySelector('#congrats-video') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: { item: () => new File(['x'], 'v.mp4') } });
    input.dispatchEvent(new Event('change'));

    await submit();

    expect(store.save).not.toHaveBeenCalled();
    expect(status$()).toBe('Could not upload the file. Try again.');
  });

  it('should edit a message in place, keeping its photo when no new one is chosen', async () => {
    button('Edit the message from Bruno').click();
    await fixture.whenStable();
    expect(root().querySelector('#manage-form-title')?.textContent).toContain('Edit message');

    await type('congrats-message', 'Cheers again');
    await submit();

    expect(uploads.upload).not.toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledWith(
      { from: 'Bruno', media: bruno.media, message: 'Cheers again' },
      'bruno'
    );
    expect(root().querySelector('#manage-form-title')?.textContent).toContain('New message');
  });

  it('should say the message could not be saved and keep what was written', async () => {
    store.save.mockRejectedValue(new Error('request-failed'));
    await type('congrats-from', 'Carla');
    await type('congrats-message', 'Hugs');

    await submit();

    expect(status$()).toBe('Could not save. Check your connection and try again.');
    expect((root().querySelector('#congrats-from') as HTMLInputElement).value).toBe('Carla');
  });

  it('should ask before deleting, and delete only on a yes', async () => {
    button('Delete the message from Ana').click();
    await fixture.whenStable();
    expect(root().textContent).toContain('Delete the message from Ana?');

    buttonWithText('No').click();
    await fixture.whenStable();
    expect(store.remove).not.toHaveBeenCalled();

    button('Delete the message from Ana').click();
    await fixture.whenStable();
    buttonWithText('Yes, delete').click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(store.remove).toHaveBeenCalledWith('ana');
    expect(cards()).toEqual(['Bruno']);
    expect(status$()).toBe('Message deleted.');
  });

  it('should say when nothing is saved yet, and when the messages cannot be read', async () => {
    items.set([]);
    await fixture.whenStable();
    expect(root().textContent).toContain('You have not saved any yet.');

    status.set('failed');
    await fixture.whenStable();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      'The messages could not be loaded.'
    );
  });

  it('should keep search engines away, like the other admin pages', () => {
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });
});
