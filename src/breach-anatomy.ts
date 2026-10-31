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
export function stockPocket(mode:Handling):Anchor3{
  const y=mode==='ads'?7.5:mode==='high'?6.3:
    mode==='point'?5.4:mode==='ready'?4.5:
    mode==='short'?4.0:2.9;
  return {x:mode==='short'?-3.9:.7,y,z:4.3};
}
export function elbowCorridor(mode:Handling,side:-1|1):Anchor3{
  const tucked=mode==='short',raised=mode==='high'||mode==='ads';
  return {x:tucked?4:raised?6:5,y:tucked?-6:raised?-2.5:-4.7,
    z:side*(tucked?6.8:raised?9:8.4)};
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
