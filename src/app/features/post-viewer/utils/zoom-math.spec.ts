import {
  clampPan,
  clampScale,
  distance,
  fittedSize,
  INITIAL_ZOOM,
  MAX_SCALE,
  midpoint,
  MIN_SCALE,
  zoomAt,
} from './zoom-math';

describe('zoom math', () => {
  const stage = { height: 600, width: 400 };
  const landscape = { height: 200, width: 400 };

  describe('clampScale', () => {
    it('should keep the scale between the minimum and the maximum', () => {
      expect(clampScale(0.2)).toBe(MIN_SCALE);
      expect(clampScale(2)).toBe(2);
      expect(clampScale(99)).toBe(MAX_SCALE);
    });
  });

  describe('fittedSize', () => {
    it('should fit a landscape photo to the width of the stage', () => {
      expect(fittedSize({ height: 1000, width: 2000 }, stage)).toEqual({ height: 200, width: 400 });
    });

    it('should fit a portrait photo to the height of the stage', () => {
      expect(fittedSize({ height: 2000, width: 1000 }, stage)).toEqual({ height: 600, width: 300 });
    });

    it('should return an empty size for a photo without dimensions', () => {
      expect(fittedSize({ height: 0, width: 0 }, stage)).toEqual({ height: 0, width: 0 });
    });
  });

  describe('clampPan', () => {
    it('should not allow any pan while the photo is not larger than the stage', () => {
      expect(clampPan({ x: 80, y: -80 }, 1, landscape, stage)).toEqual({ x: 0, y: 0 });
    });

    it('should allow only as much pan as the photo overflows the stage on each axis', () => {
      // At 2x the landscape photo is 800 x 400: it overflows horizontally by 400, not vertically.
      expect(clampPan({ x: 999, y: 999 }, 2, landscape, stage)).toEqual({ x: 200, y: 0 });
      expect(clampPan({ x: -999, y: -999 }, 2, landscape, stage)).toEqual({ x: -200, y: 0 });
    });

    it('should keep a pan that is already inside the bounds', () => {
      expect(clampPan({ x: 50, y: 0 }, 2, landscape, stage)).toEqual({ x: 50, y: 0 });
    });
  });

  describe('zoomAt', () => {
    it('should keep the point under the focal position fixed while zooming', () => {
      const focal = { x: 100, y: 0 };
      const zoomed = zoomAt(INITIAL_ZOOM, 2, focal, landscape, stage);

      // Content point under the focal before: (100 - 0) / 1; after: (100 - pan.x) / 2.
      expect((focal.x - zoomed.pan.x) / zoomed.scale).toBeCloseTo(100);
      expect(zoomed.scale).toBe(2);
    });

    it('should return to the centred position when zooming back to the minimum', () => {
      const zoomed = zoomAt(INITIAL_ZOOM, 3, { x: 100, y: 0 }, landscape, stage);

      expect(zoomAt(zoomed, 1, { x: 100, y: 0 }, landscape, stage)).toEqual(INITIAL_ZOOM);
    });

    it('should never zoom past the maximum or keep a pan outside the photo', () => {
      const zoomed = zoomAt(INITIAL_ZOOM, 50, { x: 190, y: 0 }, landscape, stage);

      expect(zoomed.scale).toBe(MAX_SCALE);
      expect(Math.abs(zoomed.pan.x)).toBeLessThanOrEqual((landscape.width * MAX_SCALE - 400) / 2);
    });
  });

  describe('distance and midpoint', () => {
    it('should measure the distance between two points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should find the point halfway between two points', () => {
      expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    });
  });
});
