/** FT1.3F: evaluate an explicit proposal against real gameplay equipment.
 * No save write here; campaign and Quick Play own all authorized equipment changes.
 */
import {setEquipmentChoice,syncPrimaryWeapon,type EquipmentLoadout,type LoadoutSlot}
 from './equipment-loadouts.ts';
import {setWardrobeStyle,setWardrobeFabricCamo,resolvedWardrobe,readWardrobe,
 type WardrobeOptions} from './operator-wardrobe-data.ts';
import {familyPreset,matchingFamilyPreset} from './equipment-weapon-families.ts';
import {selectWeaponFamilyPreset,changeWeaponPlatform,type WeaponConfiguration}
 from './equipment-weapon-assemblies.ts';
import {equipRosterGear,equipRosterCatalogPreset,setRosterWardrobe,
 type RosterState} from './breach-roster.ts';
import {equipCampaignGear,equipCampaignOwnedPreset,setCampaignWardrobe,
 type CampaignState} from './campaign-state.ts';
import type {HistoricalLoadoutProposal} from './faction-reference-loadout-generator.ts';
import {uniformCutCamoCompatible} from './operator-uniform-cut-eligibility.ts';

export type HistoricalLoadoutDraft={
 kit:EquipmentLoadout;wardrobe:WardrobeOptions;weaponConfiguration:WeaponConfiguration;
 appliedHistoricalIds:readonly string[];warnings:readonly string[];
 /** Any selected change that cannot be represented must be reviewed, not applied. */
 blocked:readonly string[];
};
export function createHistoricalLoadoutDraft(proposal:HistoricalLoadoutProposal,
 baseline:EquipmentLoadout,original:WardrobeOptions,
 config:WeaponConfiguration):HistoricalLoadoutDraft{
 let kit=baseline,wardrobe=original,weaponConfiguration=config;
 const appliedHistoricalIds:string[]=[],warnings:string[]=[],blocked:string[]=[];
 if(proposal.status==='invalid-context'||proposal.status==='no-evidence')
  return {kit,wardrobe,weaponConfiguration,appliedHistoricalIds,warnings,blocked};
 for(const choice of proposal.choices){
  const mapping=choice.mapping;
  if(!mapping?.playable){
   warnings.push(choice.name+': no playable historical model; retained existing gear');
   continue;
  }
  if(mapping.channel==='weapon'){
   const preset=familyPreset(mapping.value);
   if(!preset||mapping.fidelity==='proxy'){
    blocked.push(choice.name+': named catalog model unavailable');continue;
   }
   const base=weaponConfiguration.weapon===preset.weapon?weaponConfiguration:changeWeaponPlatform(weaponConfiguration,preset.weapon);
   const selected=selectWeaponFamilyPreset(base,preset.id);
   if(!selected.build||matchingFamilyPreset(selected.build)?.id!==preset.id){
    blocked.push(choice.name+': incompatible weapon preset');continue;
   }
   weaponConfiguration=selected;
   kit=syncPrimaryWeapon(kit,preset.weapon);
   appliedHistoricalIds.push(choice.historicalId);continue;
  }
  if(mapping.gameSlot&&mapping.gameItemId){
   const updated=setEquipmentChoice(kit,mapping.gameSlot as LoadoutSlot,mapping.gameItemId);
   if(updated===kit&&kit.slots[mapping.gameSlot as LoadoutSlot]!==mapping.gameItemId){
    blocked.push(choice.name+': invalid equipment choice');continue;
   }
   kit=updated;
  }
  if(mapping.channel==='uniform'){
   // Choose an actual supported BDU/ACU silhouette before printing the cloth.
   // This is a garment-cut change, not blanket camo on nylon/helmets/packs.
   const camo=mapping.value as Parameters<typeof setWardrobeFabricCamo>[2];
   let next=wardrobe,outfit=resolvedWardrobe(next,kit);
   const topSupports=(outfit.top==='bdu-shirt'||outfit.top==='acu-shirt')&&
    uniformCutCamoCompatible(outfit.top,mapping.value as
     Parameters<typeof uniformCutCamoCompatible>[1]);
   const legsSupport=(outfit.trousers==='bdu-trousers'||outfit.trousers==='acu-trousers')&&
    uniformCutCamoCompatible(outfit.trousers,mapping.value as
     Parameters<typeof uniformCutCamoCompatible>[1]);
   if(!topSupports||!legsSupport){
    const modern=uniformCutCamoCompatible('acu-shirt',mapping.value as
     Parameters<typeof uniformCutCamoCompatible>[1]);
    const classic=uniformCutCamoCompatible('bdu-shirt',mapping.value as
     Parameters<typeof uniformCutCamoCompatible>[1]);
    if(modern||classic){
     next=setWardrobeStyle(next,'top',modern?'acu-shirt':'bdu-shirt');
     next=setWardrobeStyle(next,'trousers',modern?'acu-trousers':'bdu-trousers');
     outfit=resolvedWardrobe(next,kit);
    }
   }
   for(const channel of ['top','trousers'] as const)
    next=setWardrobeFabricCamo(next,channel,camo,outfit);
   if(next.fabricCamo?.top!==mapping.value||
      next.fabricCamo?.trousers!==mapping.value){
    blocked.push(choice.name+': pattern incompatible with available garment cuts');
    continue;
   }
   wardrobe=next;
  }else if(mapping.wardrobeSlot){
   const updated=setWardrobeStyle(wardrobe,mapping.wardrobeSlot,mapping.value);
   if(resolvedWardrobe(updated,kit)[mapping.wardrobeSlot]!==mapping.value){
    blocked.push(choice.name+': wardrobe style incompatible with issued kit');
    continue;
   }
   wardrobe=updated;
  }
  if(mapping.fidelity==='proxy')warnings.push(choice.name+': visual proxy, not the genuine model');
  appliedHistoricalIds.push(choice.historicalId);
 }
 return {kit,wardrobe:readWardrobe(wardrobe),weaponConfiguration,
  appliedHistoricalIds,blocked,warnings};
}
/** Quick Play: commit through existing validated roster editors; no persistence here. */
export function applyHistoricalQuickPlayProposal(roster:RosterState,id:string,
 proposal:HistoricalLoadoutProposal):RosterState|null{
 const member=roster.members.find(x=>x.id===id);
 if(!member||proposal.status==='invalid-context'||proposal.status==='no-evidence')return null;
 const draft=createHistoricalLoadoutDraft(proposal,member.loadout,
  member.wardrobe,member.weaponConfiguration);
 if(draft.blocked.length||!draft.appliedHistoricalIds.length)return null;
 let state=roster;
 for(const [slot,value] of Object.entries(draft.kit.slots)){
  if(slot==='primary'||member.loadout.slots[slot as LoadoutSlot]===value)continue;
  state=equipRosterGear(state,id,slot as LoadoutSlot,value);
 }
 if(JSON.stringify(draft.weaponConfiguration)!==JSON.stringify(member.weaponConfiguration)){
  const choice=proposal.choices.find(c=>c.mapping?.channel==='weapon');
  if(!choice)return null;
  state=equipRosterCatalogPreset(state,id,choice.mapping!.value);
 }
 state=setRosterWardrobe(state,id,draft.wardrobe);
 const updated=state.members.find(x=>x.id===id);
 return updated&&JSON.stringify(updated.loadout.slots)===JSON.stringify(draft.kit.slots)?
  state:null;
}
/** Campaign: no purchases, no active contract, no partial stock mutation.
 * Existing ownership/equip functions are the only authorities.
 */
export function applyHistoricalCampaignProposal(campaign:CampaignState,id:string,
 proposal:HistoricalLoadoutProposal):CampaignState|null{
 const member=campaign.operators.find(x=>x.id===id&&x.status!=='retired'&&x.status!=='lost');
 if(campaign.rules?.template==='dispatch'||!member||campaign.activeContractId||proposal.status==='invalid-context'||
  proposal.status==='no-evidence')return null;
 const draft=createHistoricalLoadoutDraft(proposal,member.loadout,
  member.wardrobe??readWardrobe(null),member.weaponConfiguration);
 if(draft.blocked.length||!draft.appliedHistoricalIds.length)return null;
 let state=campaign;
 for(const [slot,value] of Object.entries(draft.kit.slots)){
  if(slot==='primary'||member.loadout.slots[slot as LoadoutSlot]===value)continue;
  state=equipCampaignGear(state,id,slot as LoadoutSlot,value);
 }
 if(JSON.stringify(draft.weaponConfiguration)!==JSON.stringify(member.weaponConfiguration)){
  const choice=proposal.choices.find(c=>c.mapping?.channel==='weapon');
  if(!choice)return null;
  const before=state;
  state=equipCampaignOwnedPreset(state,id,choice.mapping!.value);
  if(state===before)return null;
 }
 state=setCampaignWardrobe(state,id,draft.wardrobe);
 const updated=state.operators.find(x=>x.id===id);
 if(!updated||JSON.stringify(updated.loadout.slots)!==JSON.stringify(draft.kit.slots)||
    JSON.stringify(updated.weaponConfiguration.build)!==JSON.stringify(draft.weaponConfiguration.build))
  return null;
 return state;
}
