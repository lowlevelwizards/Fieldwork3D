/**
 * Build 004: one authoritative time-of-day value (hours, modulo 24).
 *
 * Environmental colors, light levels, and mist are deterministic functions
 * of that value. These are authored visual conditions, not simulated weather.
 */
export const HOURS_PER_DAY = 24;
export const DAY_LENGTH_SECONDS = 240;
export const INITIAL_HOUR = 5.25;

export type DayPhase =
  'night' | 'pre-dawn' | 'sunrise' | 'morning' |
  'midday' | 'afternoon' | 'sunset' | 'dusk';

type EnvironmentalKey = {
  hour: number;
  skyTop: number;
  skyMiddle: number;
  skyHorizon: number;
  skyBottom: number;
  sunlight: number;
  sunColor: number;
  fillColor: number;
  fillIntensity: number;
  groundFillColor: number;
  hazeColor: number;
  hazeDensity: number;
  mistColor: number;
  mistOpacity: number;
  shadowOpacity: number;
};

// Sparse, intentionally authored environmental reference points.
// The final 24:00 point exactly matches 00:00 for a continuous 24 h wrap.
const KEYS: readonly EnvironmentalKey[] = [
  { hour: 0,    skyTop:0x172333, skyMiddle:0x28374a, skyHorizon:0x465260, skyBottom:0x4d5860, sunlight:0,    sunColor:0xf6c78e, fillColor:0x8eacbb, fillIntensity:.24, groundFillColor:0x5c6680, hazeColor:0x475765, hazeDensity:.038, mistColor:0x71808b, mistOpacity:.17, shadowOpacity:0 },
  { hour: 4,    skyTop:0x1a2b3c, skyMiddle:0x344b60, skyHorizon:0x647884, skyBottom:0x6b7c84, sunlight:0,    sunColor:0xffcf9f, fillColor:0x99b6c6, fillIntensity:.29, groundFillColor:0x63748b, hazeColor:0x697d85, hazeDensity:.055, mistColor:0x9caeb1, mistOpacity:.27, shadowOpacity:0 },
  { hour: 5.5,  skyTop:0x52697f, skyMiddle:0x879ba9, skyHorizon:0xc9b7a9, skyBottom:0xc7c6b7, sunlight:0,    sunColor:0xffb77b, fillColor:0xa9c4cb, fillIntensity:.46, groundFillColor:0x80918a, hazeColor:0xadb5ae, hazeDensity:.070, mistColor:0xd4d9ce, mistOpacity:.40, shadowOpacity:0 },
  { hour: 6.3,  skyTop:0x7e9fb4, skyMiddle:0xb1bfc0, skyHorizon:0xeec3a4, skyBottom:0xe5d3b8, sunlight:.58,  sunColor:0xffa66e, fillColor:0xc4d6d0, fillIntensity:.68, groundFillColor:0x938c79, hazeColor:0xd8cabb, hazeDensity:.066, mistColor:0xece0cc, mistOpacity:.36, shadowOpacity:.14 },
  { hour: 7.75, skyTop:0x9ebfc8, skyMiddle:0xc5d5cf, skyHorizon:0xe3d9bb, skyBottom:0xe4ddc9, sunlight:1.35, sunColor:0xffd1a0, fillColor:0xcde1d7, fillIntensity:.85, groundFillColor:0x828e7b, hazeColor:0xd7dcd1, hazeDensity:.045, mistColor:0xe2e7d9, mistOpacity:.21, shadowOpacity:.24 },
  { hour: 10,   skyTop:0x9ebac5, skyMiddle:0xc2d3d1, skyHorizon:0xd6dacf, skyBottom:0xdde0d2, sunlight:2.0,  sunColor:0xffe6c9, fillColor:0xe0eee1, fillIntensity:1.05, groundFillColor:0x87947a, hazeColor:0xd1ddd3, hazeDensity:.027, mistColor:0xdce9dc, mistOpacity:.07, shadowOpacity:.28 },
  { hour: 12.5, skyTop:0xa7c4ce, skyMiddle:0xc9dad8, skyHorizon:0xdce2d7, skyBottom:0xe1e5d8, sunlight:2.25, sunColor:0xfff0d8, fillColor:0xe4f0e4, fillIntensity:1.13, groundFillColor:0x84927b, hazeColor:0xd3ddd3, hazeDensity:.021, mistColor:0xe4eadf, mistOpacity:.045, shadowOpacity:.30 },
  { hour: 15.6, skyTop:0x9fbcca, skyMiddle:0xc4d2d0, skyHorizon:0xe0d9c9, skyBottom:0xe6ded0, sunlight:1.95, sunColor:0xffe0b5, fillColor:0xe1e6d8, fillIntensity:1.02, groundFillColor:0x8b8e78, hazeColor:0xd7d8cc, hazeDensity:.026, mistColor:0xe4dfd2, mistOpacity:.09, shadowOpacity:.27 },
  { hour: 17.6, skyTop:0x8b9eae, skyMiddle:0xc1bdb5, skyHorizon:0xe8b18b, skyBottom:0xe2c1a0, sunlight:1.12, sunColor:0xffb079, fillColor:0xd8d6cb, fillIntensity:.79, groundFillColor:0x918275, hazeColor:0xd3bca8, hazeDensity:.037, mistColor:0xe5d0b5, mistOpacity:.17, shadowOpacity:.22 },
  { hour: 18.2, skyTop:0x647c97, skyMiddle:0xb29fa3, skyHorizon:0xeb987b, skyBottom:0xdbab90, sunlight:.48,  sunColor:0xff865f, fillColor:0xb8c2c3, fillIntensity:.62, groundFillColor:0x877b7b, hazeColor:0xbda6a0, hazeDensity:.044, mistColor:0xd8bdb0, mistOpacity:.23, shadowOpacity:.12 },
  { hour: 19,   skyTop:0x374b6b, skyMiddle:0x69768a, skyHorizon:0xb88b88, skyBottom:0xb09c92, sunlight:0,    sunColor:0xff956f, fillColor:0x9eb7cb, fillIntensity:.42, groundFillColor:0x737587, hazeColor:0x8e939b, hazeDensity:.051, mistColor:0xaeb5b5, mistOpacity:.30, shadowOpacity:0 },
  { hour: 20.5, skyTop:0x1e3045, skyMiddle:0x364c60, skyHorizon:0x667382, skyBottom:0x747c86, sunlight:0,    sunColor:0xfac9a4, fillColor:0x93afc1, fillIntensity:.28, groundFillColor:0x626e83, hazeColor:0x626f79, hazeDensity:.045, mistColor:0x8996a0, mistOpacity:.25, shadowOpacity:0 },
  { hour: 24,   skyTop:0x172333, skyMiddle:0x28374a, skyHorizon:0x465260, skyBottom:0x4d5860, sunlight:0,    sunColor:0xf6c78e, fillColor:0x8eacbb, fillIntensity:.24, groundFillColor:0x5c6680, hazeColor:0x475765, hazeDensity:.038, mistColor:0x71808b, mistOpacity:.17, shadowOpacity:0 },
];

export type EnvironmentState = Omit<EnvironmentalKey, 'hour'> & {
  hour: number;
  phase: DayPhase;
  sunDirection: { x: number; y: number; z: number };
};

export function wrapHour(hour: number): number {
  return ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
}

export function advanceHour(hour: number, elapsedSeconds: number, daySeconds = DAY_LENGTH_SECONDS): number {
  return wrapHour(hour + (Math.max(0, elapsedSeconds) / daySeconds) * HOURS_PER_DAY);
}

const scalar = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function blendColor(a: number, b: number, t: number): number {
  const aR = (a >>> 16) & 255, aG = (a >>> 8) & 255, aB = a & 255;
  const bR = (b >>> 16) & 255, bG = (b >>> 8) & 255, bB = b & 255;
  const r = Math.round(scalar(aR, bR, t));
  const g = Math.round(scalar(aG, bG, t));
  const blue = Math.round(scalar(aB, bB, t));
  return (r << 16) | (g << 8) | blue;
}

export function cssColor(rgb: number): string {
  return '#' + rgb.toString(16).padStart(6, '0');
}

export function phaseAtHour(hour: number): DayPhase {
  const h = wrapHour(hour);
  if (h < 4.8) return 'night';
  if (h < 6.15) return 'pre-dawn';
  if (h < 7.3) return 'sunrise';
  if (h < 10.5) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17.7) return 'afternoon';
  if (h < 19) return 'sunset';
  if (h < 20.5) return 'dusk';
  return 'night';
}

/** A continuous 24h arc; the light is OFF below the horizon. */
export function sunDirection(hour: number) {
  const angle = (wrapHour(hour) - 6) * Math.PI / 12;
  const altitude = Math.sin(angle) * (Math.PI / 2 - 0.23);
  const azimuth = (wrapHour(hour) / 24) * Math.PI * 2 - Math.PI / 4;
  return {
    x: Math.cos(azimuth) * Math.cos(altitude),
    y: Math.sin(altitude),
    z: Math.sin(azimuth) * Math.cos(altitude),
  };
}

/** Sample the entire environmental presentation from one time value. */
export function environmentAtHour(inputHour: number): EnvironmentState {
  const hour = wrapHour(inputHour);
  let index = KEYS.findIndex(key => key.hour > hour) - 1;
  if (index < 0) index = KEYS.length - 2;
  const a = KEYS[index];
  const b = KEYS[index + 1];
  const amount = smooth((hour - a.hour) / (b.hour - a.hour));
  const direction = sunDirection(hour);

  const color = (key: keyof Pick<EnvironmentalKey,
    'skyTop' | 'skyMiddle' | 'skyHorizon' | 'skyBottom' |
    'sunColor' | 'fillColor' | 'groundFillColor' |
    'hazeColor' | 'mistColor'>) => blendColor(a[key], b[key], amount);
  const number = (key: keyof Pick<EnvironmentalKey,
    'sunlight' | 'fillIntensity' | 'hazeDensity' |
    'mistOpacity' | 'shadowOpacity'>) => scalar(a[key], b[key], amount);
  const daylight = Math.max(0, Math.min(1, direction.y * 18));
  return {
    hour, phase: phaseAtHour(hour), sunDirection: direction,
    skyTop: color('skyTop'), skyMiddle: color('skyMiddle'),
    skyHorizon: color('skyHorizon'), skyBottom: color('skyBottom'),
    sunColor: color('sunColor'), sunlight: number('sunlight') * daylight,
    fillColor: color('fillColor'), fillIntensity: number('fillIntensity'),
    groundFillColor: color('groundFillColor'),
    hazeColor: color('hazeColor'), hazeDensity: number('hazeDensity'),
    mistColor: color('mistColor'), mistOpacity: number('mistOpacity'),
    shadowOpacity: number('shadowOpacity'),
  };
}

export function visibleLightFraction(distance: number, density = environmentAtHour(12).hazeDensity): number {
  const opticalDepth = Math.max(0, distance) * Math.max(0, density);
  return Math.exp(-opticalDepth * opticalDepth);
}

export function clockLabel(hour: number): string {
  const minuteOfDay = Math.floor(wrapHour(hour) * 60 + 0.5) % 1440;
  const h = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return h.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
}
