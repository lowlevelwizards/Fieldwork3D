/**
 * Atom 012 — actual transfer of liquid to atmospheric vapour, not a colour
 * fade. Sun warms water, clouds shade it, wind transports moist air.
 * Rates are authored first-order approximations, not a climate solver.
 */
import { environmentAtHour } from './environment-conditions.ts';
import { windAtHour } from './wind-model.ts';
const clamp01 = (v:number)=>Math.min(1,Math.max(0,v));
export function evaporationMmPerHour(hour:number,cloudCover:number):number {
  const e=environmentAtHour(hour);
  const directSun=clamp01(e.sunlight/2.25)*(1-.62*clamp01(cloudCover));
  const wind=windAtHour(hour).speed;
  // Daytime sunshine dominates; night has only slow ambient drying.
  return (.045 + 1.25 * directSun) * (1 + Math.min(.45,wind/25));
}
