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

/**
 * Only the presentation is feathered. Physical cell kinds, capacities and
 * infiltration rates still come from surfaceAt() without interpolation.
 * A small 3x3 spatial filter prevents ruler-straight paint borders.
 */
const smoothWeight = (a:number,b:number,x:number):number => {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
};
export function visualMaterialWeights(x:number,z:number):Record<SurfaceKind,number>{
  // Continuous visual geological transitions. The underlying categorical
  // surfaceAt() remains unchanged for soil and runoff calculations.
  const elevation=terrainHeight(x,z);
  const clay=1-smoothWeight(-.105,-.028,elevation);
  const sand=smoothWeight(1.07,2.28,x)*smoothWeight(-.30,1.20,z);
  const rock=Math.max(
    (1-smoothWeight(-3.4,-2.12,x))*smoothWeight(-.36,.82,z),
    smoothWeight(.041,.105,elevation),
  );
  const organic=smoothWeight(-1.36,-.22,x)*
    (1-smoothWeight(1.04,2.17,x))*smoothWeight(-1.54,-.20,z);
  // Preserve the categorical ordering of clay, sand, rock, organic, loam.
  let remaining=1;
  const weightedClay=remaining*clay; remaining-=weightedClay;
  const weightedSand=remaining*sand; remaining-=weightedSand;
  const weightedRock=remaining*rock; remaining-=weightedRock;
  const weightedOrganic=remaining*organic; remaining-=weightedOrganic;
  return {
    clay:weightedClay,sand:weightedSand,rock:weightedRock,
    organic:weightedOrganic,loam:Math.max(0,remaining),
  };
}
