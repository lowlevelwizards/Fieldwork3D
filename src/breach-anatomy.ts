/** Operator-local anatomical references.
 * +X forward, +Y up, +Z firing-side shoulder. Values are in chest space. */
import type {Handling} from './breach-weapon-pose.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
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
/** The stock rests on the *outside* padded firing shoulder, ahead of the
 * bare mannequin's upper-pec surface. This gives fitted armor/rigs front
 * clearance without driving the butt through the center of the torso.
 * Shot-time muzzle geometry and the live model call this same authority.
 * Short-stock releases the shoulder contact and tucks to the right underarm. */
/** A deterministic forward seat behind the shoulder/upper vest.
 * Armor changes the physical stock socket, NOT only the cosmetic model.
 * Shot-time muzzle and rendering both sample this exact scalar.
 */
export const equipmentStockPush=(equipment?:EquipmentLoadout):number=>
  equipment?.slots.armor==='armor-carrier'?.90:
  equipment?.slots.armor==='armor-soft'?.43:0;
export function stockPocket(mode:Handling,forwardPush=0):Anchor3{
 const xPush=Math.max(0,Math.min(1.25,forwardPush));
  switch(mode){
    case 'high':return {x:2.65+xPush,y:5.45,z:7.83};
    case 'low':return {x:2.85+xPush,y:3.0,z:7.85};
    case 'ready':return {x:3.10+xPush,y:4.5,z:7.87};
    // Short-stock: tuck the butt under the firing arm, OUTSIDE the right
    // shoulder rather than centering the receiver against the sternum.
    // +Z is the firing/right side in the legacy anatomical frame.
    // The exact same rigid fit feeds live presentation and shot-time muzzle.
    case 'short':return {x:-.90+xPush*.45,y:-2.2,z:10.35};
    case 'point':return {x:3.75+xPush,y:5.35,z:7.95};
    case 'ads':return {x:3.62+xPush,y:5.92,z:8.04};
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
  // Short-stocking holds the firing elbow outside the receiver, not
  // trapped between stock, trigger hand and the vest. This is a POLE
  // preference; the IK/clearance solver still enforces the real contacts.
  if(mode==='short'&&side===1)
    return {x:4.45,y:-4.6,z:13.0+(flare-1.10)};
  return {x:5-tuck*.55+(side===-1?.15:0),
    y:-7.5-1.2*tuck,z:side*(8.0-.55*tuck+flare)};
}
export function anchorGap(a:Anchor3,b:Anchor3){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
