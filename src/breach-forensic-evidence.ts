/** V4-4 display-only evidence selection shared by 2D and 3D.
 * Only damaging hits paint wounds. Armor-stopped hits are labeled as stops,
 * not burns, holes, or localized damage. Selection is chronological by shot.
 */
import type {ContactAfterAction,ReportShot} from './breach-after-action-report.ts';
import type {HitSide} from './breach-hit-anatomy.ts';
export type ForensicScope='selected'|'cumulative';
export type ForensicSlot='head'|'torso'|'arm-left'|'arm-right'|
  'leg-left'|'leg-right';
export type ForensicEvidence={
 displayed:readonly ReportShot[];
 damaged:readonly ReportShot[];
 armorStops:readonly ReportShot[];
 unknownLimb:readonly ReportShot[];
 slots:ReadonlyMap<ForensicSlot,readonly ReportShot[]>;
 activeShot:ReportShot|null;
 scope:ForensicScope;
};
export function forensicSlot(region:string|null,side:HitSide):ForensicSlot|null{
 if(region==='head'||region==='torso')return region;
 if((region==='arm'||region==='leg')&&
   (side==='left'||side==='right'))
   return `${region}-${side}` as ForensicSlot;
 return null;
}
export function inspectForensicEvidence(contact:ContactAfterAction,
 selectedShotId:number|null,scope:ForensicScope):ForensicEvidence{
 const ordered=contact.shots.slice().sort((a,b)=>a.at-b.at||a.id-b.id);
 const index=selectedShotId===null?-1:
   ordered.findIndex(shot=>shot.id===selectedShotId);
 const activeShot=index>=0?ordered[index]:ordered.at(-1)??null;
 const displayed:readonly ReportShot[]=scope==='selected'?
   (activeShot?[activeShot]:[]):
   (index>=0?ordered.slice(0,index+1):ordered);
 const damaged=displayed.filter(shot=>shot.outcome==='damaging'&&
   shot.region!==null);
 const armorStops=displayed.filter(shot=>shot.outcome==='armor-stopped');
 const unknownLimb=damaged.filter(shot=>
   (shot.region==='arm'||shot.region==='leg')&&
   shot.anatomy?.side!=='left'&&shot.anatomy?.side!=='right');
 const slots=new Map<ForensicSlot,ReportShot[]>();
 for(const shot of damaged){
   const slot=forensicSlot(shot.region,shot.anatomy?.side??'unknown');
   if(!slot)continue;
   const list=slots.get(slot)??[];
   list.push(shot);slots.set(slot,list);
 }
 return {displayed,damaged,armorStops,unknownLimb,slots,
   activeShot,scope};
}
