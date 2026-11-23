/** S6.2: pure authored two-hand sidearm silhouette targets.
 * Chest-local axes: +X forward, +Y up, +Z firing side.
 * No world mutation, shot-time clearance, random animation or second IK.
 * Both hands remain bounded inside the existing 10+10 arm reach budget.
 */
import type {Anchor3} from './breach-anatomy.ts';
export type SecondaryPoseTarget=Readonly<{
 weight:number;firing:Anchor3;support:Anchor3;
}>;
const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const smooth=(t:number)=>{const x=clamp(t);return x*x*(3-2*x);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const blend=(a:Anchor3,b:Anchor3,t:number):Anchor3=>({
 x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)
});
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
}>):SecondaryPoseTarget{
 const weight=smooth((clamp(input.fraction)-.08)/.78);
 const ads=smooth(input.aim)*(input.moving ? .88 : 1);
 // Live sidearms retain their established shot-authoritative arm targets.
 // Only explicit Lab stances get the enlarged and more legible geometry.
 const laboratory=input.stance!==undefined;
 const baseReady:Anchor3=laboratory?
  {x:9.4,y:-1.4,z:3.5}:{x:8.2,y:-3.0,z:3.3};
 const stanceReady:Anchor3=input.stance==='high'?
  {x:6.8,y:4.0,z:3.5}:input.stance==='low'?
  {x:9.6,y:-8.0,z:3.7}:baseReady;
 const ready=blend(baseReady,stanceReady,
  clamp(input.stanceBlend??1));
 const extended:Anchor3=laboratory?
  {x:15.0,y:3.4,z:1.8}:{x:13.4,y:-.25,z:2.0};
 const retention:Anchor3={x:5.7,y:-5.7,z:4.9};
 const firing=input.obstructed||input.stance==='retention'?retention:
  blend(ready,extended,ads);
 const supportBase:Anchor3=laboratory?
  {x:8.0,y:-2.0,z:.6}:{x:6.9,y:-3.7,z:.6};
 const supportStance:Anchor3=input.stance==='high'?
  {x:6.1,y:3.3,z:1.0}:input.stance==='low'?
  {x:8.1,y:-8.5,z:.9}:supportBase;
 const supportReady=blend(supportBase,supportStance,
  clamp(input.stanceBlend??1));
 const supportAim:Anchor3=laboratory?
  {x:13.4,y:2.7,z:.1}:{x:12.0,y:-.75,z:.25};
 let support=input.obstructed||input.stance==='retention'?
  {x:5.3,y:-5.8,z:1.5}:blend(supportReady,supportAim,ads);
 if(input.reloadProgress!==undefined&&input.reloadProgress!==null){
  const p=clamp(input.reloadProgress);
  // Travel to real carrier direction, then present an already-owned mag
  // to the pistol. Model/pouch ownership remains a separate S8.3 stage.
  const from=support;
  const pouch:Anchor3={x:1.5,y:-8.1,z:-7.8};
  const magwell:Anchor3={x:7.4,y:-5.1,z:.7};
  if(p<.28)support=blend(from,pouch,smooth(p/.28));
  else if(p<.67)support=blend(pouch,magwell,smooth((p-.28)/.39));
  else support=blend(magwell,from,smooth((p-.67)/.33));
 }
 return {weight,firing,support};
}
