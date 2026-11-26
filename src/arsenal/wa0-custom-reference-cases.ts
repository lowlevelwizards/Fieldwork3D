/** Read-only art coverage for non-factory catalog entries. Resolve through
 * existing game configuration validation; never invent a preview-only fit. */
import {ARSENAL_REFERENCES} from './catalog.ts';
import {FAMILY_PARTS} from '../equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setConfiguredFamilyPart,type WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
export type CustomArtCase={id:string;name:string;platform:string;partId:string;hostId:string;config:WeaponConfiguration};
export function collectCustomArtCases(){
 const defaults=new Set(ARSENAL_REFERENCES.flatMap(r=>Object.values(r.legacy.parts)));
 const cases:CustomArtCase[]=[],unresolved:string[]=[];
 const hosts=ARSENAL_REFERENCES.map(ref=>({ref,config:selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id)}));
 for(const part of Object.values(FAMILY_PARTS).filter(p=>!defaults.has(p.id))){
  let found=false;
  for(const {ref,config} of hosts){
   if(ref.legacy.family!==part.family)continue;
   const candidate=setConfiguredFamilyPart(config,part.slot,part.id);
   if(candidate.build?.parts[part.slot]!==part.id)continue;
   cases.push({id:'custom-'+part.id,name:part.name,platform:'custom-'+ref.platformId,partId:part.id,hostId:ref.id,config:candidate});found=true;break;
  }
  if(!found)unresolved.push(part.id);
 }
 return {cases,unresolved};
}
