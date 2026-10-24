// Pure geometry: no renderer or game dependencies.
// Fixed isometric elevation, with yaw as the only rotation input.
export const ISOMETRIC_ELEVATION = Math.atan(1 / Math.SQRT2);
export const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 2.5;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function cameraOffset(yaw: number, distance: number) {
  return {
    x: Math.sin(yaw) * Math.cos(ISOMETRIC_ELEVATION) * distance,
    y: Math.sin(ISOMETRIC_ELEVATION) * distance,
    z: Math.cos(yaw) * Math.cos(ISOMETRIC_ELEVATION) * distance,
  };
}

/** Enough room for the 10 m square slab at default zoom, in either orientation. */
export function viewSize(width: number, height: number, zoom: number) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const vertical = Math.max(12, 16.5 / aspect) / clampZoom(zoom);
  return { width: vertical * aspect, height: vertical };
}
