/** S6.2: pure authored two-hand sidearm silhouette targets.
 * Chest-local axes: +X forward, +Y up, +Z firing side.
 * No world mutation, shot-time clearance, random animation or second IK.
 * Both hands remain bounded inside the existing 10+10 arm reach budget.
 */
import type {Anchor3} from './breach-anatomy.ts';
export type SecondaryPoseTarget=Readonly<{
 weight:number;firing:Anchor3;support:Anchor3;
}>;
/** Authored pistol art-space offsets for Lab pose presentation only. */
export type LabPistolContacts=Readonly<{
 primaryFromPivot:Anchor3;
 supportOffset:Anchor3;
 slideOffset:Anchor3;
}>;
/** Compact, one-handed Lab retention. Both hands remain in front of the
 * torso, on their own anatomical sides. The support palm guards the left
 * chest rather than crossing over the gun; downward poles keep the elbows
 * hanging near the ribs instead of making a folded X across the vest.
 * Never passed to a live gameplay character.
 */
export const LAB_CLOSE_RETENTION=Object.freeze({
 firing:{x:8.05,y:-1.8,z:6.5},
 support:{x:7.05,y:1.0,z:-5.9},
 firingElbowPole:{x:7,y:-12,z:1},
 supportElbowPole:{x:7,y:-12,z:-1}
}) satisfies Readonly<{
 firing:Anchor3;support:Anchor3;
 firingElbowPole:Anchor3;supportElbowPole:Anchor3
}>;
const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const smooth=(t:number)=>{const x=clamp(t);return x*x*(3-2*x);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const blend=(a:Anchor3,b:Anchor3,t:number):Anchor3=>({
 x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)
});
const add=(a:Anchor3,b:Anchor3):Anchor3=>({
 x:a.x+b.x,y:a.y+b.y,z:a.z+b.z
});
/** Follow the pistol's rendered Z pitch for contact offsets, rather than
 * leaving the support palm horizontal while the weapon tilts. */
const pitched=(pt:Anchor3,pitch:number):Anchor3=>{
 const angle=Number.isFinite(pitch)?pitch:0;
 const c=Math.cos(angle),s=Math.sin(angle);
 return {x:pt.x*c-pt.y*s,y:pt.x*s+pt.y*c,z:pt.z};
};
/** At low readiness the pistol is held close to the sternum; ADS extends
 * both wrists together, not a rifle stock into the shoulder. Obstruction
 * draws to a downrange retention grip rather than forcing the muzzle into
 * a surface. Reload reaches from an existing left support hand to the
 * carried magazine's approximate belt/rig/pocket corridor and magwell.
 */
export function secondaryUpperBodyTargets(input:Readonly<{
 fraction:number;aim:number;moving:boolean;obstructed:boolean;
 reloadProgress?:number|null;
 /** Optional Lab-only distinction; normal tactical ready/ADS is unchanged. */
 stance?:'high'|'low'|'ready'|'retention';
 /** Lab-only transition toward the requested ready posture. */
 stanceBlend?:number;
 /** Lab-only model-specific G19/G26/M9 contacts. */
 labContacts?:LabPistolContacts;
 /** Lab-only empty-reload support hand animation. */
 labSlideRack?:Readonly<{weight:number;pull:number}>|null;
 /** Lab-only visible muzzle pitch for model-specific hand alignment. */
 labPitch?:number;
}>):SecondaryPoseTarget{
 const weight=smooth((clamp(input.fraction)-.08)/.78);
 const ads=smooth(input.aim)*(input.moving ? .88 : 1);
 // Live sidearms retain their established shot-authoritative arm targets.
 // Only explicit Lab stances get the enlarged and more legible geometry.
 const laboratory=input.stance!==undefined;
 const baseReady:Anchor3=laboratory?
  {x:10.0,y:.65,z:3.2}:{x:8.2,y:-3.0,z:3.3};
 const stanceReady:Anchor3=input.stance==='high'?
  // High ready stays elevated but clear of the chin and face.
  {x:11.8,y:3.65,z:3.1}:input.stance==='low'?
  // Low ready stays in front of the belt, not near the thigh.
  {x:10.0,y:-4.05,z:3.3}:baseReady;
 const ready=blend(baseReady,stanceReady,
  clamp(input.stanceBlend??1));
 const extended:Anchor3=laboratory?
  {x:17.4,y:6.1,z:2.55}:{x:13.4,y:-.25,z:2.0};
 const retention:Anchor3=laboratory?
  LAB_CLOSE_RETENTION.firing:{x:5.7,y:-5.7,z:4.9};
 const firing=input.obstructed||input.stance==='retention'?retention:
  blend(ready,extended,ads);
 const supportBase:Anchor3=laboratory?
  {x:9.4,y:.15,z:1.1}:{x:6.9,y:-3.7,z:.6};
 const supportStance:Anchor3=input.stance==='high'?
  {x:10.7,y:3.25,z:1.15}:input.stance==='low'?
  {x:9.4,y:-4.3,z:1.1}:supportBase;
 const supportReady=blend(supportBase,supportStance,
  clamp(input.stanceBlend??1));
 const supportAim:Anchor3=laboratory?
  {x:16.9,y:5.7,z:.85}:{x:12.0,y:-.75,z:.25};
 let support=input.obstructed||input.stance==='retention'?
  // Support palm retracts independently to guard the chest, not over the
  // firing hand in a cramped pseudo-rifle short-stock hold.
  (laboratory?LAB_CLOSE_RETENTION.support:{x:5.3,y:-5.8,z:1.5}):
  blend(supportReady,supportAim,ads);
 if(input.labContacts&&input.stance!=='retention'&&!input.obstructed)
  support=add(firing,pitched(input.labContacts.supportOffset,input.labPitch??0));
 if(input.reloadProgress!==undefined&&input.reloadProgress!==null){
  const p=clamp(input.reloadProgress);
  // Travel to real carrier direction, then present an already-owned mag
  // to the pistol. Model/pouch ownership remains a separate S8.3 stage.
  const from=support;
  const pouch:Anchor3={x:1.5,y:-8.1,z:-7.8};
  const magwell:Anchor3=input.labContacts?
   {x:firing.x-.25,y:firing.y-2.15,z:firing.z-.7}:
   {x:7.4,y:-5.1,z:.7};
  if(p<.28)support=blend(from,pouch,smooth(p/.28));
  else if(p<.67)support=blend(pouch,magwell,smooth((p-.28)/.39));
  else support=blend(magwell,from,smooth((p-.67)/.33));
  if(input.labContacts&&p>=.72)
   support=add(firing,pitched(input.labContacts.supportOffset,input.labPitch??0));
 }
 if(input.labContacts&&input.labSlideRack&&input.stance!=='retention'){
  // Rise to the real rear-slide point, pull rearward, release and regrip.
  const top=add(firing,pitched(input.labContacts.slideOffset,input.labPitch??0));
  top.x-=1.45*clamp(input.labSlideRack.pull);
  support=blend(support,top,clamp(input.labSlideRack.weight));
 }
 return {weight,firing,support};
}
