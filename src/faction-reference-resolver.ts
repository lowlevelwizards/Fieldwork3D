/** Real-world appearance reference resolution. No inventory, ammo, or save writes. */
import {factionReference,type FactionReference} from './faction-reference-catalog.ts';
import {wardrobeRecipe,applyWardrobeRecipe} from './operator-wardrobe-recipes.ts';
import {setEquipmentChoice,type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {readWardrobe,resolvedWardrobe,setWardrobeStyle,setWardrobeFabricSolid,
 setWardrobeFabricCamo,wardrobeConflicts,type WardrobeOptions,type WardrobeSlot}
 from './operator-wardrobe-data.ts';
import {fabricCamoCompatible} from './operator-fabric-camo-policy.ts';
import {outfitPresetForKit} from './operator-studio-presets.ts';

export type ReferenceResolution={
 reference:FactionReference;kit:EquipmentLoadout;wardrobe:WardrobeOptions;
 technicalIssues:readonly string[];incompatibleChannels:readonly string[];
};
export function resolveFactionReference(input:FactionReference|string):ReferenceResolution{
 const reference=typeof input==='string'?factionReference(input):input;
 if(!reference)throw Error('Unknown reference');
 const base=wardrobeRecipe(reference.baseRecipeId);
 if(!base)throw Error('Unknown reference base recipe: '+reference.baseRecipeId);
 const built=applyWardrobeRecipe(base);
 let kit=built.kit,wardrobe=built.wardrobe;
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
 if(reference.gearSolid){
  for(const channel of ['gear','armor'] as const){
   const previous=wardrobe;
   wardrobe=setWardrobeFabricSolid(wardrobe,channel,reference.gearSolid,outfit);
   if(previous===wardrobe&&outfit[channel==='gear'?'rigStyle':'armorStyle']!==
       (channel==='gear'?'no-rig':'armor-bare'))
    issues.push('Equipment textile unavailable on '+channel+': '+reference.gearSolid);
  }
 }
 wardrobe=readWardrobe({...wardrobe,
  ...(reference.headwearColor?{headwearColor:reference.headwearColor}:{}),
  ...(reference.beretDrape?{beretDrape:reference.beretDrape}:{}),
  ...(reference.markings?{markings:reference.markings}:{}),
  ...(reference.sleeveState?{sleeveState:reference.sleeveState}:{}),
  ...(reference.trouserHem?{trouserHem:reference.trouserHem}:{})});
 issues.push(...wardrobeConflicts(wardrobe,kit));
 return {reference,kit,wardrobe,technicalIssues:issues,incompatibleChannels};
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
