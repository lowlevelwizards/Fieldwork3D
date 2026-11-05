/** Opt-in, authenticity-safe outfit coordination.
 * Reads the actual garment/equipment cuts; never modifies combat loadouts
 * or invents unsupported camouflage printing on nylon/armor.
 */
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {setWardrobeFabricSolid} from './operator-wardrobe-data.ts';
import type {CamoOutfit} from './operator-fabric-camo-policy.ts';
import {resolveAutomaticGearColors} from './operator-gear-color-policy.ts';
import {ARMOR_VISUAL_TEXTILES,RIG_VISUAL_TEXTILES,
 armorSignature,rigSignature,validArmorSolid,validRigSolid}
 from './operator-rig-authenticity-policy.ts';
import {solidChoicesFor,type GarmentSolidId} from './operator-garment-color-policy.ts';
import {headwearCamoChoices} from './operator-headwear-camo.ts';

export type OutfitCoordinationProfile='authentic'|'coordinated';
export type OutfitCoordinationScope='unset'|'replace';
export type OutfitCoordinationRequest={
 profile:OutfitCoordinationProfile;scope:OutfitCoordinationScope;
 headwear?:string;matchHeadwearPrint?:boolean;
};
export type OutfitCoordinationSuggestion={
 channel:'armor'|'gear'|'pack';color:GarmentSolidId;
 reason:string;
};
const available=(channel:OutfitCoordinationSuggestion['channel'],outfit:CamoOutfit)=>{
 if(channel==='armor')return outfit.armorStyle!=='armor-bare';
 if(channel==='gear')return outfit.rigStyle!=='no-rig';
 return outfit.packStyle!=='no-pack';
};
const allowedColor=(channel:OutfitCoordinationSuggestion['channel'],
 outfit:CamoOutfit,id:GarmentSolidId)=>{
 if(channel==='armor')return validArmorSolid(outfit.armorStyle,id);
 if(channel==='gear')return validRigSolid(outfit.rigStyle,id);
 return solidChoicesFor(channel).includes(id);
};
const candidates=(channel:OutfitCoordinationSuggestion['channel'],
 outfit:CamoOutfit):readonly GarmentSolidId[]=>{
 if(channel==='armor')return ARMOR_VISUAL_TEXTILES[outfit.armorStyle]?.solids??[];
 if(channel==='gear')return RIG_VISUAL_TEXTILES[outfit.rigStyle]?.solids??[];
 return solidChoicesFor(channel);
};
export function suggestOutfitEquipmentSolids(w:WardrobeOptions,outfit:CamoOutfit,
 profile:OutfitCoordinationProfile):OutfitCoordinationSuggestion[]{
 const automatic=resolveAutomaticGearColors({
  print:w.fabricCamo?.top??null,solid:w.fabricSolids?.top??null
 });
 const iconic={armor:armorSignature(outfit.armorStyle).solid,
  gear:rigSignature(outfit.rigStyle).solid,pack:automatic.pack};
 const result:OutfitCoordinationSuggestion[]=[];
 for(const channel of ['armor','gear','pack'] as const){
  if(!available(channel,outfit))continue;
  const preferred=profile==='authentic'?iconic[channel]:automatic[channel];
  const color=allowedColor(channel,outfit,preferred)?preferred:
   candidates(channel,outfit)[0];
  if(!color||!allowedColor(channel,outfit,color))continue;
  result.push({channel,color,reason:profile==='authentic'?
   'Reference-guided equipment finish':'Coordinated with the uniform'});
 }
 return result;
}
export function coordinateOutfit(w:WardrobeOptions,outfit:CamoOutfit,
 request:OutfitCoordinationRequest):WardrobeOptions{
 let next=w;
 for(const recommendation of suggestOutfitEquipmentSolids(w,outfit,request.profile)){
  const channel=recommendation.channel;
  if(request.scope==='unset'&&
    (next.fabricCamo?.[channel]||next.fabricSolids?.[channel]))continue;
  next=setWardrobeFabricSolid(next,channel,recommendation.color,outfit);
 }
 if(request.matchHeadwearPrint&&request.headwear){
  const print=w.fabricCamo?.top;
  if(print&&headwearCamoChoices(request.headwear).includes(print)&&
    (request.scope==='replace'||!w.headwearCamo))
   next={...next,headwearCamo:print,headwearCamoRoll:
    w.headwearCamo===print?w.headwearCamoRoll:0};
 }
 return next;
}
