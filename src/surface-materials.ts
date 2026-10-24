/**
 * Atom 014 — authored spatial surface materials, all on the same one-piece
 * terrain. Hydrology uses their actual water holding capacity and infiltration.
 * Units: storage mm of water, infiltration/evaporation mm per simulated hour.
 */
import { CELL_AREA, terrainHeight } from './terrain-model.ts';

export type SurfaceKind = 'loam' | 'clay' | 'sand' | 'rock' | 'organic';
export type SurfaceProperties = {
  kind: SurfaceKind;
  capacityMm: number;
  intakeMmPerHour: number;
  evaporationMultiplier: number;
  dryColor: number;
  wetColor: number;
};
export const SURFACE: Record<SurfaceKind, SurfaceProperties> = {
  loam: { kind:'loam',capacityMm:48,intakeMmPerHour:18,evaporationMultiplier:1,
          dryColor:0x7c9072,wetColor:0x3d6257 },
  clay: { kind:'clay',capacityMm:74,intakeMmPerHour:3.4,evaporationMultiplier:.65,
          dryColor:0x888574,wetColor:0x61594d },
  sand: { kind:'sand',capacityMm:32,intakeMmPerHour:44,evaporationMultiplier:1.30,
          dryColor:0xb1a184,wetColor:0x847b62 },
  rock: { kind:'rock',capacityMm:5,intakeMmPerHour:1.1,evaporationMultiplier:.65,
          dryColor:0x7b817b,wetColor:0x555f61 },
  organic: { kind:'organic',capacityMm:90,intakeMmPerHour:27,evaporationMultiplier:.81,
          dryColor:0x617c60,wetColor:0x304d42 },
};
export function surfaceAt(x: number, z: number): SurfaceProperties {
  const height = terrainHeight(x,z);
  if (height < -.061) return SURFACE.clay;
  if (x > 1.7 && z > .3) return SURFACE.sand;
  if (x < -2.7 && z > .15 || height > .068) return SURFACE.rock;
  if (x > -.8 && x < 1.65 && z > -.9) return SURFACE.organic;
  return SURFACE.loam;
}
export function soilCapacityLiters(x: number,z: number): number {
  return SURFACE[surfaceAt(x,z).kind].capacityMm * CELL_AREA;
}
export function infiltrationBudgetLiters(x:number,z:number,hours:number):number {
  return surfaceAt(x,z).intakeMmPerHour * CELL_AREA * Math.max(0,hours);
}
