/** Pure authoritative shot dispersion policy.
 * The caller supplies Session RNG rolls in exactly their original order.
 * This module never consumes RNG or mutates recoil, ammo or world geometry.
 */
import type {TeamActor} from './breach-game.ts';
import type {FiringMode} from './breach-ballistics.ts';
import {dispersion,handlingInstability} from './breach-ballistics.ts';
import {skillMultiplier} from './breach-skills.ts';
import {sightSpreadScale,type WeaponHandlingModifiers}
 from './equipment-weapon-handling.ts';
/** Long-range fire retains physical angular spread, with modest added
 * aiming uncertainty beyond each actual weapon's effective sweet spot.
 * No separate hit dice, invisible aim snapping or projectile cutoff.
 */
export function rangeSpreadScale(range:number,optimalRange:number):number{
 // The existing angular cone already gets less accurate with distance.
 // Extra stabilization cost begins beyond the 12 m CQB envelope only.
 const excess=Math.max(0,(range-Math.max(240,optimalRange))/Math.max(1,optimalRange));
 return 1+Math.min(.75,excess*.18);
}
export function shotDispersionCone(a:Pick<TeamActor,
 'weapon'|'stability'|'suppression'|'injuryStage'|'recoil'|'turning'|
 'velocity'|'skills'>,mode:FiringMode,range:number,moving:boolean,
 mods:WeaponHandlingModifiers,optimalRange:number):number{
 return (dispersion(a.weapon,mode,a.stability,moving,
   a.suppression,a.injuryStage,a.recoil)+
  handlingInstability(a.turning,a.velocity,a.recoil,a.stability))*
  (2-skillMultiplier(mode==='point'?a.skills.pointShooting:
    range>optimalRange?a.skills.longRange:a.skills.precision,.28))*
  sightSpreadScale(mods,mode,range)*
  rangeSpreadScale(range,optimalRange);
}
