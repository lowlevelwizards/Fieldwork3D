// Exact 3:4 isometric elevation: projected x, y and z axes have equal scale.
export const ISOMETRIC_ELEVATION = Math.atan(1 / Math.SQRT2);
export const ISOMETRIC_YAW = Math.PI / 4;

export type Axis = { x: number; y: number };
export type GroundDirection = { x: number; z: number };

export function stickAxis(deltaX: number, deltaY: number, radius = 54, deadzone = 0.11): Axis {
  const length = Math.hypot(deltaX, deltaY);
  if (length < radius * deadzone) return { x: 0, y: 0 };
  const clamped = Math.min(1, length / radius);
  const strength = (clamped - deadzone) / (1 - deadzone);
  return { x: (deltaX / length) * strength, y: -(deltaY / length) * strength };
}

// Screen-right and screen-up projected onto flat terrain. Rotating the camera
// never changes the meaning of pushing the left stick toward the top of the screen.
export function screenToGround(axis: Axis, yaw: number): GroundDirection {
  return {
    x: axis.x * Math.cos(yaw) - axis.y * Math.sin(yaw),
    z: -axis.x * Math.sin(yaw) - axis.y * Math.cos(yaw),
  };
}

export function maxViewHeight(aspect: number): number {
  // Never allow a wide display to zoom so far out that most of its width is fog.
  return Math.max(19, Math.min(57, 78 / Math.max(1, aspect)));
}

export function initialViewHeight(aspect: number): number {
  return Math.min(maxViewHeight(aspect), aspect >= 1.3 ? 27 : 36);
}

export function stickZone(x: number, y: number, width: number, height: number): 'left' | 'right' | null {
  if (y < height * 0.42) return null;
  return x < width * 0.5 ? 'left' : 'right';
}

export function canStartIndependentSticks(
  a: { x: number; y: number }, b: { x: number; y: number },
  width: number, height: number,
): boolean {
  const zoneA = stickZone(a.x, a.y, width, height);
  const zoneB = stickZone(b.x, b.y, width, height);
  if (!zoneA || !zoneB || zoneA === zoneB) return false;
  // Fingers close together at the center are a pinch/twist, not two controls.
  return Math.hypot(a.x - b.x, a.y - b.y) >= Math.min(180, width * 0.37);
}

/** Aiming does not arm at the deadzone; releasing the right thumb stops shots. */
export function isFireIntent(axis: Axis, threshold=0.27) {
  return Math.hypot(axis.x,axis.y)>threshold;
}
