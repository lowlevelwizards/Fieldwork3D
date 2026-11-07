/** Real-world appearance reference resolution. No inventory, ammo, or save writes. */
import {factionReference,type FactionReference} from './faction-reference-catalog.ts';
import {wardrobeRecipe,applyWardrobeRecipe} from './operator-wardrobe-recipes.ts';
import {setEquipmentChoice,type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {readWardrobe,resolvedWardrobe,setWardrobeStyle,setWardrobeFabricSolid,
 setWardrobeFabricCamo,wardrobeConflicts,type WardrobeOptions,type WardrobeSlot}
 from './operator-wardrobe-data.ts';
import {fabricCamoCompatible} from './operator-fabric-camo-policy.ts';
import {headwearCamoChoices} from './operator-headwear-camo.ts';
import {helmetCoverChoices} from './operator-helmet-cover-policy.ts';
import {outfitPresetForKit} from './operator-studio-presets.ts';
import {referenceWeaponChoice} from './faction-reference-weapons.ts';
import {syncPrimaryWeapon} from './equipment-loadouts.ts';

export type ReferenceResolution={
 reference:FactionReference;kit:EquipmentLoadout;wardrobe:WardrobeOptions;
 weapon:ReturnType<typeof referenceWeaponChoice>;
 technicalIssues:readonly string[];incompatibleChannels:readonly string[];
};
export function resolveFactionReference(input:FactionReference|string):ReferenceResolution{
 const reference=typeof input==='string'?factionReference(input):input;
 if(!reference)throw Error('Unknown reference');
 const base=wardrobeRecipe(reference.baseRecipeId);
 if(!base)throw Error('Unknown reference base recipe: '+reference.baseRecipeId);
 const built=applyWardrobeRecipe(base);
 const weapon=referenceWeaponChoice(reference.id);
 let kit=syncPrimaryWeapon(built.kit,weapon.weapon),wardrobe=built.wardrobe;
 const issues:string[]=[];
 for(const [slot,id] of Object.entries(reference.kit??{})){
  const updated=setEquipmentChoice(kit,slot as LoadoutSlot,id);
  if(updated===kit&&kit.slots[slot as LoadoutSlot]!==id)issues.push('Invalid equipment '+slot+': '+id);
  kit=updated;
 }
 for(const [slot,id] of Object.entries(reference.styles??{})){
  const updated=setWardrobeStyle(wardrobe,slot as WardrobeSlot,id);
  if(updated===wardrobe&&wardrobe.styles[slot as WardrobeSlot]!==id)
   issues.push('Unknown appearance '+slot+': '+id);
  wardrobe=updated;
 }
 const outfit=resolvedWardrobe(wardrobe,kit);
 const incompatibleChannels:string[]=[];
 if(reference.uniformCamo||reference.uniformSolid){
  for(const channel of ['top','trousers'] as const){
   // Replace the base recipe's fabric; never leak an unrelated base camouflage.
   wardrobe=setWardrobeFabricCamo(wardrobe,channel,null,outfit);
   if(reference.uniformSolid){
    wardrobe=setWardrobeFabricSolid(wardrobe,channel,reference.uniformSolid,outfit);
   }else if(reference.uniformCamo){
    if(fabricCamoCompatible(reference.uniformCamo,channel,outfit))
     wardrobe=setWardrobeFabricCamo(wardrobe,channel,reference.uniformCamo,outfit);
    else {
     // Deliberately neutral approximation, not a falsely labeled issued pattern.
     wardrobe=setWardrobeFabricSolid(wardrobe,channel,'olive-drab',outfit);
     incompatibleChannels.push(channel);
    }
   }
  }
 }
 // Keep independent historical equipment finishes; a uniform print never
 // implicitly prints a pack or vest. Empty cuts do not consume fabric channels.
 const appearance=reference.gearAppearance;
 for(const [channel,style,empty,solid,print] of [
  ['armor',outfit.armorStyle,'armor-bare',appearance?.armorSolid??reference.gearSolid,appearance?.armorCamo],
  ['gear',outfit.rigStyle,'no-rig',appearance?.rigSolid??reference.gearSolid,appearance?.rigCamo],
  ['pack',outfit.packStyle,'no-pack',appearance?.packSolid??reference.gearSolid,appearance?.packCamo]
 ] as const){
  if(style===empty)continue;
  wardrobe=setWardrobeFabricCamo(wardrobe,channel,null,outfit);
  if(solid){
   const updated=setWardrobeFabricSolid(wardrobe,channel,solid,outfit);
   if(updated===wardrobe)issues.push('Equipment textile unavailable on '+channel+': '+solid);
   wardrobe=updated;
  }
  if(print){
   if(fabricCamoCompatible(print,channel,outfit))
    wardrobe=setWardrobeFabricCamo(wardrobe,channel,print,outfit);
   else incompatibleChannels.push(channel);
  }
 }
 const headwearPrint=appearance?.headwearCamo;
 if(headwearPrint&&!headwearCamoChoices(outfit.headwear).includes(headwearPrint))
  incompatibleChannels.push('headwear');
 const coverPrint=appearance?.helmetCoverCamo;
 if(coverPrint&&!helmetCoverChoices(outfit.headwear).includes(coverPrint))
  incompatibleChannels.push('helmetCover');
 wardrobe=readWardrobe({...wardrobe,
  ...(appearance?.headwearSolid||reference.headwearColor?
    {headwearColor:appearance?.headwearSolid??reference.headwearColor}:{}),
  ...(headwearPrint&&headwearCamoChoices(outfit.headwear).includes(headwearPrint)?
    {headwearCamo:headwearPrint}:{}),
  ...(coverPrint&&helmetCoverChoices(outfit.headwear).includes(coverPrint)?
    {helmetCover:'fitted' as const,helmetCoverCamo:coverPrint}:{}),
  ...(reference.beretDrape?{beretDrape:reference.beretDrape}:{}),
  ...(reference.pasgtDetails&&outfit.headwear==='pasgt'?{pasgtDetails:reference.pasgtDetails}:{}),
  ...(reference.m1956Variant?{m1956Variant:reference.m1956Variant}:{}),
  ...(reference.m56Details?{m56Details:reference.m56Details}:{}),
  ...(reference.m56Net?{m56Net:reference.m56Net}:{}),
  ...(reference.policeVisorPosition?{policeVisorPosition:reference.policeVisorPosition}:{}),
  ...(reference.policeVisorTint?{policeVisorTint:reference.policeVisorTint}:{}),
  ...(reference.policeVisorFrame?{policeVisorFrame:reference.policeVisorFrame}:{}),
  ...(reference.markings?{markings:reference.markings}:{}),
  ...(reference.sleeveState?{sleeveState:reference.sleeveState}:{}),
  ...(reference.trouserHem?{trouserHem:reference.trouserHem}:{})});
 issues.push(...wardrobeConflicts(wardrobe,kit));
 return {reference,kit,wardrobe,weapon,technicalIssues:issues,incompatibleChannels};
}
export function referenceLookForKit(input:FactionReference|string,actualKit:EquipmentLoadout,
 current?:WardrobeOptions){
 const resolved=resolveFactionReference(input);
 const compatible=outfitPresetForKit(resolved.wardrobe,actualKit);
 // Identity is personal, not part of a historical uniform template.
 const wardrobe=readWardrobe({...compatible,
  skinTone:current?.skinTone,hairStyle:current?.hairStyle,hairTone:current?.hairTone});
 const wanted=resolvedWardrobe(resolved.wardrobe,resolved.kit);
 const actual=resolvedWardrobe(wardrobe,actualKit);
 const substituted=(Object.keys(wanted) as WardrobeSlot[])
  .filter(slot=>wanted[slot]!==actual[slot]);
 const lostPrints=(['top','trousers','armor','gear','pack'] as const)
  .filter(channel=>!!resolved.wardrobe.fabricCamo?.[channel]&&
   wardrobe.fabricCamo?.[channel]!==resolved.wardrobe.fabricCamo?.[channel]);
 return {wardrobe,substituted,lostPrints,resolved};
}
