/** Equipment 09: coarse, deterministic anatomically covered protection.
 * Hit location currently follows the existing deterministic wound-region model;
 * more precise bullet/armor intersection can replace it later. */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WoundRegion} from './breach-wounds.ts';
export type ArmorIntegrity={torso:number;head:number};
export type ArmorImpact=ArmorIntegrity & {severity:number;covered:boolean;blocked:boolean};
export function initialArmorIntegrity(kit?:EquipmentLoadout):ArmorIntegrity{
 return {torso:kit?.slots.armor==='armor-carrier'?8:
  kit?.slots.armor==='armor-soft'?5:0,
  head:kit?.slots.head==='head-helmet'?5:0};
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
/** incomingYaw is the *travel direction* of the bullet toward the target.
 * Plate carriers cover front and rear, not lateral torso. Soft vests provide
 * weaker, wider coverage. The helmet only covers simulated head hits.
 */
export function resolveArmorImpact(input:{
 kit?:EquipmentLoadout;region:WoundRegion;incomingYaw:number;
 targetHeading:number;penetration:number;severity:number;
 shotId:number;torso:number;head:number;
}):ArmorImpact{
 const {kit,region,incomingYaw,targetHeading,shotId}=input;
 const rawSeverity=clamp(Math.floor(input.severity),0,3);
 const torso=clamp(Math.floor(input.torso),0,8);
 const head=clamp(Math.floor(input.head),0,5);
 const unprotected={torso,head,severity:rawSeverity,covered:false,blocked:false};
 if(rawSeverity===0||!kit)return unprotected;
 const armor=kit.slots.armor,helmet=kit.slots.head;
 const forward=Math.cos(incomingYaw+Math.PI-targetHeading);
 const plateArc=Math.abs(forward)>.62;
 const torsoCovered=region==='torso'&&torso>0&&
  (armor==='armor-soft'||(armor==='armor-carrier'&&plateArc));
 const headCovered=region==='head'&&head>0&&helmet==='head-helmet';
 if(!torsoCovered&&!headCovered)return unprotected;
 const pen=clamp(input.penetration,0,1);
 const chance=headCovered?.62-pen*.36:
  armor==='armor-carrier'?.76-pen*.58:.36-pen*.28;
 const hash=(Math.imul((shotId+1)>>>0,0x9e3779b1)>>>0)/4294967296;
 const blocked=hash<clamp(chance,.05,.9);
 // A blocked severe hit may still inflict a lesser wound; this is not
 // a second health pool and does not guarantee immunity.
 const severity=blocked?Math.max(0,rawSeverity-1):rawSeverity;
 return {torso:torsoCovered?Math.max(0,torso-1):torso,
  head:headCovered?Math.max(0,head-1):head,severity,
  covered:true,blocked};
}
