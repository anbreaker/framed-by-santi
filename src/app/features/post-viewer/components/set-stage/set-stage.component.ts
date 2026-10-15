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

/** Time the new photo takes to dissolve in; keep it in step with `set-stage-reveal` in the stylesheet. */
const REVEAL_MS = 550;
/** Longest the old photo waits for the new one; after that it is swapped anyway so a slow link never sticks. */
const LOAD_TIMEOUT_MS = 2500;

/**
 * The big photo of a set, with arrows and swipe. It only reports intent; the page owns the state.
 * Changing photo is a dissolve: the old photo stays until the new one has arrived, and then the new one
 * fades in over it. Nothing flashes and there is never a blank gap, however far the jump.
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly isFirst = input(false);
  readonly isLast = input(false);
  readonly photo = input.required<Photo>();
  /** Shared with the gallery tile so the cover morphs into this photo. */
  readonly transitionName = input<string | null>(null);

  readonly next = output<void>();
  readonly previous = output<void>();
  /** Whether the photo is zoomed in; while it is, dragging moves the photo instead of swiping. */
  readonly zoomedChange = output<boolean>();

  /** Only the photo shown when the page opens fades in on its own; later ones dissolve over the old one. */
  protected readonly entering = signal(true);
  /** The photo being loaded behind the scenes, not visible until it has arrived. */
  protected readonly incoming = signal<Photo | null>(null);
  protected readonly isZoomed = signal(false);
  /** The photo on screen; it only follows `photo` once the new one has arrived and dissolved in. */
  private readonly onScreen = signal<Photo | null>(null);
  protected readonly revealing = signal(false);

  protected readonly shown = computed(() => this.onScreen() ?? this.photo());
  /**
   * The photo on screen and, while one is on its way, the next one on top of it. They are keyed by photo,
   * so the element that was loading is the one that ends up on screen: no remount, no flicker.
   */
  protected readonly photos = computed(() => {
    const next = this.incoming();

    return next === null ? [this.shown()] : [this.shown(), next];
  });

  private activePointers = 0;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;
  private revealTimer: ReturnType<typeof setTimeout> | undefined;
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

  /** Only the photo on screen reports its zoom; the one still loading is inert. */
  protected onZoomedChange(photo: Photo, zoomed: boolean): void {
    if (photo.id === this.shown().id) this.isZoomed.set(zoomed);
  }

  private request(target: Photo): void {
    if (this.onScreen() === null) {
      this.onScreen.set(target);
      return;
    }

    // A dissolve in progress is finished first, so the next change starts from what the visitor sees.
    if (this.revealing()) this.swap();

    this.clearTimers();

    if (target.id === this.onScreen()?.id) {
      this.incoming.set(null);
      return;
    }

    this.incoming.set(target);
    this.loadTimer = setTimeout(() => this.arrived(true), LOAD_TIMEOUT_MS);
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

  /** The new photo is ready (or has waited long enough): dissolve it in over the old one. */
  private arrived(force = false): void {
    if (this.incoming() === null || this.revealing()) return;
    if (!force) clearTimeout(this.loadTimer);

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.swap();
      return;
    }

    this.revealing.set(true);
    this.revealTimer = setTimeout(() => this.swap(), REVEAL_MS);
  }

  private swap(): void {
    const next = this.incoming();

    this.clearTimers();
    if (next !== null) {
      this.onScreen.set(next);
      this.entering.set(false);
      this.isZoomed.set(false);
    }
    this.incoming.set(null);
    this.revealing.set(false);
  }

  private clearTimers(): void {
    clearTimeout(this.revealTimer);
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
