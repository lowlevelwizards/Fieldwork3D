/** Every dated faction *visual reference* has a curated live AR/AK preview.
 * 'proxy' is deliberately explicit: an AR silhouette must never be described
 * as an actual G36, SA80, FAL, etc. Future families can replace these entries
 * without altering the reference wardrobe or weapons in player inventory. */
import {issueWeaponPreset} from './breach-weapon-issue.ts';

export type ReferenceWeaponFidelity='exact'|'representative'|'proxy';
export type ReferenceWeaponChoice={presetId:string;fidelity:ReferenceWeaponFidelity};
const choice=(presetId:string,fidelity:ReferenceWeaponFidelity):ReferenceWeaponChoice=>
 ({presetId,fidelity});
export const REFERENCE_WEAPONS:Readonly<Record<string,ReferenceWeaponChoice>>={
 'usmc-woodland-2005':choice('ar-m16a4','representative'),
 'bundeswehr-flecktarn-2000':choice('ar-m16a4','proxy'),
 'russian-emr-2015':choice('ak-ak74m','representative'),
 'british-dpm-1995':choice('ar-m16a2','proxy'),
 'nva-strichtarn-1980':choice('ak-akm','exact'),
 'sadf-nutria-1985':choice('ak-akm','proxy'),
 'swedish-m90-2000':choice('ar-m16a2','proxy'),
 'rhodesian-brushstroke-1975':choice('ar-m16a1','proxy'),
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
 'bundeswehr-tropentarn-2010':choice('ar-m4a1','proxy'),
 'finnish-m05-2015':choice('ak-akm','proxy'),
 'polish-pantera-2010':choice('ak-ak74m','proxy'),
 'italian-vegetato-2015':choice('ar-m4a1','proxy'),
 'belgian-jigsaw-1995':choice('ar-m16a2','proxy'),
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
 'us-swat-2015':choice('ar-m4a1','representative')
};
/** The returned notes are intentionally part of the preview, never saved as
 * "historically exact" metadata. */
export function referenceWeaponChoice(id:string){
 const selection=REFERENCE_WEAPONS[id];
 if(!selection)throw new Error('Reference missing explicit weapon issue: '+id);
 const issue=issueWeaponPreset(selection.presetId);
 return {...selection,...issue};
}
