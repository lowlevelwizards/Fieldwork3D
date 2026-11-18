/** Every dated faction visual reference owns an era-curated weapon preview.
 * 'proxy' is explicit: an AR may not masquerade as a G36 or SA80.
 * Optional uncommon weapons remain separate from the representative default
 * and are preview-only; neither changes inventory nor user weapon builds. */
import {issueWeaponPreset} from './breach-weapon-issue.ts';

export type ReferenceWeaponFidelity='exact'|'representative'|'proxy';
export type ReferenceWeaponChoice={presetId:string;fidelity:ReferenceWeaponFidelity};
const choice=(presetId:string,fidelity:ReferenceWeaponFidelity):ReferenceWeaponChoice=>
 ({presetId,fidelity});
export const REFERENCE_WEAPONS:Readonly<Record<string,ReferenceWeaponChoice>>={
 'usmc-woodland-2005':choice('ar-m16a4','representative'),
 'bundeswehr-flecktarn-2000':choice('g36-service','representative'),
 'russian-emr-2015':choice('ak-ak74m','representative'),
 'british-dpm-1995':choice('ar-m16a2','proxy'),
 'nva-strichtarn-1980':choice('ak-akm','exact'),
 'sadf-nutria-1985':choice('fal-5000','representative'),
 'swedish-m90-2000':choice('ar-m16a2','proxy'),
 'rhodesian-brushstroke-1975':choice('fal-5000','representative'),
 'ukraine-mm14-2022':choice('ak-ak74m','representative'),
 'pla-xingkong-2021':choice('ar-m4a1','proxy'),
 'swiss-alpenflage-1980':choice('ar-m16a1','proxy'),
 'us-desert-1991':choice('ar-m16a2','exact'),
 'us-army-ocp-2019':choice('ar-m4a1','exact'),
 'us-army-ucp-2010':choice('ar-m4a1','representative'),
 'us-army-m81-1990':choice('ar-m16a2','exact'),
 'us-army-dcu-2003':choice('ar-m16a4','representative'),
 'us-army-erdl-1970':choice('ar-car15','representative'),
 'usmc-desert-2010':choice('ar-m16a4','representative'),
 'us-navy-aor1-2014':choice('ar-mk18','representative'),
 'british-mtp-2015':choice('ar-m4a1','proxy'),
 'bundeswehr-tropentarn-2010':choice('g36-service','representative'),
 'finnish-m05-2015':choice('ak-akm','proxy'),
 'polish-pantera-2010':choice('ak-ak74m','proxy'),
 'italian-vegetato-2015':choice('ar-m4a1','proxy'),
 'belgian-jigsaw-1995':choice('fnc-service','representative'),
 'french-cce-2005':choice('ar-m16a2','proxy'),
 'norwegian-m98-2005':choice('hk-g3a3','representative'),
 'greek-lizard-1990':choice('hk-g3a3','exact'),
 'swiss-taz90-2005':choice('ar-m16a2','proxy'),
 'russian-flora-2000':choice('ak-ak74m','exact'),
 'russian-omon-2002':choice('ak-aks74u','representative'),
 'russian-gorka-leto-2010':choice('ak-aks74u','representative'),
 'jgsdf-type2-2010':choice('ar-m16a2','proxy'),
 'indian-digital-2023':choice('ak-ak103','representative'),
 'australian-dpcu-2004':choice('ar-m16a2','proxy'),
 'canada-cadpat-tw-2012':choice('ar-c7a2-proxy','representative'),
 'korean-granite-2023':choice('ar-m4a1','proxy'),
 'indonesian-kopassus-1990':choice('ar-m16a1','representative'),
 'sandf-s2000-2015':choice('ak-akm','proxy'),
 'private-security-iraq-2007':choice('ar-m4a1','proxy'),
 'ukraine-territorial-2022':choice('ak-akm','representative'),
 'us-police-polo-2020':choice('ar-m4a1','proxy'),
 'us-swat-mp5-1995':choice('hk-mp5a3','representative'),
  'us-swat-2015':choice('ar-m4a1','representative')
};
/**
 * Limited, specifically supported alternate weapon previews for a dated
 * reference. Baseline weapon selections remain the most representative.
 * This must not be used as a country-level "ever had a FAL" shortcut.
 * Preview is visual only and does not alter live equipment inventory.
 */
export type ReferenceWeaponAlternative=ReferenceWeaponChoice&{note:string};
export const REFERENCE_WEAPON_ALTERNATES:
 Readonly<Record<string,readonly ReferenceWeaponAlternative[]>>={
 'bundeswehr-flecktarn-2000':[
  {presetId:'g36-k-dual',fidelity:'representative',
   note:'G36K short-barrel family alternative for role-specific Bundeswehr use; not assumed universal issue in 2000.'}
 ],
 'bundeswehr-tropentarn-2010':[
  {presetId:'g36-k-dual',fidelity:'representative',
   note:'G36K compact family alternative for selected deployed roles; this generic 2010 look does not establish unit-specific issue.'}
 ],
 'rhodesian-brushstroke-1975':[
  {presetId:'fal-5061',fidelity:'representative',
   note:'Folding-stock FAL 50.61 also documented among Rhodesian Security Forces.'}
 ],
 'ukraine-mm14-2022':[
  {presetId:'fal-5061',fidelity:'representative',
   note:'Limited FN FAL 50.61 Para deliveries documented in Ukrainian service in October 2022; not standard issue.'}
 ]
};
export function referenceWeaponOptions(id:string){
 const selected=REFERENCE_WEAPONS[id];
 if(!selected)throw new Error('Reference missing explicit weapon issue: '+id);
 return [{...selected,note:'Primary period reference'},
  ...(REFERENCE_WEAPON_ALTERNATES[id]??[])];
}
/** The returned notes are intentionally part of the preview, never saved as
 * "historically exact" metadata. */
export function referenceWeaponChoice(id:string,previewPresetId?:string){
 const options=referenceWeaponOptions(id);
 const selection=previewPresetId?
  options.find(x=>x.presetId===previewPresetId):options[0];
 if(!selection)throw new Error('Unsupported preview weapon '+previewPresetId+' for '+id);
 const issue=issueWeaponPreset(selection.presetId);
 return {...selection,...issue};
}
