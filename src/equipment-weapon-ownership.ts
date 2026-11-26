/** Build 27.01: reconcile unique issued guns and numbered armory stock.
 * Numeric counts remain the compatibility source for legacy Campaign saves.
 * No firearm assets are allocated by a renderer, replay or Quick Play.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import {newSerializedWeapon,readSerializedWeapons,readOwnedCatalogBody,MAX_OWNED_WEAPONS,
 type SerializedWeapon} from './equipment-weapon-identity.ts';
import {type WeaponFamilyBuild} from './equipment-weapon-families.ts';
const PLATFORMS=['carbine','smg','rifle','shotgun'] as const;
type WeaponId=CampaignOperator['weapon'];
const active=(o:CampaignOperator)=>o.status!=='retired'&&o.status!=='lost';
const stockCount=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>0?
 Math.min(MAX_OWNED_WEAPONS,n):0;
export function reconcileCampaignWeaponOwnership(c:CampaignState):CampaignState{
 const existing=readSerializedWeapons(c.inventory.serializedWeapons);
 const used=new Set<string>();
 // Existing active operators have first claim on their own matching serials.
 // Reserve those claims before assigning any operator without a valid preferred
 // gun; otherwise an earlier weapon swap can steal a later operator's gun.
 const reserved=new Map<string,string>();
 const claimed=new Set<string>();
 for(const operator of c.operators){
  if(!active(operator)||typeof operator.weaponSerialId!=='string')continue;
  const weapon=existing.find(w=>w.id===operator.weaponSerialId&&
   w.platform===operator.weapon&&!claimed.has(w.id));
  if(weapon){reserved.set(operator.id,weapon.id);claimed.add(weapon.id);}
 }
 const kept:SerializedWeapon[]=[];
 let sequence=0;
 const nextId=()=>{
  let id='';
  do{id=c.id.slice(0,50)+':weapon:'+sequence++;}
  while(used.has(id)||existing.some(w=>w.id===id));
  return id;
 };
 const take=(platform:WeaponId,preferred?:string|null,body?:WeaponFamilyBuild)=>{
  const match=existing.find(w=>w.platform===platform&&!used.has(w.id)&&
    w.id===preferred)??existing.find(w=>w.platform===platform&&!used.has(w.id)&&
    !claimed.has(w.id));
  const weapon=match??newSerializedWeapon(nextId(),platform,c.day,body);
  used.add(weapon.id);kept.push(body?{...weapon,catalogBody:readOwnedCatalogBody(body,platform)}:weapon);
  return weapon.id;
 };
 const operators=c.operators.map(o=>{
  if(!active(o))return {...o,weaponSerialId:null};
  return {...o,weaponSerialId:take(o.weapon,reserved.get(o.id),o.weaponConfiguration.build)};
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

/** Only issued bodies are mirrored here; unassigned objects keep their own
 * catalog data. This is a transition from class-count reconciliation to
 * individually identified armory stock, not another ownership ledger. */
export function synchronizeIssuedCatalogBodies(c:CampaignState):CampaignState{
 if(!c.inventory.serializedWeapons)return c;
 const bySerial=new Map(c.operators.filter(active).map(o=>[o.weaponSerialId,o]));
 let changed=false;
 const serials=c.inventory.serializedWeapons.map(w=>{
  const owner=bySerial.get(w.id);
  if(!owner||owner.weapon!==w.platform||!owner.weaponConfiguration.build)return w;
  const body=readOwnedCatalogBody(owner.weaponConfiguration.build,w.platform);
  if(JSON.stringify(body)===JSON.stringify(w.catalogBody))return w;
  changed=true;return {...w,catalogBody:body};
 });
 return changed?{...c,inventory:{...c.inventory,serializedWeapons:serials}}:c;
}

/** Exact named transaction helpers. The legacy stock map is a projection
 * of actual spare serials after the operation, not a quantity to reconcile. */
export function catalogOwnedStock(c:CampaignState){
 const reserved=new Set(c.operators.filter(o=>o.status!=='retired').map(o=>o.weaponSerialId));
 return (c.inventory.serializedWeapons??[]).filter(w=>!reserved.has(w.id));
}
export function nextCatalogWeaponSerial(c:CampaignState):string{
 const taken=new Set((c.inventory.serializedWeapons??[]).map(w=>w.id));
 for(const o of c.operators)if(o.weaponSerialId)taken.add(o.weaponSerialId);
 let n=0,id='';
 do{id=c.id.slice(0,50)+':weapon:'+n++;}while(taken.has(id));
 return id;
}
/** Preserve the historic stable array ordering for save round-trip parity.
 * No minting, reassignment, or discard of any existing serial. */
export function projectCatalogInventory(c:CampaignState):CampaignState{
 const all=c.inventory.serializedWeapons??[];
 const issued=c.operators.filter(active).flatMap(o=>{
  const w=all.find(x=>x.id===o.weaponSerialId);return w?[w]:[];
 });
 const assigned=new Set(issued.map(w=>w.id));
 const spare=catalogOwnedStock(c);
 const counts={carbine:0,smg:0,rifle:0,shotgun:0};
 for(const w of spare)counts[w.platform]++;
 const rest=all.filter(w=>!assigned.has(w.id));
 return {...c,inventory:{...c.inventory,weapons:counts,
  serializedWeapons:[...issued,...PLATFORMS.flatMap(p=>rest.filter(w=>w.platform===p))]}};
}
