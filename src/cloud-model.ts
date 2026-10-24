/**
 * Build 005 — Clouds. Deterministic cloud cover and wind drift sampled
 * from the existing clock. No independently ticking weather simulation.
 */
export const CLOUD_COUNT = 18;
export const REGION_HALF_WIDTH = 5;
export const CLOUD_TRAVEL_SPAN = 32;
export const CLOUD_HEIGHT = 3.7;

export type CloudPoint = { x: number; z: number };
export type CloudSample = {
  x: number;
  z: number;
  y: number;
  scale: number;
  rank: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => { const v = clamp01(t); return v * v * (3 - 2 * v); };
const mod = (a: number, b: number) => ((a % b) + b) % b;
const hash = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export function cloudCoverAtHour(hour: number): number {
  const h = mod(hour, 24);
  const keys = [
    [0, .48], [4, .66], [6, .76], [9, .52], [12.5, .30],
    [16, .42], [19, .70], [22, .56], [24, .48],
  ];
  let segment = 0;
  while (segment < keys.length - 2 && h >= keys[segment + 1][0]) segment++;
  const a = keys[segment], b = keys[segment + 1];
  const t = smooth((h - a[0]) / (b[0] - a[0]));
  return a[1] + (b[1] - a[1]) * t;
}

/** Group-level coverage fade avoids abruptly spawning and deleting clouds. */
export function cloudPresence(coverage: number, rank: number): number {
  return smooth((clamp01(coverage) - rank + .13) / .26);
}

/**
 * The 32-metre travel loop lies beyond the visible [-5,5] region,
 * so wrapping positions is invisible. All wind speeds complete integer
 * cycles over 24 hours; midnight has no jump.
 */
export function cloudAt(index: number, hour: number): CloudSample {
  const fast = index % 3 === 0;
  const velocity = fast ? 16 : 8; // world metres per simulated hour
  return {
    x: -16 + mod(hash(index * 7 + 1) * CLOUD_TRAVEL_SPAN + hour * velocity, CLOUD_TRAVEL_SPAN),
    z: -4.45 + hash(index * 7 + 2) * 8.9 +
      .25 * Math.sin((hour / 8) * Math.PI * 2 + index * .7),
    y: CLOUD_HEIGHT + (index % 4) * .15,
    scale: .78 + hash(index * 7 + 3) * .78,
    rank: .04 + hash(index * 7 + 4) * .91,
  };
}

export function cloudShadowAt(
  cloud: CloudSample,
  sunDirection: { x: number; y: number; z: number },
): CloudPoint {
  const altitude = Math.max(.22, sunDirection.y);
  // Light comes FROM the sun; its ground shadow falls AWAY from it.
  return {
    x: cloud.x - sunDirection.x * cloud.y / altitude,
    z: cloud.z - sunDirection.z * cloud.y / altitude,
  };
}

export function cloudShadowStrength(
  sunlight: number, sunElevation: number, presence: number,
): number {
  const elevationFade = smooth((sunElevation - .16) / .35);
  return Math.min(.24, Math.max(0, sunlight) * .10) *
    elevationFade * clamp01(presence);
}
