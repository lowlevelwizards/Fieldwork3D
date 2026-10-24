/**
 * Ground Zero environmental facts. Static on purpose: not weather, a clock,
 * or a simulation of air. A light source + depth attenuation + visual mist.
 */
export const DAYLIGHT = Object.freeze({
  direction: Object.freeze({ x: -6, y: 14, z: 10 }),
  color: 0xffe2bc,
  intensity: 2.25,
  skyFillColor: 0xe3f0e8,
  groundFillColor: 0x68725f,
  skyFillIntensity: 1.12,
});

export const ATMOSPHERE = Object.freeze({
  hazeColor: 0xd3dad1,
  hazeDensity: 0.026,
  mistColor: 0xd8e2d9,
  groundMistOpacity: 0.14,
});

/** Optical depth approximation used by Three.js exponential-squared fog. */
export function visibleLightFraction(distance: number): number {
  const depth = Math.max(0, distance) * ATMOSPHERE.hazeDensity;
  return Math.exp(-depth * depth);
}
