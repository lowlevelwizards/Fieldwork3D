/** Operator-local anatomical references.
 * +X forward, +Y up, +Z firing-side shoulder. Values are in chest space. */
import type {Handling} from './breach-weapon-pose.ts';
import {HANDLING_PROFILES,type HandlingProfile}
  from './breach-handling-profiles.ts';
export type Anchor3={x:number;y:number;z:number};
export const ANATOMY={
  shoulderLeft:{x:1,y:4,z:-7},
  shoulderRight:{x:1,y:4,z:7},
  eyeRight:{x:5.0,y:12.7,z:3.0},
  headRest:{x:0,y:10,z:0},
  neutralHip:20.2,
} as const;
/** Real buttplate is seated in the padded upper-pec/shoulder contour,
 * rather than parked outside the shoulder. Geometry spans +/-7 laterally.
 * Short-stock remains lower under the arm with a little extra clearance. */
export function stockPocket(mode:Handling):Anchor3{
  switch(mode){
    case 'high':return {x:1.15,y:5.6,z:6.61};
    case 'low':return {x:1.48,y:3.0,z:6.64};
    case 'ready':return {x:1.62,y:4.5,z:6.61};
    case 'short':return {x:-2.15,y:-2.0,z:6.93};
    case 'point':return {x:2.44,y:5.3,z:6.61};
    case 'ads':return {x:2.07,y:7.5,z:6.60};
  }
}
/** Target for a two-bone elbow. The rig converts this anatomical point to a
 * shoulder-relative bend direction. Mirrored arms intentionally differ:
 * support reaches forward, firing arm gets a little more outward clearance.
 * The profile supplied by the rig may be mid-transition. */
export function elbowCorridor(mode:Handling,side:-1|1,
  profile:Pick<HandlingProfile,'elbowTuck'|'supportElbowFlare'|
    'firingElbowFlare'>=HANDLING_PROFILES[mode]):Anchor3{
  const tuck=Math.max(0,Math.min(1,profile.elbowTuck));
  const flare=side===-1?profile.supportElbowFlare:
    profile.firingElbowFlare;
  return {x:(mode==='short'?3.1:5-tuck*.55)+(side===-1?.15:0),
    y:-7.5-1.2*tuck,z:side*(8.0-.55*tuck+flare)};
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
