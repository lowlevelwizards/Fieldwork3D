/** Arsenal V2 Stage 8a — pure Quick Play application policy.
 * Applying a recipe alters only the supplied roster state. No Campaign, storage,
 * purchases, or persistent combat equipment. The live UI owns when to commit.
 */
import {freshMagazineIssue} from './live-magazine-capacity.ts';
import type {RosterState} from '../breach-roster.ts';
import {syncPrimaryWeapon} from '../equipment-loadouts.ts';
import {sameWeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {resolveMountedAccessoryLayout}
 from '../weapons/geometry/mounted-accessory-layout.ts';

export interface QuickPlayArsenalQuote{
 valid:boolean;
 reason?:string;
 changesWeaponIssue:boolean;
}
export function quoteQuickPlayArsenalEdit(roster:RosterState,operatorId:string,
 recipe:ArsenalRecipeV2):QuickPlayArsenalQuote{
 const member=roster.members.find(m=>m.id===operatorId);
 if(!member)return {valid:false,reason:'Unknown operator',changesWeaponIssue:false};
 const resolved=arsenalRecipeToLegacy(recipe);
 if(!resolved?.build)return {valid:false,reason:'Invalid catalog weapon assembly',changesWeaponIssue:false};
 if(resolveMountedAccessoryLayout(resolved).unresolved.length)
  return {valid:false,reason:'Mounting location requires repair',changesWeaponIssue:false};
 return {valid:true,changesWeaponIssue:member.weaponConfiguration.build?.parts.receiver!==resolved.build.parts.receiver||member.weaponConfiguration.build?.parts.magazine!==resolved.build.parts.magazine};
}
/** Quick Play starts every newly selected physical magazine profile full.
 * Campaign does NOT use this adapter; no persistent ammunition is modified.
 */
export function applyQuickPlayArsenalEdit(roster:RosterState,operatorId:string,
 recipe:ArsenalRecipeV2):RosterState{
 if(!quoteQuickPlayArsenalEdit(roster,operatorId,recipe).valid)return roster;
 const config=arsenalRecipeToLegacy(recipe);
 if(!config)return roster;
 const original=roster.members.find(m=>m.id===operatorId);
 if(!original)return roster;
 if(original.weapon===recipe.weapon&&
  sameWeaponConfiguration(original.weaponConfiguration,config))return roster;
 return {...roster,members:roster.members.map(member=>member.id===operatorId?
  {...member,weapon:config.weapon,loadout:syncPrimaryWeapon(member.loadout,config.weapon),weaponConfiguration:config,
   ...freshMagazineIssue(member.id,config.weapon,config)}:member)};
}
