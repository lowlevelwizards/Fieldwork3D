/** D12 campaign experience: independent time, catalog, access and economy axes.
 * A campaign preset is a starting configuration, not a different game engine.
 * Only supported, authored tactical-police looks may start a restricted career.
 */
import {dispatchReferenceContext} from './dispatch-content-foundation.ts';
import {factionReference} from './faction-reference-catalog.ts';

export const DISPATCH_PRESETS=['career','historical','decades','open','creative'] as const;
export type DispatchPreset=typeof DISPATCH_PRESETS[number];
export const DISPATCH_PLAYABLE_REFERENCE_IDS=[
 'us-swat-mp5-1995','us-swat-2015','russian-omon-2002'
] as const;
export type DispatchReferenceId=typeof DISPATCH_PLAYABLE_REFERENCE_IDS[number];
export type DispatchTimeMode='fixed'|'progressive'|'unrestricted';
export type DispatchEquipmentScope='department'|'dispatch'|'global';
export type DispatchUnlockMode='historical'|'career'|'both'|'all';
export type DispatchEconomyMode='standard'|'unlimited';
export type DispatchInventoryMode='issued'|'all';
export type DispatchCampaignSetupV1=Readonly<{
 version:1;preset:DispatchPreset;referenceId:DispatchReferenceId;
 timeMode:DispatchTimeMode;equipmentScope:DispatchEquipmentScope;
 unlockMode:DispatchUnlockMode;economy:DispatchEconomyMode;
 startingInventory:DispatchInventoryMode;
}>;
export type DispatchCampaignDraft=Omit<DispatchCampaignSetupV1,'version'>;
const choices=<T extends string>(items:readonly T[],value:unknown):value is T=>
 typeof value==='string'&&items.includes(value as T);
const times=['fixed','progressive','unrestricted'] as const;
const scopes=['department','dispatch','global'] as const;
const unlocks=['historical','career','both','all'] as const;
const economies=['standard','unlimited'] as const;
const inventories=['issued','all'] as const;
const profiles=new Set<string>(DISPATCH_PLAYABLE_REFERENCE_IDS);
export const DISPATCH_PRESET_LABELS:Readonly<Record<DispatchPreset,string>>={
 career:'Department Career',historical:'Historical Campaign',
 decades:'Through the Decades',open:'Open Department',
 creative:'Creative Sandbox'
};
export const DISPATCH_PRESET_DESCRIPTIONS:Readonly<Record<DispatchPreset,string>>={
 career:'Contemporary department with curated equipment, purchases and career progression.',
 historical:'Fixed historical look with period-appropriate equipment and a persistent career.',
 decades:'Advance across authored SWAT eras as your department completes operations.',
 open:'All Dispatch-category equipment offered; normal purchases and careers remain.',
 creative:'Global equipment choices, unrestricted editing and unlimited operating funds.'
};
const defined=(preset:DispatchPreset):DispatchCampaignDraft=>{
 switch(preset){
  case 'career':return {preset,referenceId:'us-swat-2015',timeMode:'fixed',
   equipmentScope:'department',unlockMode:'career',economy:'standard',startingInventory:'issued'};
  case 'historical':return {preset,referenceId:'us-swat-mp5-1995',timeMode:'fixed',
   equipmentScope:'department',unlockMode:'historical',economy:'standard',startingInventory:'issued'};
  case 'decades':return {preset,referenceId:'us-swat-mp5-1995',timeMode:'progressive',
   equipmentScope:'department',unlockMode:'both',economy:'standard',startingInventory:'issued'};
  case 'open':return {preset,referenceId:'us-swat-2015',timeMode:'unrestricted',
   equipmentScope:'dispatch',unlockMode:'all',economy:'standard',startingInventory:'issued'};
  case 'creative':return {preset,referenceId:'us-swat-2015',timeMode:'unrestricted',
   equipmentScope:'global',unlockMode:'all',economy:'unlimited',startingInventory:'all'};
 }
};
export const dispatchPresetDraft=(preset:DispatchPreset='career'):DispatchCampaignDraft=>
 ({...defined(preset)});
export const legacyDispatchSetup=():DispatchCampaignSetupV1=>
 ({version:1,...defined('career')});
export const authoredDispatchProfile=(id:string):id is DispatchReferenceId=>
 profiles.has(id)&&!!dispatchReferenceContext(id)&&!!factionReference(id);
/** The two existing US SWAT snapshots provide a bounded chapter progression.
 * This is NOT a 1980s-to-present historical simulator or a universal issue date.
 */
export const DISPATCH_TIMELINE_CHAPTERS=Object.freeze([
 {referenceId:'us-swat-mp5-1995' as const,minimumOperations:0},
 {referenceId:'us-swat-2015' as const,minimumOperations:10}
]);
export function validDispatchSetup(value:unknown):value is DispatchCampaignSetupV1{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 const keys=['version','preset','referenceId','timeMode','equipmentScope','unlockMode','economy','startingInventory'];
 if(Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k))||
    v.version!==1||!choices(DISPATCH_PRESETS,v.preset)||
    !choices(DISPATCH_PLAYABLE_REFERENCE_IDS,v.referenceId)||
    !authoredDispatchProfile(v.referenceId)||
    !choices(times,v.timeMode)||!choices(scopes,v.equipmentScope)||
    !choices(unlocks,v.unlockMode)||!choices(economies,v.economy)||
    !choices(inventories,v.startingInventory))return false;
 // Only the authored US SWAT timeline has two usable dated tactical snapshots.
 if(v.timeMode==='progressive'&&v.referenceId!=='us-swat-mp5-1995')return false;
 // A curated setup cannot advertise every item as already stocked.
 if(v.startingInventory==='all'&&v.equipmentScope!=='global')return false;
 return true;
}
export function createDispatchSetup(draft:DispatchCampaignDraft):DispatchCampaignSetupV1{
 const candidate={version:1 as const,...draft};
 if(!validDispatchSetup(candidate))throw Error('Unsupported Dispatch campaign setup');
 return Object.freeze(candidate);
}
/** Missing on an old campaign: a read-only 2015 SWAT interpretation. */
export const effectiveDispatchSetup=(campaign:{dispatchSetup?:DispatchCampaignSetupV1}):
 DispatchCampaignSetupV1=>campaign.dispatchSetup??legacyDispatchSetup();
export function currentDispatchReference(campaign:{
 dispatchSetup?:DispatchCampaignSetupV1;history?:readonly unknown[]
}):DispatchReferenceId{
 const setup=effectiveDispatchSetup(campaign);
 if(setup.timeMode!=='progressive')return setup.referenceId;
 const completed=campaign.history?.length??0;
 return completed>=DISPATCH_TIMELINE_CHAPTERS[1].minimumOperations?
  'us-swat-2015':'us-swat-mp5-1995';
}

/** Presets are starting points; an edited bundle retains its original preset ID
 * for save compatibility, but must never present itself as an untouched preset.
 */
export function dispatchSetupCustomized(draft:DispatchCampaignDraft):boolean{
 const baseline=defined(draft.preset);
 return (['referenceId','timeMode','equipmentScope','unlockMode','economy',
  'startingInventory'] as const).some(key=>draft[key]!==baseline[key]);
}
export function dispatchSetupDisplayLabel(draft:DispatchCampaignDraft):string{
 const label=DISPATCH_PRESET_LABELS[draft.preset];
 return dispatchSetupCustomized(draft)?'Customized '+label:label;
}

export function dispatchSetupDescription(setup:DispatchCampaignSetupV1){
 return DISPATCH_PRESET_LABELS[setup.preset]+' · '+setup.timeMode.toUpperCase()+
  ' TIME · '+setup.equipmentScope.toUpperCase()+' EQUIPMENT';
}
