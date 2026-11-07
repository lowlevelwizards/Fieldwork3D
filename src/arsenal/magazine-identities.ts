/** Arsenal R16a — nominal physical magazine identities, no simulation writes.
 * V1 class-specific ammunition, reserve magazines, Campaign ownership and
 * replay remain authoritative until a separately verified migration.
 */
import {FAMILY_PARTS,type WeaponFamilyPart} from '../equipment-weapon-families.ts';
import {WEAPONS,type WeaponId} from '../breach-combat.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';

type Feed=NonNullable<WeaponFamilyPart['feed']>;
export interface ArsenalMagazineIdentity{
 partId:string;feed:Feed;nominalRounds:number;
}
export interface ArsenalMagazineComparison extends ArsenalMagazineIdentity{
 weapon:WeaponId;simulatedCapacity:number;simulatedReserve:number;
 /** Visual profile and class ammunition are NOT automatically synchronized. */
 matchesSimulation:boolean;
}
const catalog:Readonly<Record<string,number>>={
 'ar-mag20':20,'ar-mag30':30,'ar-magpoly':30,
 'ak-mag762':30,'ak-mag762poly':30,'ak-mag545':30,'ak-mag545poly':30,
 'ak-rpk-mag45':45,'ak-mag762-resin':30,'ak-mag762poly-plum':30,
 'ak-mag545-plum':30,'ak-rpk-mag45-plum':45,
 'hk-g3-mag20':20,'hk556-mag30':30,'hk556-mag25':25,'hk9-mag30':30
};
export const ARSENAL_MAGAZINE_CAPACITIES=catalog;
/** Strictly use the existing authored magazine and feed identification. */
export function arsenalMagazineIdentity(partId:string):ArsenalMagazineIdentity|undefined{
 const part=FAMILY_PARTS[partId],nominalRounds=catalog[partId];
 if(!part||part.slot!=='magazine'||!part.feed||
  !Number.isInteger(nominalRounds)||nominalRounds<1)return undefined;
 return {partId,feed:part.feed,nominalRounds};
}
/** Read-only discrepancy report. Does NOT affect any ammo quantity. */
export function compareArsenalMagazineWithSimulation(recipe:ArsenalRecipeV2):
 ArsenalMagazineComparison|undefined{
 const assembly=arsenalRecipeToLegacy(recipe);
 if(!assembly)return undefined;
 const id=arsenalMagazineIdentity(assembly.build?.parts.magazine??'');
 if(!id)return undefined;
 const simulation=WEAPONS[recipe.weapon];
 return {...id,weapon:recipe.weapon,simulatedCapacity:simulation.capacity,
  simulatedReserve:simulation.reserve,
  matchesSimulation:id.nominalRounds===simulation.capacity};
}
/** Ensures newly added authorable magazine profiles are not silently missed. */
export function arsenalMagazineCatalogIssues():string[]{
 const actual=Object.values(FAMILY_PARTS).filter(part=>part.slot==='magazine');
 const issues:string[]=[];
 for(const p of actual){
  const profile=arsenalMagazineIdentity(p.id);
  if(!profile)issues.push('Missing visual magazine capacity '+p.id);
 }
 for(const id of Object.keys(catalog)){
  if(!FAMILY_PARTS[id]||FAMILY_PARTS[id].slot!=='magazine')
   issues.push('Unknown magazine profile '+id);
 }
 return issues;
}
