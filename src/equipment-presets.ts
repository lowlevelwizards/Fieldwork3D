/** Equipment 06: recipes, not owned inventory. No preset contains item
 * instance IDs, so copying one never duplicates a campaign weapon. */
import {readEquipmentLoadout,type EquipmentLoadout} from './equipment-loadouts.ts';
import type {WeaponId} from './breach-combat.ts';
export type EquipmentPreset={id:string;name:string;weapon:WeaponId;kit:EquipmentLoadout};
export const MAX_KIT_PRESETS=24;
const validWeapon=(x:unknown):x is WeaponId=>
 x==='carbine'||x==='smg'||x==='rifle'||x==='shotgun';
export function readKitPresets(raw:unknown):EquipmentPreset[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>();
 const result:EquipmentPreset[]=[];
 for(const input of raw.slice(0,MAX_KIT_PRESETS*2)){
  if(!input||typeof input!=='object')continue;
  const value=input as Partial<EquipmentPreset>;
  if(typeof value.id!=='string'||!/^kit-[a-z0-9-]{1,48}$/.test(value.id)||
    seen.has(value.id)||typeof value.name!=='string'||
    !value.name.trim()||!validWeapon(value.weapon))continue;
  seen.add(value.id);
  result.push({id:value.id,name:value.name.trim().slice(0,32),
   weapon:value.weapon,kit:readEquipmentLoadout(value.kit,value.weapon)});
  if(result.length>=MAX_KIT_PRESETS)break;
 }
 return result;
}
export function nextPresetId(existing:readonly EquipmentPreset[]){
 for(let i=1;i<=MAX_KIT_PRESETS+1;i++)
  if(!existing.some(x=>x.id==='kit-'+i))return 'kit-'+i;
 return null;
}
