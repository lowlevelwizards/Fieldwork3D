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
export function shotDispersionCone(a:Pick<TeamActor,
 'weapon'|'stability'|'suppression'|'injuryStage'|'recoil'|'turning'|
 'velocity'|'skills'>,mode:FiringMode,range:number,moving:boolean,
 mods:WeaponHandlingModifiers,optimalRange:number):number{
 return (dispersion(a.weapon,mode,a.stability,moving,
   a.suppression,a.injuryStage,a.recoil)+
  handlingInstability(a.turning,a.velocity,a.recoil,a.stability))*
  (2-skillMultiplier(mode==='point'?a.skills.pointShooting:
    range>optimalRange?a.skills.longRange:a.skills.precision,.28))*
  sightSpreadScale(mods,mode,range);
}
