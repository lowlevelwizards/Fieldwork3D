/** Arsenal V2 Stage 8a — pure Quick Play application policy.
 * Applying a recipe alters only the supplied roster state. No Campaign, storage,
 * purchases, or persistent combat equipment. The live UI owns when to commit.
 */
import {WEAPONS} from '../breach-combat.ts';
import {freshMagazineIssue} from './live-magazine-capacity.ts';
import {equipRoster,type RosterState} from '../breach-roster.ts';
import {sameWeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';

export interface QuickPlayArsenalQuote{
 valid:boolean;
 reason?:string;
 changesClass:boolean;
}
export function quoteQuickPlayArsenalEdit(roster:RosterState,operatorId:string,
 recipe:ArsenalRecipeV2):QuickPlayArsenalQuote{
 const member=roster.members.find(m=>m.id===operatorId);
 if(!member)return {valid:false,reason:'Unknown operator',changesClass:false};
 if(!Object.hasOwn(WEAPONS,recipe.weapon))
  return {valid:false,reason:'Unknown weapon class',changesClass:false};
 const resolved=arsenalRecipeToLegacy(recipe);
 if(!resolved)return {valid:false,reason:'Invalid weapon assembly',changesClass:false};
 return {valid:true,changesClass:member.weapon!==recipe.weapon};
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
 const prepared=original.weapon===recipe.weapon?roster:equipRoster(roster,operatorId,recipe.weapon);
 return {...prepared,members:prepared.members.map(member=>member.id===operatorId?
  {...member,weaponConfiguration:config,
   ...freshMagazineIssue(member.id,member.weapon,config)}:member)};
}
