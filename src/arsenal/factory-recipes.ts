/** Arsenal R13: canonical factory starters usable from any Workbench context.
 * Selecting a factory reference always produces a complete, validated draft.
 * It never grants a firearm, spends credits or changes gameplay equipment.
 */
import {ARSENAL_REFERENCES,ARSENAL_PLATFORMS,
 type ArsenalPlatformId,type ArsenalReference} from './catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,type ArsenalRecipeV2} from './recipes.ts';
export type ArsenalFactoryChoice={id:string;name:string;platformId:ArsenalPlatformId;
 weapon:ArsenalRecipeV2['weapon'];recipe:ArsenalRecipeV2};
export function arsenalFactoryChoice(ref:ArsenalReference):ArsenalFactoryChoice|undefined{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 const recipe=arsenalRecipeFromLegacy(config);
 if(!recipe||recipe.platformId!==ref.platformId)return undefined;
 return {id:ref.id,name:ref.name,platformId:ref.platformId,weapon:recipe.weapon,recipe};
}
export function arsenalFactoryChoices(platform:'all'|ArsenalPlatformId='all',
 query=''):ArsenalFactoryChoice[]{
 const term=query.trim().toLowerCase();
 return ARSENAL_REFERENCES.filter(ref=>
  (platform==='all'||ref.platformId===platform)&&
  (!term||ref.name.toLowerCase().includes(term)||
   ARSENAL_PLATFORMS.some(p=>p.id===ref.platformId&&p.name.toLowerCase().includes(term))))
  .map(arsenalFactoryChoice).filter((x):x is ArsenalFactoryChoice=>Boolean(x));
}
