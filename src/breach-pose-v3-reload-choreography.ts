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
 /** Only modular rifle previews opt into a family-specific magazine approach. */
 family?:'ar'|'ak'|'hk';
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
 // A real magazine presents a different entry geometry for each family.
 // Keep the existing socket/keyframe authoritative at .20/.30/.32/.75/.82:
 // these small *free* approach arcs are zero at every attachment boundary.
 // In particular, the AK support hand approaches the front lug before the
 // rock-in; AR/HK detachable magazines take a straighter upward approach.
 // These are presentation-only, not new simulation magazine positions.
 if(input.magazineSocket&&input.mode!=='shells'&&input.family){
  const family=input.family;
  const releaseApproach=bump(t,.12,.20);
  const withdrawal=bump(t,.32,.47);
  const insertApproach=bump(t,.75,.82);
  const ak=family==='ak';
  const delta=new THREE.Vector3(
    ak?1.05*releaseApproach+1.15*withdrawal+
      1.35*insertApproach:
      .25*releaseApproach+.35*withdrawal+.22*insertApproach,
    ak?-.40*releaseApproach-.70*withdrawal-
      .95*insertApproach:
      -.24*releaseApproach-.55*withdrawal-.65*insertApproach,
    ak?-1.0*releaseApproach-1.15*withdrawal-
      1.15*insertApproach:
      -.30*releaseApproach-.55*withdrawal-.45*insertApproach
  );
  delta.x*=input.lengthScale;
  target.add(delta.applyEuler(input.fit.rotation));
 }
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

/** Magazine presentation only: AK front-lug engagement then a short rock-in.
 * The cloned magazine rotates around its actual feed-lip/hand origin, never
 * around the receiver. Socket contact and weapon assembly stay untouched.
 * No rotation on mounted/reacquired frames or on shell-loading weapons.
 */
export function v3MagazineRockAngle(progress:number,mode:ReloadMode,
 family?:'ar'|'ak'|'hk'):number{
 if(mode==='shells'||family!=='ak')return 0;
 const t=clamp(progress);
 // Mount must be bit-exact neutral, not a tiny trig residual.
 if(t<=.61||t>=.82)return 0;
 const rise=Math.sin(Math.PI*.5*clamp((t-.61)/.14))**2;
 const fall=Math.cos(Math.PI*.5*clamp((t-.75)/.07))**2;
 return .14*rise*fall;
}
