/** S8.2: fixed-step sidearm reload, backed by real issued magazine IDs.
 * No renderer, UI, event loop, or rifle reserve authority. Inventory changes
 * ONCE at timed insertion, not on authoring or beginning the animation.
 */
import {SECONDARY_CAPACITY,type SecondaryEquipment,type SecondaryMagazine}
 from './secondary-equipment.ts';
import {exchangeSecondaryMagazine}
 from './secondary-magazine-exchange.ts';

export type SecondaryTimedReload=Readonly<{
 orderId:number;selectedId:string;elapsed:number;duration:number;
 /** Retain partial magazine; emergency eject of an empty magazine is dropped. */
 retain:boolean;inserted:boolean;
}>;
export type SecondaryReloadStart=Readonly<{
 ok:boolean;state:SecondaryTimedReload|null;reason?:string
}>;
export type SecondaryReloadStep=Readonly<{
 ok:boolean;state:SecondaryTimedReload|null;equipment:SecondaryEquipment;
 dropped:SecondaryMagazine|null;insertedNow:boolean;done:boolean;reason?:string
}>;
const accessCost:Readonly<Record<'rig'|'belt'|'pocket'|'backpack',number>>={
 belt:0,rig:.12,pocket:.28,backpack:.95
};
export const SECONDARY_MAG_INSERT_FRACTION=.72;

/** Overflow is uncarried and never magically accessible during a mission.
 * Stable, physical location is a tie-break when equally loaded magazines
 * exist. The most loaded actual carried magazine wins first.
 */
export function selectAccessibleSecondaryMagazine(equipment:SecondaryEquipment):
 SecondaryMagazine|null{
 let choice:SecondaryMagazine|null=null;
 for(const m of equipment.spareMagazines){
  if(m.location==='overflow'||m.rounds<=equipment.loadedRounds)continue;
  if(!choice||m.rounds>choice.rounds||
   m.rounds===choice.rounds&&accessCost[m.location]<accessCost[choice.location as keyof typeof accessCost])
   choice=m;
 }
 return choice;
}
export function beginTimedSecondaryReload(equipment:SecondaryEquipment|undefined,
 orderId:number):SecondaryReloadStart{
 if(!equipment?.weapon||!equipment.loadedMagazineId)
  return {ok:false,state:null,reason:'NO ISSUED SECONDARY'};
 if(!Number.isSafeInteger(orderId)||orderId<0)
  return {ok:false,state:null,reason:'INVALID RELOAD ORDER'};
 const cap=SECONDARY_CAPACITY[equipment.weapon];
 if(equipment.loadedRounds>=cap)
  return {ok:false,state:null,reason:'MAGAZINE FULL'};
 const spare=selectAccessibleSecondaryMagazine(equipment);
 if(!spare)
  return {ok:false,state:null,reason:'NO ACCESSIBLE LOADED MAGAZINE'};
 return {ok:true,state:{
  orderId,selectedId:spare.id,elapsed:0,
  duration:1.20+accessCost[spare.location as keyof typeof accessCost],
  retain:equipment.loadedRounds>0,inserted:false
 }};
}
export function advanceTimedSecondaryReload(equipment:SecondaryEquipment,
 state:SecondaryTimedReload,dt:number):SecondaryReloadStep{
 const fail=(reason:string):SecondaryReloadStep=>({
  ok:false,state:null,equipment,dropped:null,
  insertedNow:false,done:true,reason});
 if(!equipment.weapon||!equipment.loadedMagazineId)
  return fail('SECONDARY REMOVED');
 if(!Number.isFinite(state.duration)||state.duration<=0||
  !Number.isFinite(state.elapsed)||state.elapsed<0)
  return fail('INVALID RELOAD STATE');
 const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.2)):0;
 const elapsed=Math.min(state.duration,state.elapsed+step);
 let next=equipment,inserted=state.inserted,dropped:SecondaryMagazine|null=null;
 let insertedNow=false;
 if(!inserted&&elapsed>=state.duration*SECONDARY_MAG_INSERT_FRACTION){
  const incoming=equipment.spareMagazines.find(m=>m.id===state.selectedId);
  if(!incoming||incoming.location==='overflow')
   return fail('SELECTED MAGAZINE NOT CARRIED');
  const exchange=exchangeSecondaryMagazine(equipment,state.selectedId,state.retain);
  if(!exchange.ok)return fail(exchange.reason??'MAGAZINE EXCHANGE FAILED');
  next=exchange.equipment;
  dropped=exchange.dropped;
  inserted=true;insertedNow=true;
 }
 const done=elapsed>=state.duration;
 return {ok:true,equipment:next,dropped,insertedNow,done,
  state:done?null:{...state,elapsed,inserted}};
}
