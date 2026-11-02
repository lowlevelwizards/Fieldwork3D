/** Cosmetic equipment recipes for the Wardrobe Lab. These are never campaign
 * inventory transactions; loading a look cannot create owned equipment.
 */
import {readEquipmentLoadout,type EquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import type {WeaponId} from './breach-combat.ts';
export type WardrobeLook={
 id:string;name:string;kit:EquipmentLoadout;wardrobe:WardrobeOptions;
};
export const MAX_WARDROBE_LOOKS=24;
const validWeapon=(v:unknown):v is WeaponId=>
 v==='carbine'||v==='smg'||v==='rifle'||v==='shotgun';
const safeName=(s:string)=>s.trim().slice(0,44);
export function makeWardrobeLook(name:string,kit:EquipmentLoadout,
 wardrobe:WardrobeOptions,id?:string):WardrobeLook{
 const label=safeName(name)||'Untitled outfit';
 const identifier=id&&/^look-[a-z0-9-]{1,40}$/.test(id)?id:
  'look-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36);
 return {id:identifier||'look-untitled',name:label,
  kit:readEquipmentLoadout(kit,kit.slots.primary.slice(8) as WeaponId),
  wardrobe:readWardrobe(wardrobe)};
}
export function readWardrobeLook(raw:unknown):WardrobeLook|null{
 if(!raw||typeof raw!=='object')return null;
 const value=raw as Partial<WardrobeLook>&{weapon?:unknown};
 if(typeof value.id!=='string'||!/^look-[a-z0-9-]{1,40}$/.test(value.id)||
  typeof value.name!=='string'||!value.name.trim())return null;
 const source=value.kit;
 const primary=source&&typeof source==='object'?
  (source as EquipmentLoadout).slots?.primary:undefined;
 const weapon=typeof primary==='string'?primary.replace(/^primary-/,''):undefined;
 const safe=validWeapon(weapon)?weapon:validWeapon(value.weapon)?value.weapon:'carbine';
 return {id:value.id,name:safeName(value.name),
  kit:readEquipmentLoadout(value.kit,safe),
  wardrobe:readWardrobe(value.wardrobe)};
}
export function readWardrobeLooks(raw:unknown):WardrobeLook[]{
 if(!Array.isArray(raw))return [];
 const result:WardrobeLook[]=[];const seen=new Set<string>();
 for(const candidate of raw.slice(0,MAX_WARDROBE_LOOKS*3)){
  const look=readWardrobeLook(candidate);
  if(!look||seen.has(look.id))continue;
  seen.add(look.id);result.push(look);
  if(result.length>=MAX_WARDROBE_LOOKS)break;
 }
 return result;
}
export function exportWardrobeLook(look:WardrobeLook):string{
 const normalized=readWardrobeLook(look);
 if(!normalized)throw Error('Invalid outfit');
 return JSON.stringify({type:'fieldwork-wardrobe',version:1,look:normalized});
}
export function importWardrobeLook(json:string):WardrobeLook|null{
 if(typeof json!=='string'||json.length>16000)return null;
 try{
  const source=JSON.parse(json);
  if(!source||source.type!=='fieldwork-wardrobe'||source.version!==1)return null;
  return readWardrobeLook(source.look);
 }catch{return null;}
}
