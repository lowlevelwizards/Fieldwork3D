/** D13.4: truthful, read-only creation review from the exact saved rule axes.
 * A preset is only an initial bundle; edits never silently reset other axes.
 * No scene, calendar, agency records or campaign save is created here.
 */
import {dispatchSetupDisplayLabel,validDispatchSetup,
 type DispatchCampaignDraft} from './dispatch-campaign-setup.ts';
import {STARTING_DISPATCH_STANDING} from './dispatch-department.ts';
import {dispatchCatalogAccessReview}
 from './dispatch-weapon-access.ts';

export type DispatchCreationReview=Readonly<{
 valid:boolean;title:string;reference:string;time:string;
 access:string;weaponAccess:string;procurement:string;armory:string;note:string;problem:string;
}>;

export function dispatchCreationReview(draft:DispatchCampaignDraft):DispatchCreationReview{
 const valid=validDispatchSetup({version:1,...draft});
 const reference= draft.referenceId==='us-swat-mp5-1995'?
  'US SWAT · 1995 MP5 reference':
  draft.referenceId==='russian-omon-2002'?
  'Russian OMON · 2002 AKS-74U unit-family reference':
  'US SWAT · 2015 M4A1 reference';
 const time=draft.timeMode==='progressive'?
  'Two authored US SWAT chapters: 1995 → 2015 after 10 completed operations':
  draft.timeMode==='fixed'?
  'Fixed starting reference; career records and purchases continue':
  'No progressing calendar; starting appearance remains the chosen reference';
 const catalog=draft.equipmentScope==='department'?
  'selected reference catalog':draft.equipmentScope==='dispatch'?
  'curated Dispatch catalog':'all supported Fieldwork equipment';
 const access=draft.unlockMode==='historical'?
  'Reference access in '+catalog:
  draft.unlockMode==='career'?
  'Career authorizations in '+catalog:
  draft.unlockMode==='both'?
  'Reference and career authorization in '+catalog:
  'All eligible choices immediately offered in '+catalog;
 const choices=dispatchCatalogAccessReview(draft,draft.referenceId,STARTING_DISPATCH_STANDING);
 const summarize=(status:'offered'|'standing-locked',label:string)=>{
  const matches=choices.filter(p=>p.status===status);
  return matches.length+' '+label+(matches.length?' · '+matches.slice(0,5).map(p=>p.name).join(', ')+(matches.length>5?' +'+(matches.length-5)+' more':''):'');
 };
 const restricted=choices.filter(p=>p.status==='reference-locked').length;
 const unassessed=choices.filter(p=>p.status==='not-assessed').length;
 const weaponAccess=[summarize('offered','OFFERED'),summarize('standing-locked','STANDING 70'),
  restricted+' RESTRICTED',unassessed+' NOT ASSESSED'].join('  /  ');
 const procurement=draft.economy==='unlimited'?
  'No-charge procurement; ownership, compatibility and finite stock still apply':
  'Normal funds and purchases; equipment must still be acquired';
 const armory=draft.startingInventory==='all'?
  'One spare per authored catalog model within armory capacity; not unlimited inventory':
  'Starting squad issue; additional equipment requires procurement';
 const problem=draft.timeMode==='progressive'&&
  draft.referenceId!=='us-swat-mp5-1995'?
  'The two-chapter progression requires the 1995 US SWAT starting reference.':
  draft.startingInventory==='all'&&draft.equipmentScope!=='global'?
  'Expanded starting stock requires the global equipment catalog.':
  valid?'':'Unsupported Dispatch campaign rule combination.';
 const note=draft.timeMode==='progressive'?
  'Only future recruits receive the new chapter kit. Existing operators and serialized equipment are preserved. No intervening years are simulated.':
  draft.timeMode==='fixed'?
  'This is an authored appearance and equipment reference, not verified agency issue history.':
  'Unrestricted time does not invent missing equipment, sidearms, or historical references.';
 return Object.freeze({valid,title:dispatchSetupDisplayLabel(draft),
  reference,time,access,weaponAccess,procurement,armory,note,problem});
}
