import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { Photo } from '@features/photo-posts/models/photo.model';

import { swipeDirection } from '../../utils/swipe-direction';
import { ZoomablePhotoComponent } from '../zoomable-photo/zoomable-photo.component';

/** Time the photo on its way out takes to fade; keep it in step with `set-stage-out` in the stylesheet. */
const FADE_OUT_MS = 160;
/** Longest the old photo waits for the new one; after that it is swapped anyway so a slow link never sticks. */
const LOAD_TIMEOUT_MS = 2500;

/**
 * The big photo of a set, with arrows and swipe. It only reports intent; the page owns the state.
 * Changing photo goes through the dark background: the old photo stays until the new one has arrived,
 * fades out, and the new one fades in. That never leaves a blank gap, however far the jump, and it looks
 * right between photos that share no colours, where a cross-dissolve would look harsh.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ZoomablePhotoComponent],
  selector: 'app-set-stage',
  styleUrl: './set-stage.component.css',
  templateUrl: './set-stage.component.html',
})
export class SetStageComponent {
  /** Which way the set is being walked, so the photos slide a little the same way. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly direction = input<'next' | 'previous'>('next');
  readonly isFirst = input(false);
  /** Shared with the gallery tile so the cover morphs into this photo. */
  readonly isLast = input(false);

  readonly photo = input.required<Photo>();
  readonly transitionName = input<string | null>(null);
  /** Whether the photo is zoomed in; while it is, dragging moves the photo instead of swiping. */
  readonly next = output<void>();

  readonly previous = output<void>();
  /** The photo on screen; it only follows `photo` once the new one has arrived. */
  readonly zoomedChange = output<boolean>();
  protected readonly fading = signal(false);
  /** The photo being loaded behind the scenes, not visible yet. */
  protected readonly incoming = signal<Photo | null>(null);
  protected readonly isZoomed = signal(false);
  /** The photo on screen; it only follows `photo` once the new one has arrived. */
  private readonly onScreen = signal<Photo | null>(null);
  protected readonly shown = computed(() => this.onScreen() ?? this.photo());
  /** A list of one lets `@for` remount the photo, which replays its fade-in and resets its zoom. */
  protected readonly shownPhotos = computed(() => [this.shown()]);

  private activePointers = 0;
  private fadeTimer: ReturnType<typeof setTimeout> | undefined;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;
  private swipeStartX: number | null = null;

  constructor() {
    effect(() => this.zoomedChange.emit(this.isZoomed()));
    effect(() => {
      const target = this.photo();
      untracked(() => this.request(target));
    });

    // `load` does not bubble, so it is listened for on the way down.
    this.host.nativeElement.addEventListener(
      'load',
      (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('.set-stage__photo--incoming')) this.arrived();
      },
      true
    );
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  private request(target: Photo): void {
    const current = this.onScreen();

    if (current === null) {
      this.onScreen.set(target);
      return;
    }

    this.clearTimers();
    this.fading.set(false);

    if (target.id === current.id) {
      this.incoming.set(null);
      return;
    }

    this.incoming.set(target);
    this.loadTimer = setTimeout(() => this.swap(), LOAD_TIMEOUT_MS);
    // A photo already in cache is complete as soon as it is rendered and never fires `load` again.
    afterNextRender(
      () => {
        const image = this.host.nativeElement.querySelector<HTMLImageElement>(
          '.set-stage__photo--incoming img'
        );
        if (image?.complete && image.naturalWidth > 0) this.arrived();
      },
      { injector: this.injector }
    );
  }

  /** The new photo is ready: fade the old one out, then show the new one. */
  private arrived(): void {
    if (this.incoming() === null || this.fading()) return;

    clearTimeout(this.loadTimer);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.swap();
      return;
    }

    this.fading.set(true);
    this.fadeTimer = setTimeout(() => this.swap(), FADE_OUT_MS);
  }

  private swap(): void {
    const next = this.incoming();

    this.clearTimers();
    if (next !== null) this.onScreen.set(next);
    this.incoming.set(null);
    this.fading.set(false);
  }

  private clearTimers(): void {
    clearTimeout(this.fadeTimer);
    clearTimeout(this.loadTimer);
  }

  protected onPointerCancel(): void {
    this.activePointers = Math.max(0, this.activePointers - 1);
    this.swipeStartX = null;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.activePointers++;

    // A second finger means pinch, never swipe.
    const isSwipeCandidate = event.pointerType !== 'mouse' && this.activePointers === 1;
    this.swipeStartX = isSwipeCandidate ? event.clientX : null;
  }

  protected onPointerUp(event: PointerEvent): void {
    this.activePointers = Math.max(0, this.activePointers - 1);

    if (this.swipeStartX === null || this.isZoomed()) {
      this.swipeStartX = null;
      return;
    }

    const direction = swipeDirection(this.swipeStartX, event.clientX);
    this.swipeStartX = null;

    if (direction === 'next' && !this.isLast()) this.next.emit();
    if (direction === 'previous' && !this.isFirst()) this.previous.emit();
  }
}
