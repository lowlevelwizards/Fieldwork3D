/** D2.2: deliberately SMALL curated choices for four existing appearance looks.
 * Existing catalog IDs only; no history-of-issue claims or item definitions.
 * This is a game presentation policy, not a certified agency inventory.
 */
import type {DispatchContentKind,DispatchAvailability}
 from './dispatch-content-policy.ts';

type Choices=Partial<Record<DispatchContentKind,readonly string[]>>;
export type DispatchStarterChoiceRecord=Readonly<{
 available:Choices;specialist:Choices;
}>;
const policy=(available:Choices,specialist:Choices={}):
 DispatchStarterChoiceRecord=>({available,specialist});

/** Add a reference only after a convincing playable authored look exists.
 * This table intentionally does not automatically extend to all police.
 */
export const DISPATCH_STARTER_CHOICES:
 Readonly<Record<string,DispatchStarterChoiceRecord>>={
 'us-swat-mp5-1995':policy({
  equipment:['primary-smg','head-helmet','armor-soft','rig-light',
   'belt-standard','backpack-none','utility-radio','tactical-flash'],
  'weapon-preset':['hk-mp5a3'],
  'wardrobe-style':['pasgt','bdu-shirt','bdu-trousers',
   'soft-vest','micro-rig','duty-belt','gloves-field','no-pack'],
  'solid-color':['navy','black'],
  'identity-marking':['label-swat']
 },{
  equipment:['primary-shotgun','utility-breach']
 }),
 'us-swat-2015':policy({
  equipment:['primary-carbine','head-helmet','armor-soft','rig-light',
   'belt-standard','backpack-none','utility-radio','tactical-flash',
   'top-uniform','legs-field','hands-gloves','hands-none','feet-boots',
   'medical-basic','medical-none','medical-trauma','tactical-none',
   'utility-none','utility-light','rig-none','belt-light'],
  'weapon-preset':['ar-m4a1'],
  'wardrobe-style':['mich-2001','bdu-shirt','bdu-trousers',
   'soft-vest','micro-rig','duty-belt','no-pack','gloves-field','gloves-none'],
  'solid-color':['black','navy','charcoal'],
  'identity-marking':['label-swat','label-police']
 },{
  equipment:['primary-smg','primary-shotgun','armor-carrier','utility-breach'],
  // Optional specialist armory choice, NOT a statement that generic US
  // tactical-police agencies routinely issued the G36C. The D11 career
  // standing policy gates this preset at 70; global creative stays open.
  'weapon-preset':['hk-mp5a3','g36-c-classic']
 }),
 'us-police-polo-2020':policy({
  equipment:['head-cap','armor-soft','rig-none','belt-standard',
   'backpack-none','utility-radio','medical-basic'],
  'wardrobe-style':['patrol-cap','polo-shirt','acu-trousers',
   'soft-vest','no-rig','duty-belt','no-pack','gloves-none'],
  'solid-color':['navy','black'],
  'identity-marking':['label-police']
 },{
  // Game still requires long-gun class: OPTIONAL rifle representation only.
  equipment:['primary-carbine'],
  'weapon-preset':['ar-m4a1']
 }),
 'russian-omon-2002':policy({
  equipment:['primary-carbine','head-helmet','armor-soft','rig-light',
   'belt-standard','backpack-none','utility-radio'],
  'weapon-preset':['ak-aks74u'],
  'wardrobe-style':['pasgt','bdu-shirt','bdu-trousers',
   'soft-vest','micro-rig','duty-belt','no-pack','gloves-field'],
  'solid-color':['black'],
  camouflage:['urban-kamysh'],
  'identity-marking':['label-omon']
 },{
  equipment:['utility-breach','tactical-flash']
 })
};

export function dispatchStarterChoiceStatus(referenceId:string,
 kind:DispatchContentKind,id:string):Exclude<DispatchAvailability,
 'unclassified'|'not-applicable'>|null{
 const entry=DISPATCH_STARTER_CHOICES[referenceId];
 if(!entry)return null;
 if(kind==='reference')return referenceId===id?'available':'not-offered';
 if(entry.available[kind]?.includes(id))return 'available';
 if(entry.specialist[kind]?.includes(id))return 'specialist';
 // No decision is not proof of exclusion: policy caller handles unknown.
 return null;
}
