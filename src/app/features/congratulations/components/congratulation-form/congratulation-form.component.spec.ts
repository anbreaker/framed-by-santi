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

const photoMessage: Congratulation = {
  createdAt: 1,
  from: 'Ana',
  id: 'ana',
  media: {
    kind: 'photo',
    photos: [
      { alt: 'Ana and Santi', height: 600, id: 'p1', publicId: 'p1', width: 900 },
      { alt: '', height: 600, id: 'p2', publicId: 'p2', width: 900 },
    ],
  },
  message: 'Happy birthday!',
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

  const type = async (id: string, value: string): Promise<void> => {
    const input = field<HTMLInputElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const choose = async (label: string): Promise<void> => {
    const option = Array.from(root().querySelectorAll('.congrats-form__kind')).find((item) =>
      item.textContent?.includes(label)
    );
    const radio = option?.querySelector('input') as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const pick = async (id: string, ...files: File[]): Promise<void> => {
    const input = field<HTMLInputElement>(id);
    const list = Object.assign([...files], { item: (index: number) => files[index] ?? null });
    Object.defineProperty(input, 'files', { configurable: true, value: list });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const photoNames = (): string[] =>
    Array.from(root().querySelectorAll('.congrats-form__photo-name')).map(
      (name) => name.textContent?.trim() ?? ''
    );

  const button = (label: string): HTMLButtonElement =>
    root().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

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

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should label every field and offer the four kinds of attachment, text only first', () => {
    expect(root().querySelector('label[for="congrats-from"]')?.textContent).toContain('Name');
    expect(root().querySelector('label[for="congrats-message"]')?.textContent).toContain('Message');
    expect(
      Array.from(root().querySelectorAll('.congrats-form__kind')).map((item) =>
        item.textContent?.trim()
      )
    ).toEqual(['Text only', 'Photos', 'YouTube video', 'Cloudinary video']);
    expect((root().querySelector('.congrats-form__kind input') as HTMLInputElement).checked).toBe(
      true
    );
  });

  it('should hand over a text-only message, trimmed', async () => {
    await type('congrats-from', '  Ana ');
    await type('congrats-message', ' Happy birthday!\nSee you. ');
    await submit();

    expect(host().values).toEqual([
      {
        file: null,
        from: 'Ana',
        kind: 'none',
        message: 'Happy birthday!\nSee you.',
        photos: [],
        youtube: '',
      },
    ]);
  });

  it('should ask for the sender and the message, marking the fields, before handing anything over', async () => {
    await submit();

    expect(host().values).toEqual([]);
    expect(errors()).toEqual([
      'Write who sends it (up to 80 characters).',
      'Write the message (up to 4000 characters).',
    ]);
    expect(field('congrats-from').getAttribute('aria-invalid')).toBe('true');
    expect(field('congrats-from').getAttribute('aria-describedby')).toBe('congrats-from-error');
  });

  it('should read the YouTube id from the link, and refuse a link that is not a video', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
    await choose('YouTube video');

    await type('congrats-youtube', 'https://vimeo.com/1');
    await submit();
    expect(errors()).toEqual(['Paste a valid YouTube link.']);

    await type('congrats-youtube', 'https://youtu.be/dQw4w9WgXcQ?si=x');
    await submit();
    expect(host().values[0]).toMatchObject({ kind: 'youtube', youtube: 'dQw4w9WgXcQ' });
  });

  it('should need at least one photo, and hand over every photo chosen with its description', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
    await choose('Photos');

    await submit();
    expect(errors()).toEqual(['Choose at least one photo.']);

    const lisbon = new File(['x'], 'lisbon.jpg', { type: 'image/jpeg' });
    const porto = new File(['x'], 'porto.jpg', { type: 'image/jpeg' });
    await pick('congrats-photo', lisbon);
    await pick('congrats-photo', porto);
    expect(photoNames()).toEqual(['lisbon.jpg', 'porto.jpg']);

    await type('congrats-alt-0', 'Ana in Lisbon');
    await submit();
    expect(host().values[0]).toMatchObject({
      file: null,
      kind: 'photo',
      photos: [
        { alt: 'Ana in Lisbon', file: lisbon, kind: 'new' },
        { alt: '', file: porto, kind: 'new' },
      ],
    });
  });

  it('should add several photos at once, and let them be put in order or taken out', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
    await choose('Photos');

    const files = ['one.jpg', 'two.jpg', 'three.jpg'].map(
      (name) => new File(['x'], name, { type: 'image/jpeg' })
    );
    await pick('congrats-photo', ...files);
    expect(photoNames()).toEqual(['one.jpg', 'two.jpg', 'three.jpg']);

    await press('Move photo 3 up');
    expect(photoNames()).toEqual(['one.jpg', 'three.jpg', 'two.jpg']);
    await press('Move photo 1 down');
    expect(photoNames()).toEqual(['three.jpg', 'one.jpg', 'two.jpg']);
    await press('Remove photo 3');
    expect(photoNames()).toEqual(['three.jpg', 'one.jpg']);

    expect(button('Move photo 1 up').disabled).toBe(true);
    expect(button('Move photo 2 down').disabled).toBe(true);

    await submit();
    expect(host().values[0].photos.map((entry) => entry.kind === 'new' && entry.file)).toEqual([
      files[2],
      files[0],
    ]);
  });

  it('should refuse a video larger than Cloudinary takes in one upload', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
    await choose('Cloudinary video');

    const video = new File(['x'], 'ana.mp4', { type: 'video/mp4' });
    Object.defineProperty(video, 'size', { value: MAX_VIDEO_BYTES + 1 });
    await pick('congrats-video', video);
    await submit();

    expect(errors()).toEqual(['The video is larger than 100 MB.']);
    expect(host().values).toEqual([]);
  });

  it('should fill in the message being edited and keep its photos, adding the new ones after them', async () => {
    host().editing.set(photoMessage);
    await fixture.whenStable();

    expect(field<HTMLInputElement>('congrats-from').value).toBe('Ana');
    expect(field<HTMLInputElement>('congrats-alt-0').value).toBe('Ana and Santi');
    expect(field<HTMLInputElement>('congrats-alt-1').value).toBe('');

    const added = new File(['x'], 'added.jpg', { type: 'image/jpeg' });
    await pick('congrats-photo', added);
    await type('congrats-alt-1', 'Ana at the beach');
    await submit();

    const [first, second] = photoMessage.media?.kind === 'photo' ? photoMessage.media.photos : [];
    expect(host().values[0]).toMatchObject({
      kind: 'photo',
      photos: [
        { alt: 'Ana and Santi', kind: 'saved', photo: first },
        { alt: 'Ana at the beach', kind: 'saved', photo: second },
        { alt: '', file: added, kind: 'new' },
      ],
    });
  });

  it('should still need a photo when every saved one is taken out', async () => {
    host().editing.set(photoMessage);
    await fixture.whenStable();

    await press('Remove photo 1');
    await press('Remove photo 1');
    await submit();

    expect(errors()).toEqual(['Choose at least one photo.']);
    expect(host().values).toEqual([]);
  });

  it('should offer to cancel only while editing', async () => {
    expect(root().querySelector('button.btn--ghost')).toBeNull();

    host().editing.set(photoMessage);
    await fixture.whenStable();
    (root().querySelector('button.btn--ghost') as HTMLButtonElement).click();

    expect(host().cancels).toBe(1);
  });

  it('should empty itself when asked to reset, after a save', async () => {
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');

    host().resetKey.set(1);
    await fixture.whenStable();

    expect(field<HTMLInputElement>('congrats-from').value).toBe('');
    expect(field<HTMLTextAreaElement>('congrats-message').value).toBe('');
  });

  it('should not hand anything over while saving, and say it is saving', async () => {
    host().saving.set(true);
    await fixture.whenStable();
    await type('congrats-from', 'Ana');
    await type('congrats-message', 'Hi');
    await submit();

    const button = root().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Saving…');
    expect(host().values).toEqual([]);
  });
});
