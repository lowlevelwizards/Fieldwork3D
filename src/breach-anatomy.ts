/** Operator-local anatomical references.
 * +X forward, +Y up, +Z firing-side shoulder. Values are in chest space.
 * Independent from visual mesh detail so all four firearms share contacts. */
import type {Handling} from './breach-weapon-pose.ts';
export type Anchor3={x:number;y:number;z:number};
export const ANATOMY={
  shoulderLeft:{x:1,y:4,z:-7},
  shoulderRight:{x:1,y:4,z:7},
  eyeRight:{x:5.0,y:12.7,z:3.0},
  headRest:{x:0,y:10,z:0},
  neutralHip:20.2,
} as const;
/** Buttplate contact is on the surface of the upper pectoral/shoulder,
 * not parked beside the arm. The visible stock is 3.5 units wide;
 * a modest overlap with the padded upper torso is intentional.
 * Short stock is a lower under-arm index, not an outboard shelf. */
export function stockPocket(mode:Handling):Anchor3{
  switch(mode){
    case 'high':return {x:1.3,y:5.6,z:7.55};
    case 'low':return {x:1.6,y:3.0,z:7.55};
    case 'ready':return {x:1.8,y:4.5,z:7.55};
    case 'short':return {x:-2.0,y:-2.0,z:8.05};
    case 'point':return {x:2.6,y:5.3,z:7.55};
    case 'ads':return {x:2.2,y:7.5,z:7.55};
  }
}
export function elbowCorridor(mode:Handling,side:-1|1):Anchor3{
  // Midway between the original flared arms and the over-tucked Build 167
  // elbows. Ribs are a preference, not a hard constraint: both wrists still
  // reach their grips through the same two-bone IK.
  const tuck=mode==='short'?.76:mode==='high'?.64:
    mode==='low'?.46:mode==='ready'?.48:
    mode==='point'?.35:.29;
  return {x:mode==='short'?3.1:5-tuck*.65,
    y:-7.7-1.35*tuck,z:side*(8.2-.7*tuck)};
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
