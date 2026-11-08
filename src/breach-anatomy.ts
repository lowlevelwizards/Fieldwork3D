/** Operator-local anatomical references.
 * +X forward, +Y up, +Z firing-side shoulder. Values are in chest space. */
import type {Handling} from './breach-weapon-pose.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {LEG_HIP_HEIGHT,LEG_REST_RISE} from './breach-leg-geometry.ts';
import {HANDLING_PROFILES,type HandlingProfile}
  from './breach-handling-profiles.ts';
export type Anchor3={x:number;y:number;z:number};
export const ANATOMY={
  shoulderLeft:{x:1,y:4,z:-7},
  shoulderRight:{x:1,y:4,z:7},
  eyeRight:{x:5.0,y:12.7,z:3.0},
  headRest:{x:0,y:10,z:0},
  neutralHip:LEG_HIP_HEIGHT+LEG_REST_RISE,
} as const;
/** Shared stock seat on the FRONT surface of the upper chest (X≈5),
 * just inside the firing shoulder. Armor increases forward stand-off,
 * not lateral distance. The old near-Z=10 short-stock underarm socket
 * detached the butt from the body and drove elbows behind the shoulder.
 * Shot-time muzzle and visible weapon use identical physical seats. */
export const equipmentStockPush=(equipment?:EquipmentLoadout):number=>
  equipment?.slots.armor==='armor-carrier'?.90:
  equipment?.slots.armor==='armor-soft'?.43:0;
export function stockPocket(mode:Handling,forwardPush=0):Anchor3{
 const xPush=Math.max(0,Math.min(1.25,forwardPush));
  switch(mode){
    case 'high':return {x:4.75+xPush,y:5.30,z:6.65};
    case 'low':return {x:4.65+xPush,y:3.15,z:6.65};
    case 'ready':return {x:4.85+xPush,y:4.45,z:6.65};
    // Fold the firearm down against the same front upper-torso contour.
    case 'short':return {x:4.35+xPush,y:3.55,z:6.80};
    case 'point':return {x:5.05+xPush,y:5.20,z:6.70};
    case 'ads':return {x:5.10+xPush,y:5.65,z:6.75};
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
  // A short outward/back adjustment, never the old wide underarm wing.
  if(mode==='short'&&side===1)
    return {x:4.3,y:-2.65,z:8.45+(flare-.74)*.35};
  return {x:5-tuck*.55+(side===-1?.15:0),
    y:-7.5-1.2*tuck,z:side*(8.0-.55*tuck+flare)};
}
/** Soft anatomical preference shared by dynamic and fallback IK.
 * Hard armor, hand contacts and bone lengths always remain authoritative. */
export function anatomicalElbowCost(shoulder:Anchor3,elbow:Anchor3,
 _wrist:Anchor3,side:-1|1,outboardFiring=false):number{
 const outward=side*(elbow.z-shoulder.z);
 const forward=elbow.x-shoulder.x;
 const drop=shoulder.y-elbow.y;
 const shortGap=outboardFiring&&side===1?
   Math.max(0,1.0-(elbow.z-shoulder.z)):0;
 return Math.max(0,-outward-.8)*1.05+
   Math.max(0,outward-5.8)*.65+
   Math.max(0,-forward-1.4)*.65+
   Math.max(0,forward-9.5)*.22+
   Math.max(0,.65-drop)*1.45+
   Math.max(0,drop-10)*.32+
   shortGap*1.75;
}
/** Forward/down carry corridor. Zero means an acceptable elbow; a wrist
 * that cannot be solved here reports a constraint failure rather than
 * being solved with a winging, backward limb. */
export function carryElbowViolation(shoulder:Anchor3,elbow:Anchor3,
 side:-1|1):number{
 const rear=Math.max(0,shoulder.x-elbow.x-.45);
 const raised=Math.max(0,elbow.y-shoulder.y+.15);
 const flare=side*(elbow.z-shoulder.z);
 const wing=Math.max(0,flare-6.0);
 const cross=Math.max(0,-flare-.6);
 return rear+raised+wing+cross;
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
