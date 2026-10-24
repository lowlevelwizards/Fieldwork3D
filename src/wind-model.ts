/**
 * Atom 013: shared periodic moving air. Units are metres / simulated hour.
 * The integral drives cloud positions; derivative drives rain slant.
 * One 24-hour closed weather loop preserves the established day scrub.
 */
export type Wind = { x: number; z: number; speed: number; gust: number };
const TAU = Math.PI * 2;
const h24 = (hour: number) => ((hour % 24) + 24) % 24;
export function windDriftAtHour(hour: number): { x: number; z: number } {
  const h = h24(hour);
  const theta = TAU * h / 24;
  return {
    x: 8 * h + .9 * Math.sin(theta) + .35 * Math.sin(3 * theta),
    z: 1.3 * (Math.sin(theta + .5) - Math.sin(.5))
       + .4 * (Math.sin(3 * theta - .8) - Math.sin(-.8)),
  };
}
export function windAtHour(hour: number): Wind {
  const theta = TAU * h24(hour) / 24;
  const angular = TAU / 24;
  const x = 8 + .9 * angular * Math.cos(theta)
      + 1.05 * angular * Math.cos(3 * theta);
  const z = 1.3 * angular * Math.cos(theta+.5)
      + 1.2 * angular * Math.cos(3*theta-.8);
  return { x, z, speed: Math.hypot(x,z), gust: Math.max(0, Math.sin(3*theta-.8)) };
}
