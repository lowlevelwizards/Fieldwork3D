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
 // The wrist follows the operator's anatomical chest/heading, while
 // the physically rotated handgun points along the independent weaponYaw.
 // Rotating the wrist itself with the barrel displaced the shot origin
 // whenever LOOK/WATCH tracked an off-axis threat.
 const bodyX=Math.cos(p.heading)*grip.x-Math.sin(p.heading)*grip.z;
 const bodyZ=Math.sin(p.heading)*grip.x+Math.cos(p.heading)*grip.z;
 const muzzleForward=HELD_GLOCK_SCALE*
  (sockets.muzzle.x-sockets.holsterPivot.x);
 const muzzleRight=HELD_GLOCK_SCALE*
  (sockets.muzzle.z-sockets.holsterPivot.z);
 const yaw=p.weaponYaw;
 return {x:p.x+bodyX+Math.cos(yaw)*muzzleForward-
    Math.sin(yaw)*muzzleRight,
  z:p.z+bodyZ+Math.sin(yaw)*muzzleForward+
    Math.cos(yaw)*muzzleRight,
  y:26+legRestRise(p.velocity,p.posture??'stand')+
   grip.y+HELD_GLOCK_SCALE*(sockets.muzzle.y-sockets.holsterPivot.y)-
   (p.posture==='crouch'?8:0)-(p.coverStanceDrop??0),
  yaw,pitch:0};
}
