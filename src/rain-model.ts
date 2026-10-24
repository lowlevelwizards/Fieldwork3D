/**
 * Build 006: precipitation is a causal consequence of dense cloud cover
 * plus authored, variable-length moisture-front windows.
 * Everything is reproducible from world hour and the cloud-cover setting.
 */
import { cloudCoverAtHour } from './cloud-model';
import { wrapHour } from './environment-conditions';

export type RainPhase = 'dry' | 'drizzle' | 'rain' | 'downpour';
export type RainState = {
  amount: number;
  phase: RainPhase;
  wetness: number;
  cover: number;
  front: number;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type RainWindow = { start: number; peak: number; end: number; strength: number };
/** Distinct onset, peak, and trailing-off times (in world hours). */
export const RAIN_WINDOWS: readonly RainWindow[] = [
  { start: 1.5, peak: 2.35, end: 3.15, strength: .65 },
  { start: 4.35, peak: 6.15, end: 8.5, strength: 1 },
  { start: 17.05, peak: 18.65, end: 20.35, strength: .90 },
  { start: 21.45, peak: 22.35, end: 23.55, strength: .55 },
];

function windowStrength(hour: number, event: RainWindow): number {
  const h = wrapHour(hour);
  if (h <= event.start || h >= event.end) return 0;
  if (h < event.peak) return smoothstep(event.start, event.peak, h) * event.strength;
  return (1 - smoothstep(event.peak, event.end, h)) * event.strength;
}

export function rainFrontAtHour(hour: number): number {
  return RAIN_WINDOWS.reduce((max, event) => Math.max(max, windowStrength(hour, event)), 0);
}

export function rainIntensityAtHour(
  hour: number,
  cover: number,
  manualCoverage = false,
): number {
  // 60%-ish cloud cover can drizzle; 95%+ supports a downpour.
  const moisture = smoothstep(.57, .97, clamp01(cover));
  if (moisture === 0) return 0;

  // Natural rainfall comes in showers with different intensity and duration.
  // In the inspector, dense manually requested clouds always yield observable
  // rain, while gentle periodic variation prevents a mechanical constant sheet.
  const front = rainFrontAtHour(hour);
  const variation = .91 + .09 * Math.cos(wrapHour(hour) * Math.PI / 2);
  const driver = manualCoverage
    ? .83 + .13 * front
    : .08 + .92 * front;
  return clamp01(moisture * driver * variation);
}

export function rainPhase(intensity: number): RainPhase {
  if (intensity < .015) return 'dry';
  if (intensity < .25) return 'drizzle';
  if (intensity < .65) return 'rain';
  return 'downpour';
}

/**
 * Reversible damp ground response: recent rain darkens the grass and gradually
 * dries. A history sample makes time scrubbing deterministic (no extra clock).
 */
export function groundWetnessAtHour(hour: number, override: number | null = null): number {
  let accumulated = 0;
  let weights = 0;
  for (let i = 0; i < 28; i++) {
    const historyHour = hour - i * .1; // previous 2.7 world hours
    const cover = override ?? cloudCoverAtHour(historyHour);
    const rain = rainIntensityAtHour(historyHour, cover, override !== null);
    const weight = Math.exp(-i * .105);
    accumulated += rain * weight;
    weights += weight;
  }
  return clamp01(accumulated / weights * 1.45);
}

export function rainAtHour(hour: number, cover: number, manualCoverage = false): RainState {
  const amount = rainIntensityAtHour(hour, cover, manualCoverage);
  return {
    amount,
    phase: rainPhase(amount),
    wetness: groundWetnessAtHour(hour, manualCoverage ? cover : null),
    cover,
    front: rainFrontAtHour(hour),
  };
}
