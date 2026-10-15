export interface Point {
  x: number;
  y: number;
}

export interface Size {
  height: number;
  width: number;
}

export interface ZoomState {
  pan: Point;
  scale: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Scale reached by a double tap or double click. */
export const DOUBLE_TAP_SCALE = 2.5;
/** Factor applied by the zoom buttons and the +/- keys. */
export const ZOOM_STEP = 1.5;

export const INITIAL_ZOOM: ZoomState = { pan: { x: 0, y: 0 }, scale: MIN_SCALE };

export function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/** Size of a photo shown with `object-fit: contain` inside the stage. */
export function fittedSize(photo: Size, stage: Size): Size {
  if (photo.width <= 0 || photo.height <= 0) return { height: 0, width: 0 };

  const fit = Math.min(stage.width / photo.width, stage.height / photo.height);

  return { height: photo.height * fit, width: photo.width * fit };
}

/** Keeps the photo from being dragged beyond its own edges; a photo smaller than the stage stays centred. */
export function clampPan(pan: Point, scale: number, content: Size, stage: Size): Point {
  const maxX = Math.max(0, (content.width * scale - stage.width) / 2);
  const maxY = Math.max(0, (content.height * scale - stage.height) / 2);

  // `+ 0` turns a negative zero into zero so equal pans compare as equal.
  return {
    x: Math.min(Math.max(pan.x, -maxX), maxX) + 0,
    y: Math.min(Math.max(pan.y, -maxY), maxY) + 0,
  };
}

/** Changes the scale while the point under `focal` (relative to the stage centre) stays put. */
export function zoomAt(
  state: ZoomState,
  nextScale: number,
  focal: Point,
  content: Size,
  stage: Size
): ZoomState {
  const scale = clampScale(nextScale);
  const ratio = scale / state.scale;
  const pan = clampPan(
    {
      x: focal.x - (focal.x - state.pan.x) * ratio,
      y: focal.y - (focal.y - state.pan.y) * ratio,
    },
    scale,
    content,
    stage
  );

  return { pan, scale };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
