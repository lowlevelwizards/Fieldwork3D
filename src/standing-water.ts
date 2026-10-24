/**
 * Build 007 — standing water in a handful of small, fixed low spots.
 * This is REAL accumulated state, not a rendering effect sampled from
 * the time-of-day palette. Rain adds volume; no drying, flow or absorption.
 *
 * Physical water volumes are in litres, lengths in metres, rates in
 * millimetres per simulated hour. When a small display footprint fills,
 * its quantity is still retained; overflow routing is a future atom.
 */
import { CLOUD_COUNT, cloudAt, cloudCoverAtHour, cloudPresence } from './cloud-model.ts';
import { rainIntensityAtHour } from './rain-model.ts';
import { wrapHour } from './environment-conditions.ts';

export type Basin = {
  x: number; z: number;
  radiusX: number; radiusZ: number;
  catchmentArea: number;
  shapeLiters: number;
  phase: number;
};
export const BASINS: readonly Basin[] = [
  { x:-3.22,z:-2.40,radiusX:.88,radiusZ:.56,catchmentArea:6.5,shapeLiters:20,phase:.3 },
  { x:-.94,z:-3.25,radiusX:.63,radiusZ:.93,catchmentArea:5.4,shapeLiters:19,phase:1.8 },
  { x:2.48,z:-2.20,radiusX:1.08,radiusZ:.66,catchmentArea:7.1,shapeLiters:24,phase:2.7 },
  { x:3.15,z:.65,radiusX:.73,radiusZ:1.00,catchmentArea:6.3,shapeLiters:23,phase:3.5 },
  { x:.52,z:1.85,radiusX:1.04,radiusZ:.84,catchmentArea:7.8,shapeLiters:28,phase:1.2 },
  { x:-3.10,z:2.36,radiusX:.87,radiusZ:.75,catchmentArea:6.7,shapeLiters:22,phase:2.2 },
  { x:1.13,z:3.42,radiusX:.80,radiusZ:.62,catchmentArea:5.5,shapeLiters:18,phase:4.5 },
  { x:-.62,z:-.10,radiusX:.80,radiusZ:.68,catchmentArea:6.2,shapeLiters:21,phase:5.4 },
  { x:-1.72,z:1.13,radiusX:.61,radiusZ:.83,catchmentArea:5.5,shapeLiters:19,phase:4.1 },
];

/** Rainfall rate at peak intensity; the basin samples actual passing clouds. */
export const PEAK_RAIN_MM_PER_HOUR = 28;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function localRainExposure(
  basin: Basin, worldHour: number, cloudCover: number,
): number {
  let exposure = 0;
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = cloudAt(i, worldHour);
    const presence = cloudPresence(cloudCover, cloud.rank);
    if (presence <= 0) continue;
    const dx = (basin.x - cloud.x) / (2.0 * cloud.scale);
    const dz = (basin.z - cloud.z) / (1.65 * cloud.scale);
    exposure += Math.max(0, 1 - dx * dx - dz * dz) * presence;
  }
  return clamp01(exposure);
}

export function surfaceFraction(volumeLiters: number, basin: Basin): number {
  // More volume grows surface area; reaching one fills its current footprint.
  return clamp01(Math.max(0, volumeLiters) / basin.shapeLiters);
}

export type WaterSnapshot = { volumesLiters: number[]; totalLiters: number };

export class StandingWater {
  private readonly volumes = BASINS.map(() => 0);

  constructor(saved?: unknown) {
    if (Array.isArray(saved) && saved.length === BASINS.length &&
      saved.every(value => typeof value === 'number' &&
        Number.isFinite(value) && value >= 0 && value < 1e8)) {
      for(let i=0;i<saved.length;i++) this.volumes[i] = saved[i] as number;
    }
  }

  /**
   * Step forward in actual elapsed SIMULATED world-hours. Scrubbing a clock
   * without advancing it does not magically add or remove physical water.
   * No value is subtracted from the stored water quantity.
   */
  advance(hour: number, elapsedWorldHours: number, overrideCover: number | null): number {
    if (!Number.isFinite(elapsedWorldHours) || elapsedWorldHours <= 0) return 0;
    const steps = Math.max(1, Math.ceil(elapsedWorldHours / .04));
    const dt = elapsedWorldHours / steps;
    let deposited = 0;
    for (let s=0;s<steps;s++) {
      const t = wrapHour(hour + (s + .5) * dt);
      const cover = overrideCover === null ? cloudCoverAtHour(t) : clamp01(overrideCover);
      const intensity = rainIntensityAtHour(t, cover, overrideCover !== null);
      if (intensity <= 0) continue;
      const rainfallMetres = (PEAK_RAIN_MM_PER_HOUR / 1000) * intensity * dt;
      for (let i=0;i<BASINS.length;i++) {
        const exposure = localRainExposure(BASINS[i], t, cover);
        const litres = rainfallMetres * BASINS[i].catchmentArea * 1000 * exposure;
        if (litres <= 0) continue;
        this.volumes[i] += litres;
        deposited += litres;
      }
    }
    return deposited;
  }

  volumeAt(index: number): number { return this.volumes[index] ?? 0; }
  totalLiters(): number { return this.volumes.reduce((a,b) => a+b, 0); }
  snapshot(): WaterSnapshot {
    return { volumesLiters: [...this.volumes], totalLiters: this.totalLiters() };
  }
  clear(): void { this.volumes.fill(0); }
}
