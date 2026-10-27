import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { Congratulation } from '../../models/congratulation.model';
import {
  CongratulationFormComponent,
  CongratulationFormValue,
  MAX_VIDEO_BYTES,
} from './congratulation-form.component';

@Component({
  imports: [CongratulationFormComponent],
  template: `
    <app-congratulation-form
      [editing]="editing()"
      [resetKey]="resetKey()"
      [saving]="saving()"
      (cancelled)="cancels = cancels + 1"
      (submitted)="values.push($event)"
    />
  `,
})
class HostComponent {
  cancels = 0;
  readonly editing = signal<Congratulation | null>(null);
  readonly resetKey = signal(0);
  readonly saving = signal(false);
  readonly values: CongratulationFormValue[] = [];
}

const firstPhoto = { alt: 'Ana and Santi', height: 600, id: 'p1', publicId: 'p1', width: 900 };
const secondPhoto = { alt: '', height: 600, id: 'p2', publicId: 'p2', width: 900 };

const mixedMessage: Congratulation = {
  createdAt: 1,
  from: 'Ana',
  id: 'ana',
  media: [
    { kind: 'photo', photo: firstPhoto },
    { kind: 'youtube', video: 'dQw4w9WgXcQ' },
    { kind: 'cloudinary', publicId: 'framed-by-santi/posts/v1' },
    { kind: 'photo', photo: secondPhoto },
  ],
  message: 'Happy birthday!',
};

const image = (name: string): File => new File(['x'], name, { type: 'image/jpeg' });
const clip = (name: string, size = 10): File => {
  const file = new File(['x'], name, { type: 'video/mp4' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('CongratulationFormComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HostComponent => fixture.componentInstance;
  const field = <T extends HTMLElement>(id: string): T => root().querySelector(`#${id}`) as T;
  const errors = (): string[] =>
    Array.from(root().querySelectorAll('.congrats-form__error')).map(
      (error) => error.textContent?.trim() ?? ''
    );

  /** What each row of the list holds, read from its preview or its fields. */
  const rows = (): string[] =>
    Array.from(root().querySelectorAll('.congrats-form__photo')).map(
      (row) => row.getAttribute('data-kind') ?? ''
    );

  const type = async (id: string, value: string): Promise<void> => {
    const input = field<HTMLInputElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const pick = async (id: string, ...files: File[]): Promise<void> => {
    const input = field<HTMLInputElement>(id);
    const list = Object.assign([...files], { item: (index: number) => files[index] ?? null });
    Object.defineProperty(input, 'files', { configurable: true, value: list });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const button = (label: string): HTMLButtonElement =>
    (root().querySelector(`button[aria-label="${label}"]`) ??
      Array.from(root().querySelectorAll('button')).find(
        (item) => item.textContent?.trim() === label
      )) as HTMLButtonElement;

  const press = async (label: string): Promise<void> => {
    button(label).click();
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const writeMessage = async (): Promise<void> => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
  };

  beforeEach(async () => {
    localStorage.clear();
    // jsdom has no object URLs; each file is given one named after it.
    URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
    URL.revokeObjectURL = vi.fn();
    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should label every field and offer to add photos, videos and YouTube links', () => {
    expect(root().querySelector('label[for="congrats-from"]')?.textContent).toContain('Name');
    expect(root().querySelector('label[for="congrats-message"]')?.textContent).toContain('Message');
    expect(root().querySelector('label[for="congrats-photo"]')?.textContent).toContain(
      'Add photos'
    );
    expect(root().querySelector('label[for="congrats-video"]')?.textContent).toContain(
      'Add videos'
    );
    expect(button('Add a YouTube link')).toBeTruthy();
    expect(rows()).toEqual([]);
  });

  it('should hand over a text-only message, trimmed, with no media', async () => {
    await type('congrats-from', '  Ana ');
    await type('congrats-message', ' Happy birthday!\nSee you. ');
    await submit();

    expect(host().values).toEqual([
      { from: 'Ana', media: [], message: 'Happy birthday!\nSee you.' },
    ]);
  });

  it('should take a message of up to 5000 characters and refuse a longer one', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'a'.repeat(5001));
    await submit();

    expect(host().values).toEqual([]);
    expect(field('congrats-message').getAttribute('maxlength')).toBe('5000');

    await type('congrats-message', 'a'.repeat(5000));
    await submit();

    expect(host().values).toEqual([{ from: 'Ana', media: [], message: 'a'.repeat(5000) }]);
  });

  it('should ask for the sender and the message, marking the fields, before handing anything over', async () => {
    await submit();

    expect(host().values).toEqual([]);
    expect(errors()).toEqual([
      'Write who sends it (up to 80 characters).',
      'Write the message (up to 5000 characters).',
    ]);
    expect(field('congrats-from').getAttribute('aria-invalid')).toBe('true');
    expect(field('congrats-from').getAttribute('aria-describedby')).toBe('congrats-from-error');
  });

  it('should mix photos, videos and YouTube links in one message, in the order they are added', async () => {
    await writeMessage();
    const lisbon = image('lisbon.jpg');
    const party = clip('party.mp4');

    await pick('congrats-photo', lisbon);
    await press('Add a YouTube link');
    await type('congrats-youtube-1', 'https://youtu.be/dQw4w9WgXcQ?si=x');
    await pick('congrats-video', party);
    await type('congrats-alt-0', 'Ana in Lisbon');
    expect(rows()).toEqual(['photo', 'youtube', 'video']);

    await submit();
    expect(host().values[0].media).toEqual([
      { alt: 'Ana in Lisbon', file: lisbon, kind: 'photo', whole: false },
      { kind: 'ready', media: { kind: 'youtube', video: 'dQw4w9WgXcQ' } },
      { file: party, kind: 'video' },
    ]);
  });

  it('should refuse a link that is not a YouTube video, under its own field', async () => {
    await writeMessage();
    await press('Add a YouTube link');
    await type('congrats-youtube-0', 'https://vimeo.com/1');
    await submit();

    expect(errors()).toEqual(['Paste a valid YouTube link.']);
    expect(field('congrats-youtube-0').getAttribute('aria-invalid')).toBe('true');
    expect(host().values).toEqual([]);
  });

  it('should refuse a video larger than Cloudinary takes in one upload', async () => {
    await writeMessage();
    await pick('congrats-video', clip('huge.mp4', MAX_VIDEO_BYTES + 1));
    await submit();

    expect(errors()).toEqual(['The video is larger than 100 MB.']);
    expect(host().values).toEqual([]);
  });

  it('should show a small preview of every new photo and video before it is uploaded', async () => {
    await pick('congrats-photo', image('lisbon.jpg'));
    await pick('congrats-video', clip('party.mp4'));

    expect(root().querySelector('.congrats-form__photo-preview--new')?.getAttribute('src')).toBe(
      'blob:lisbon.jpg'
    );
    expect(root().querySelector('video.congrats-form__photo-preview')?.getAttribute('src')).toBe(
      'blob:party.mp4'
    );
  });

  it('should let the items be put in order or taken out', async () => {
    await writeMessage();
    const files = ['one.jpg', 'two.jpg', 'three.jpg'].map(image);
    await pick('congrats-photo', ...files);

    await press('Move attachment 3 up');
    await press('Move attachment 1 down');
    await press('Remove attachment 3');

    expect(button('Move attachment 1 up').disabled).toBe(true);
    expect(button('Move attachment 2 down').disabled).toBe(true);

    await submit();
    expect(host().values[0].media.map((entry) => 'file' in entry && entry.file)).toEqual([
      files[2],
      files[0],
    ]);
  });

  it('should free the preview of a new file when it is taken out, when the form empties and when it goes away', async () => {
    await pick('congrats-photo', image('one.jpg'), image('two.jpg'));

    await press('Remove attachment 1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one.jpg');

    host().resetKey.set(1);
    await fixture.whenStable();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:two.jpg');
    expect(rows()).toEqual([]);

    await pick('congrats-video', clip('four.mp4'));
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:four.mp4');
  });

  it('should fill in the message being edited and keep its media in order, adding new items after them', async () => {
    host().editing.set(mixedMessage);
    await fixture.whenStable();

    expect(field<HTMLInputElement>('congrats-from').value).toBe('Ana');
    expect(rows()).toEqual(['saved-photo', 'youtube', 'saved-video', 'saved-photo']);
    expect(field<HTMLInputElement>('congrats-alt-0').value).toBe('Ana and Santi');
    expect(field<HTMLInputElement>('congrats-youtube-1').value).toBe(
      'https://youtu.be/dQw4w9WgXcQ'
    );

    const added = image('added.jpg');
    await pick('congrats-photo', added);
    await type('congrats-alt-3', 'Ana at the beach');
    await submit();

    expect(host().values[0].media).toEqual([
      { kind: 'ready', media: { kind: 'photo', photo: firstPhoto } },
      { kind: 'ready', media: { kind: 'youtube', video: 'dQw4w9WgXcQ' } },
      { kind: 'ready', media: { kind: 'cloudinary', publicId: 'framed-by-santi/posts/v1' } },
      {
        kind: 'ready',
        media: { kind: 'photo', photo: { ...secondPhoto, alt: 'Ana at the beach' } },
      },
      { alt: '', file: added, kind: 'photo', whole: false },
    ]);
  });

  it('should let each photo be marked to show whole, new or saved, and keep the mark when editing', async () => {
    host().editing.set({
      ...mixedMessage,
      media: [
        { kind: 'photo', photo: firstPhoto, whole: true },
        { kind: 'photo', photo: secondPhoto },
      ],
    });
    await fixture.whenStable();
    const added = image('added.jpg');
    await pick('congrats-photo', added);

    expect(field<HTMLInputElement>('congrats-whole-0').checked).toBe(true);
    expect(field<HTMLInputElement>('congrats-whole-1').checked).toBe(false);
    expect(root().querySelector('label[for="congrats-whole-2"]')?.textContent).toContain(
      'Full portrait photo (with blurred frame)'
    );

    field<HTMLInputElement>('congrats-whole-0').click();
    field<HTMLInputElement>('congrats-whole-2').click();
    await fixture.whenStable();
    await submit();

    expect(host().values[0].media).toEqual([
      { kind: 'ready', media: { kind: 'photo', photo: firstPhoto } },
      { kind: 'ready', media: { kind: 'photo', photo: secondPhoto } },
      { alt: '', file: added, kind: 'photo', whole: true },
    ]);
  });

  it('should save words alone when every saved item is taken out', async () => {
    host().editing.set(mixedMessage);
    await fixture.whenStable();

    for (let i = 0; i < 4; i++) await press('Remove attachment 1');
    await submit();

    expect(host().values[0].media).toEqual([]);
  });

  it('should offer to cancel only while editing', async () => {
    expect(root().querySelector('button.btn--ghost')).toBeNull();

    host().editing.set(mixedMessage);
    await fixture.whenStable();
    (root().querySelector('button.btn--ghost') as HTMLButtonElement).click();

    expect(host().cancels).toBe(1);
  });

  it('should empty itself when asked to reset, after a save', async () => {
    await writeMessage();

    host().resetKey.set(1);
    await fixture.whenStable();

    expect(field<HTMLInputElement>('congrats-from').value).toBe('');
    expect(field<HTMLTextAreaElement>('congrats-message').value).toBe('');
  });

  it('should not hand anything over while saving, and say it is saving', async () => {
    host().saving.set(true);
    await fixture.whenStable();
    await writeMessage();
    await submit();

    const save = root().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.textContent?.trim()).toBe('Saving…');
    expect(host().values).toEqual([]);
  });
});
