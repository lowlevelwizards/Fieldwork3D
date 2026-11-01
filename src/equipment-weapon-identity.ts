/** Build 27.00: finite, deterministic, campaign-only identity and wear ledger.
 * A weapon is an owned serialized object, not an operator loadout slot or an
 * attachment configuration. No runtime weapon handling changes in this stage.
 */
import type {WeaponId} from './breach-combat.ts';
export type WeaponServiceKind='acquired'|'issued'|'fired'|'serviced'|'retired';
export type WeaponServiceEntry={id:string;day:number;kind:WeaponServiceKind;
 operatorId?:string;operationId?:string;rounds?:number};
export type SerializedWeapon={id:string;platform:WeaponId;condition:number;
 roundsFired:number;acquiredDay:number;lastServiceDay:number|null;
 history:WeaponServiceEntry[]};
export const MAX_WEAPON_HISTORY=24;
export const MAX_OWNED_WEAPONS=128;
const PLATFORMS:readonly WeaponId[]=['carbine','smg','rifle','shotgun'];
const clampInt=(n:unknown,max:number,def=0)=>
 typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):def;
const safeId=(x:unknown):x is string=>
 typeof x==='string'&&x.length>=1&&x.length<=96&&/^[a-zA-Z0-9:_./-]+$/.test(x);
const isPlatform=(x:unknown):x is WeaponId=>
 typeof x==='string'&&PLATFORMS.includes(x as WeaponId);
const isKind=(x:unknown):x is WeaponServiceKind=>
 x==='acquired'||x==='issued'||x==='fired'||x==='serviced'||x==='retired';
export function newSerializedWeapon(id:string,platform:WeaponId,day=0):SerializedWeapon{
 if(!safeId(id)||!isPlatform(platform))throw new Error('Invalid serialized weapon identity');
 const acquiredDay=clampInt(day,1000000);
 return {id,platform,condition:100,roundsFired:0,acquiredDay,
  lastServiceDay:null,history:[{id:id+':acquired:'+acquiredDay,
   day:acquiredDay,kind:'acquired'}]};
}
const add=(w:SerializedWeapon,event:WeaponServiceEntry):SerializedWeapon=>({
 ...w,history:[...w.history,event].slice(-MAX_WEAPON_HISTORY)});
/** Wear is a whole-round counter, never computed from interpolated animations.
 * 1 point of condition per 75 actual shots (not shots that merely hit).
 */
export function recordWeaponRounds(w:SerializedWeapon,rounds:number,day:number,
 operationId?:string):SerializedWeapon{
 const delta=clampInt(rounds,100000);
 if(delta===0)return w;
 const next=Math.min(1000000,w.roundsFired+delta);
 const actual=next-w.roundsFired;
 if(actual===0)return w;
 const wear=Math.floor(next/75)-Math.floor(w.roundsFired/75);
 const updated={...w,roundsFired:next,condition:Math.max(0,w.condition-wear)};
 return add(updated,{id:w.id+':fired:'+next,
  day:clampInt(day,1000000),kind:'fired',rounds:actual,
  ...(operationId?{operationId:operationId.slice(0,96)}:{})});
}
/** Workshop servicing is explicit and capped; field reloads never repair. */
export function serviceSerializedWeapon(w:SerializedWeapon,day:number,
 restored:number):SerializedWeapon{
 const points=clampInt(restored,100);
 if(points===0||w.condition===100)return w;
 const next=Math.min(100,w.condition+points);
 const at=clampInt(day,1000000);
 return add({...w,condition:next,lastServiceDay:at},
  {id:w.id+':serviced:'+at+':'+w.history.length,day:at,kind:'serviced'});
}
/** Save migration boundary: discard malformed, duplicated or excessive entries.
 * Never mint extra weapon assets or recover lost inventory from corrupt data.
 */
export function readSerializedWeapons(raw:unknown):SerializedWeapon[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>();const result:SerializedWeapon[]=[];
 for(const v of raw.slice(0,MAX_OWNED_WEAPONS)){
  if(!v||typeof v!=='object')continue;
  const item=v as Partial<SerializedWeapon>;
  if(!safeId(item.id)||seen.has(item.id)||!isPlatform(item.platform))continue;
  seen.add(item.id);
  const history:WeaponServiceEntry[]=[];
  const used=new Set<string>();
  for(const h of (Array.isArray(item.history)?item.history:[]).slice(-MAX_WEAPON_HISTORY)){
   if(!h||!safeId(h.id)||used.has(h.id)||!isKind(h.kind))continue;
   used.add(h.id);
   history.push({id:h.id,day:clampInt(h.day,1000000),kind:h.kind,
    ...(safeId(h.operatorId)?{operatorId:h.operatorId}:{}),
    ...(safeId(h.operationId)?{operationId:h.operationId}:{}),
    ...(typeof h.rounds==='number'&&h.kind==='fired'?{
      rounds:clampInt(h.rounds,100000)}:{})});
  }
  result.push({id:item.id,platform:item.platform,
   condition:clampInt(item.condition,100,100),
   roundsFired:clampInt(item.roundsFired,1000000),
   acquiredDay:clampInt(item.acquiredDay,1000000),
   lastServiceDay:typeof item.lastServiceDay==='number'?
    clampInt(item.lastServiceDay,1000000):null,
   history});
 }
 return result;
}
