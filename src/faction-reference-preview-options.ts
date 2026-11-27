/** Optional costume studies. These are transient art previews, not evidence,
 * issued equipment, recommended real-world kits, or player-owned inventory. */
import {factionReference} from './faction-reference-catalog.ts';
import {resolveFactionReference} from './faction-reference-resolver.ts';
import {canonicalPackEquipment} from './operator-backpack-catalog.ts';
import {emptySecondaryEquipment} from './secondary-equipment.ts';
import type {GarmentSolidId} from './operator-garment-color-policy.ts';
type PackStudy={id:string;label:string;style:string;solid?:GarmentSolidId};
const noPack={id:'unpacked',label:'Without backpack',style:'no-pack'};
const studies:Readonly<Record<string,readonly PackStudy[]>>={
 'us-army-ocp-2019':[noPack,{id:'hydration',label:'Hydration carrier study',style:'hydration',solid:'coyote'},{id:'medical',label:'Medical pack silhouette study',style:'medic-pack',solid:'coyote'},{id:'communications',label:'Communications pack silhouette study',style:'comms-pack',solid:'olive-drab'}],
 'us-army-ucp-2010':[noPack],
 'usmc-desert-2010':[noPack],
 'british-dpm-1995':[noPack],
 'us-desert-1991':[noPack],
 'us-army-m81-1990':[noPack],
 'ukraine-mm14-2022':[noPack,{id:'civilian',label:'Civilian daypack study',style:'civilian-pack',solid:'slate'}],
 'ukraine-territorial-2022':[{id:'civilian',label:'Civilian daypack study',style:'civilian-pack',solid:'slate'}],
 'us-navy-aor1-2014':[noPack,{id:'panel',label:'Carrier-mounted panel silhouette study',style:'admin-pack',solid:'coyote'}],
 'us-swat-2015':[{id:'daypack',label:'Small daypack silhouette study',style:'day-pack',solid:'black'}]
};
export const referencePackStudies=(id:string)=>studies[id]??[];
/** Only the active modeled sidearm family is offered. Other historical
 * handgun identities stay unmapped rather than masquerading as a Glock. */
export const referenceSidearmStudyAvailable=(id:string)=>
 id==='us-police-polo-2020'||id==='us-swat-2015';
export function resolveReferencePreview(id:string,weaponPresetId?:string,
 packStudyId?:string,sidearmStudy=false){
 const base=factionReference(id);
 if(!base)throw Error('Unknown reference '+id);
 const pack=packStudyId?referencePackStudies(id).find(s=>s.id===packStudyId):undefined;
 if(packStudyId&&!pack)throw Error('Unknown reference pack study '+packStudyId);
 const equipment=pack?canonicalPackEquipment(pack.style):undefined;
 if(pack&&!equipment)throw Error('Invalid reference pack study '+pack.style);
 const input=pack?{...base,kit:{...base.kit,backpack:equipment!},
  styles:{...base.styles,packStyle:pack.style},
  gearAppearance:{...base.gearAppearance,packCamo:undefined,packSolid:pack.solid}}:base;
 const resolved=resolveFactionReference(input,weaponPresetId);
 if(!sidearmStudy)return resolved;
 if(!referenceSidearmStudyAvailable(id)||resolved.kit.slots.belt==='belt-none')
  throw Error('Unsupported reference sidearm study '+id);
 // Unloaded, no magazine serials or spare ammunition. Never save this virtual kit.
 return {...resolved,kit:{...resolved.kit,secondary:{...emptySecondaryEquipment(),
  weapon:'glock-g19-gen3' as const}}};
}
