/** Operator Studio outfit presets are appearance-only snapshots.
 * They NEVER store or restore equipment ownership, ammunition, or kit.
 * Validation follows the same WardrobeOptions v1 migration as live saves. */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe,resolvedWardrobe,WARDROBE_SLOTS,
 type WardrobeOptions} from './operator-wardrobe-data.ts';
import {FABRIC_CAMO_CHANNELS,fabricCamoCompatible} from './operator-fabric-camo-policy.ts';

export const STUDIO_PRESET_STORAGE_KEY='fieldwork3d.operator-studio-presets.v1';
export const STUDIO_PRESET_LIMIT=8;
export type StudioPreset={name:string;wardrobe:WardrobeOptions};
const normalizedName=(name:unknown)=>
 typeof name==='string'?name.trim().replace(/\s+/g,' ').slice(0,32):'';
/** Import old files or potentially corrupted storage without throwing. */
export function readStudioPresets(raw:unknown):StudioPreset[]{
 if(typeof raw==='string'){
  try{raw=JSON.parse(raw);}catch{return [];}
 }
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return [];
 const obj=raw as {version?:unknown;presets?:unknown};
 if(obj.version!==1||!Array.isArray(obj.presets))return [];
 const result:StudioPreset[]=[];
 const seen=new Set<string>();
 for(const value of obj.presets.slice(0,32)){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  const entry=value as {name?:unknown;wardrobe?:unknown};
  const name=normalizedName(entry.name);
  if(!name||seen.has(name.toLowerCase())||result.length>=STUDIO_PRESET_LIMIT)continue;
  const wardrobe=readWardrobe(entry.wardrobe);
  if(!entry.wardrobe||typeof entry.wardrobe!=='object')continue;
  seen.add(name.toLowerCase());
  result.push({name,wardrobe});
 }
 return result;
}
export function saveStudioPreset(presets:readonly StudioPreset[],
 name:string,raw:WardrobeOptions):StudioPreset[]{
 const label=normalizedName(name);
 if(!label)return [...presets];
 const next=readStudioPresets({version:1,presets});
 const idx=next.findIndex(x=>x.name.toLowerCase()===label.toLowerCase());
 const entry={name:label,wardrobe:readWardrobe(raw)};
 if(idx>=0){next[idx]=entry;return next;}
 if(next.length>=STUDIO_PRESET_LIMIT)return next;
 next.push(entry);return next;
}
export function deleteStudioPreset(presets:readonly StudioPreset[],name:string):StudioPreset[]{
 return readStudioPresets({version:1,presets}).filter(x=>
  x.name.toLowerCase()!==name.toLowerCase());
}
export const serializeStudioPresets=(presets:readonly StudioPreset[])=>
 JSON.stringify({version:1,presets:readStudioPresets({version:1,presets})});

/** Applying an outfit preset may NOT change a legitimate Campaign kit.
 * Hide styles that the present kit cannot support and remove prints that
 * were only compatible with a different cut. */
export function outfitPresetForKit(raw:unknown,kit:EquipmentLoadout):
 WardrobeOptions{
 const wanted=readWardrobe(raw);
 const desired=resolvedWardrobe(wanted,kit);
 const styles={...wanted.styles};
 for(const slot of WARDROBE_SLOTS){
  if(styles[slot]&&desired[slot]!==styles[slot])delete styles[slot];
 }
 const safe:WardrobeOptions={...wanted,styles};
 const outfit=resolvedWardrobe(safe,kit);
 const fabricCamo={...safe.fabricCamo};
 for(const channel of FABRIC_CAMO_CHANNELS){
  const print=fabricCamo[channel];
  if(print&&!fabricCamoCompatible(print,channel,outfit))
   fabricCamo[channel]=undefined;
 }
 return readWardrobe({...safe,fabricCamo});
}
