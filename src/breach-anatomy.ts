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
/** These are externally reachable buttplate contacts, NOT the receiver or
 * stock midpoint. The chest is 14 wide (+/-7 Z), with a 3.5-deep stock.
 * The buttplate remains lateral to the torso rather than inside it. */
export function stockPocket(mode:Handling):Anchor3{
  switch(mode){
    case 'high':return {x:1.4,y:5.9,z:8.6};
    case 'low':return {x:1.6,y:2.8,z:8.6};
    case 'ready':return {x:1.8,y:4.6,z:8.6};
    case 'short':return {x:-2.9,y:-2.6,z:10.0};
    case 'point':return {x:2.7,y:5.5,z:8.6};
    case 'ads':return {x:2.3,y:7.7,z:8.6};
  }
}
export function elbowCorridor(mode:Handling,side:-1|1):Anchor3{
  // A bent arm's preferred elbow stays below the shoulder and inside its
  // outer contour. High-ready / short-stock strongly tuck towards the ribs.
  const tuck=mode==='short'?1:mode==='high'?.88:
    mode==='low'?.68:mode==='ready'?.68:
    mode==='point'?.48:.38;
  return {x:mode==='short'?2.8:4.8-tuck,
    y:-8.1-1.7*tuck,z:side*(7.9-1.25*tuck)};
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
