/** S7.1 authoritative, deterministic pistol muzzle built from the SAME
 * Glock artwork socket and S6.2 two-hand pose as the actual held model.
 * Actor local +X is forward, +Z is firing-side. Never reads 3D scene.
 * Only fully selected issued pistols can reach the shared shot resolver.
 */
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import {glockArtSockets} from './weapons/geometry/glock-family-silhouettes.ts';
import {secondaryUpperBodyTargets} from './secondary-upper-body-pose.ts';
import {legRestRise} from './breach-leg-geometry.ts';
import type {MuzzleSample} from './breach-muzzle.ts';
export const HELD_GLOCK_SCALE=.37; // The physically issued S4 cradle scale.
export type SecondaryMuzzleInput=Readonly<{
 x:number;z:number;heading:number;weaponYaw:number;
 aim:number;velocity:number;posture?:'stand'|'crouch';
 coverStanceDrop?:number;weapon:GlockAppearanceId;
}>;
export function secondaryMuzzleAtShot(p:SecondaryMuzzleInput):MuzzleSample{
 const grip=secondaryUpperBodyTargets({fraction:1,aim:p.aim,
  moving:p.velocity>3,obstructed:false}).firing;
 const sockets=glockArtSockets(p.weapon);
 const forward=grip.x+HELD_GLOCK_SCALE*
  (sockets.muzzle.x-sockets.holsterPivot.x);
 const right=grip.z+HELD_GLOCK_SCALE*
  (sockets.muzzle.z-sockets.holsterPivot.z);
 const yaw=p.weaponYaw;
 return {x:p.x+Math.cos(yaw)*forward-Math.sin(yaw)*right,
  z:p.z+Math.sin(yaw)*forward+Math.cos(yaw)*right,
  y:26+legRestRise(p.velocity,p.posture??'stand')+
   grip.y+HELD_GLOCK_SCALE*(sockets.muzzle.y-sockets.holsterPivot.y)-
   (p.posture==='crouch'?8:0)-(p.coverStanceDrop??0),
  yaw,pitch:0};
}
