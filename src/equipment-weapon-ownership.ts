/** Build 27.01: reconcile unique issued guns and numbered armory stock.
 * Numeric counts remain the compatibility source for legacy Campaign saves.
 * No firearm assets are allocated by a renderer, replay or Quick Play.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import {newSerializedWeapon,readSerializedWeapons,MAX_OWNED_WEAPONS,
 type SerializedWeapon} from './equipment-weapon-identity.ts';
const PLATFORMS=['carbine','smg','rifle','shotgun'] as const;
type WeaponId=CampaignOperator['weapon'];
const active=(o:CampaignOperator)=>o.status!=='retired'&&o.status!=='lost';
const stockCount=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>0?
 Math.min(MAX_OWNED_WEAPONS,n):0;
export function reconcileCampaignWeaponOwnership(c:CampaignState):CampaignState{
 const existing=readSerializedWeapons(c.inventory.serializedWeapons);
 const used=new Set<string>();
 const kept:SerializedWeapon[]=[];
 let sequence=0;
 const nextId=()=>{
  let id='';
  do{id=c.id.slice(0,50)+':weapon:'+sequence++;}
  while(used.has(id)||existing.some(w=>w.id===id));
  return id;
 };
 const take=(platform:WeaponId,preferred?:string|null)=>{
  const match=existing.find(w=>w.platform===platform&&!used.has(w.id)&&
    w.id===preferred)??existing.find(w=>w.platform===platform&&!used.has(w.id));
  const weapon=match??newSerializedWeapon(nextId(),platform,c.day);
  used.add(weapon.id);kept.push(weapon);
  return weapon.id;
 };
 const operators=c.operators.map(o=>{
  if(!active(o))return {...o,weaponSerialId:null};
  return {...o,weaponSerialId:take(o.weapon,o.weaponSerialId)};
 });
 const counts={carbine:0,smg:0,rifle:0,shotgun:0};
 for(const platform of PLATFORMS){
  const remaining=Math.max(0,MAX_OWNED_WEAPONS-kept.length);
  const count=Math.min(stockCount(c.inventory.weapons[platform]),remaining);
  for(let i=0;i<count;i++)take(platform);
  counts[platform]=count;
 }
 return {...c,operators,inventory:{...c.inventory,
  weapons:counts,serializedWeapons:kept}};
}
/** Check the invariants without editing a Campaign. */
export function weaponOwnershipIssues(c:CampaignState):string[]{
 const issues:string[]=[];
 const weapons=readSerializedWeapons(c.inventory.serializedWeapons);
 const assigned=new Set<string>();
 for(const o of c.operators.filter(active)){
  const w=weapons.find(w=>w.id===o.weaponSerialId);
  if(!w||w.platform!==o.weapon)issues.push('missing:'+o.id);
  if(o.weaponSerialId&&assigned.has(o.weaponSerialId))issues.push('duplicate:'+o.id);
  if(o.weaponSerialId)assigned.add(o.weaponSerialId);
 }
 for(const platform of PLATFORMS){
  const stocked=weapons.filter(w=>w.platform===platform&&!assigned.has(w.id)).length;
  if(stocked!==stockCount(c.inventory.weapons[platform]))
   issues.push('stock:'+platform);
 }
 return issues;
}
