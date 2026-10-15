import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';
import { LocalizedPercentPipe } from '@shared/pipes/localized-percent.pipe';

import {
  clampPan,
  distance,
  DOUBLE_TAP_SCALE,
  fittedSize,
  INITIAL_ZOOM,
  MAX_SCALE,
  midpoint,
  MIN_SCALE,
  Point,
  Size,
  ZOOM_STEP,
  zoomAt,
  ZoomState,
} from '../../utils/zoom-math';

const TAP_MAX_DURATION_MS = 300;
const TAP_MAX_MOVEMENT_PX = 10;
const DOUBLE_TAP_MAX_GAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 30;
const KEYBOARD_PAN_PX = 80;
const WHEEL_SENSITIVITY = 0.01;

interface PinchStart {
  distance: number;
  scale: number;
}

interface Tap {
  time: number;
  x: number;
  y: number;
}

/**
 * A photo that can be zoomed and moved: pinch, drag and double tap on touch screens;
 * buttons, Ctrl or Cmd + wheel, drag, double click and the keyboard on desktop.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedPercentPipe, PostPhotoComponent, TranslocoDirective],
  selector: 'app-zoomable-photo',
  styleUrl: './zoomable-photo.component.css',
  templateUrl: './zoomable-photo.component.html',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class ZoomablePhotoComponent {
  private readonly languageStore = inject(LanguageStore);
  private readonly pointers = new Map<number, Point>();
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');

  private lastTap: Tap | null = null;
  private pinchStart: PinchStart | null = null;
  private tapCandidate: Tap | null = null;

  readonly photo = input.required<Photo>();

  /** Emits whether the photo is currently zoomed in, so the page can stop swiping and arrow keys. */
  readonly zoomedChange = output<boolean>();

  protected readonly dragging = signal(false);
  protected readonly lang = this.languageStore.currentLang;
  protected readonly state = signal<ZoomState>(INITIAL_ZOOM);

  protected readonly canZoomIn = computed(() => this.state().scale < MAX_SCALE);
  protected readonly isZoomed = computed(() => this.state().scale > MIN_SCALE);
  protected readonly transform = computed(() => {
    const { pan, scale } = this.state();

    return `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  });

  constructor() {
    effect(() => this.zoomedChange.emit(this.isZoomed()));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const panKeys: Record<string, Point> = {
      ArrowDown: { x: 0, y: -KEYBOARD_PAN_PX },
      ArrowLeft: { x: KEYBOARD_PAN_PX, y: 0 },
      ArrowRight: { x: -KEYBOARD_PAN_PX, y: 0 },
      ArrowUp: { x: 0, y: KEYBOARD_PAN_PX },
    };

    if (event.key === '+' || event.key === '=') this.zoomIn();
    else if (event.key === '-') this.zoomOut();
    else if (event.key === '0') this.reset();
    else if (event.key === 'Escape' && this.isZoomed()) this.reset();
    else if (event.key in panKeys && this.isZoomed()) {
      event.preventDefault();
      this.panBy(panKeys[event.key]);
    }
  }

  protected onPointerCancel(event: PointerEvent): void {
    this.releasePointer(event);
    this.tapCandidate = null;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.capturePointer(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.tapCandidate = { time: event.timeStamp, x: event.clientX, y: event.clientY };
      return;
    }

    this.tapCandidate = null;
    const [first, second] = [...this.pointers.values()];
    this.pinchStart = { distance: distance(first, second), scale: this.state().scale };
  }

  protected onPointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;

    const current = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, current);

    if (this.tapCandidate && distance(this.tapCandidate, current) > TAP_MAX_MOVEMENT_PX) {
      this.tapCandidate = null;
    }

    if (this.pointers.size === 2 && this.pinchStart) {
      const [first, second] = [...this.pointers.values()];
      const spread = distance(first, second) / this.pinchStart.distance;

      this.dragging.set(true);
      this.applyZoom(this.pinchStart.scale * spread, this.focalPoint(midpoint(first, second)));
    } else if (this.pointers.size === 1 && this.isZoomed()) {
      this.dragging.set(true);
      this.panBy({ x: current.x - previous.x, y: current.y - previous.y });
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const tap = this.tapCandidate;
    this.releasePointer(event);
    this.tapCandidate = null;

    if (!tap || event.timeStamp - tap.time > TAP_MAX_DURATION_MS) return;

    // With a mouse a single click toggles the zoom; double click is never needed.
    if (event.pointerType === 'mouse') {
      this.toggleZoom(this.focalPoint(tap));
      return;
    }

    const previousTap = this.lastTap;
    const isDoubleTap =
      previousTap !== null &&
      event.timeStamp - previousTap.time <= DOUBLE_TAP_MAX_GAP_MS &&
      distance(previousTap, tap) <= DOUBLE_TAP_MAX_DISTANCE_PX;

    if (isDoubleTap) {
      this.lastTap = null;
      this.toggleZoom(this.focalPoint(tap));
    } else {
      this.lastTap = { time: event.timeStamp, x: tap.x, y: tap.y };
    }
  }

  protected onWheel(event: WheelEvent): void {
    // A plain wheel keeps scrolling the page; Ctrl or Cmd (also sent by trackpad pinch) zooms.
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    const focal = this.focalPoint({ x: event.clientX, y: event.clientY });
    this.applyZoom(this.state().scale * Math.exp(-event.deltaY * WHEEL_SENSITIVITY), focal);
  }

  protected reset(): void {
    this.state.set(INITIAL_ZOOM);
  }

  protected zoomIn(): void {
    this.applyZoom(this.state().scale * ZOOM_STEP, { x: 0, y: 0 });
  }

  protected zoomOut(): void {
    this.applyZoom(this.state().scale / ZOOM_STEP, { x: 0, y: 0 });
  }

  private applyZoom(scale: number, focal: Point): void {
    const { content, stage } = this.geometry();

    this.state.set(zoomAt(this.state(), scale, focal, content, stage));
  }

  /** Keeps receiving moves when the pointer leaves the photo; the browser refuses ids it no longer tracks. */
  private capturePointer(pointerId: number): void {
    try {
      this.surface().nativeElement.setPointerCapture?.(pointerId);
    } catch {
      // The gesture still works without capture while the pointer stays over the photo.
    }
  }

  private focalPoint(point: Point): Point {
    const rect = this.surface().nativeElement.getBoundingClientRect();

    return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
  }

  private geometry(): { content: Size; stage: Size } {
    const rect = this.surface().nativeElement.getBoundingClientRect();
    const stage = { height: rect.height, width: rect.width };

    return { content: fittedSize(this.photo(), stage), stage };
  }

  private panBy(delta: Point): void {
    const { content, stage } = this.geometry();
    const { pan, scale } = this.state();
    const next = clampPan({ x: pan.x + delta.x, y: pan.y + delta.y }, scale, content, stage);

    this.state.set({ pan: next, scale });
  }

  private releasePointer(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.pinchStart = null;
    if (this.pointers.size === 0) this.dragging.set(false);
  }

  private toggleZoom(focal: Point): void {
    if (this.isZoomed()) this.reset();
    else this.applyZoom(DOUBLE_TAP_SCALE, focal);
  }
}
