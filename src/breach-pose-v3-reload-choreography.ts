/** V3 reload presentation choreography. Pure, deterministic and preview-only.
 *
 * Weapon contacts and magazine mount remain authoritative. The support hand
 * can travel OUTSIDE soft side gear during free reach/return and magazine
 * transport, without inventing a different magazine socket.
 *
 * All coordinates are current chest-local. Changes are *zero* at socket
 * boundaries and at both reload endpoints. No stored motion state.
 */
import * as THREE from 'three';
import type {ReloadMode} from './breach-magazines.ts';
import type {WeaponFit} from './breach-weapon-pose.ts';
import {reloadHandChestTarget} from './breach-reload-motion.ts';

export type ReloadChoreographyRequest={
 fit:WeaponFit;lengthScale:number;progress:number;mode:ReloadMode;
 supportX:number;supportY:number;primaryX:number;
 magazineSocket?:{x:number;y:number};
 /** Fitted near-side front armor surface, cached with equipment. */
 clearanceFront?:number;
};
export type ReloadChoreographyResult={
 target:THREE.Vector3;
 /** Hand interaction target, NOT a new support grip for the weapon. */
 fraction:number;
 segment:'release'|'mount'|'transport'|'return'|'grip';
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const bump=(t:number,start:number,end:number)=>{
 if(t<=start||t>=end)return 0;
 return Math.sin(Math.PI*clamp((t-start)/(end-start)))**2;
};
export function choreographV3ReloadHand(
 input:ReloadChoreographyRequest
):ReloadChoreographyResult{
 const t=clamp(input.progress);
 const base=reloadHandChestTarget({...input,progress:t});
 // Short free-hand detour around the near shoulder of the carrier.
 // This vanishes at .20 when fingers first meet the real magazine mount.
 const release=bump(t,0,.20);
 // During magazine transport, move the hand and held magazine together.
 // It is ZERO at .32 and .75 to preserve attachment/insertion keyframes.
 const transport=input.mode==='shells'?0:bump(t,.32,.75);
 // After the magazine is seated, return along the same outboard corridor.
 const recovery=bump(t,.90,1);
 // The top of the rigid torso is beside the upper-arm root, so favor a
 // modest forward-and-outboard path instead of pulling through its center.
 // Negative Z is the support-hand side in the canonical operator rig.
 const offset=release+recovery+transport*.72;
 const target=base.clone().add(new THREE.Vector3(
  2.1*offset,0,-2.65*offset));
 if(transport>0){
  // Magazine stays in the hand while being carried. Route the entire
  // hand+magazine outside the front of the rigid torso/carrier, not through
  // the unbendable chest core. Only the TRANSIT interval is modified.
  // Smooth squared-sine weighting returns exactly to the authentic
  // magazine mount at the end of each insertion/removal phase.
  const safeX=(input.clearanceFront??7.5)+1.25;
  const safeZ=-7.5;
  target.x+=Math.max(0,safeX-target.x)*transport;
  target.z-=Math.max(0,target.z-safeZ)*transport;
 }
 return {
  target,
  fraction:offset,
  segment:t===0||t===1?'grip':
   t<.20?'release':t<.32?'mount':
   t<.75?'transport':t<.90?'mount':'return'
 };
}
