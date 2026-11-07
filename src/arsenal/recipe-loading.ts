/** Arsenal R9a: atomic transfer of validated personal recipes into an edit draft.
 * A saved recipe is never an owned weapon, an inventory transaction or an
 * implicit weapon-class swap. Game-mode authorization happens at Apply.
 */
import {FAMILY_PART_SLOTS} from '../equipment-weapon-families.ts';
import {ARSENAL_ACCESSORY_SLOTS,readArsenalRecipe,copyArsenalRecipe,
 sameArsenalRecipe,type ArsenalRecipeV2} from './recipes.ts';
import {arsenalPart,type ArsenalSlot} from './catalog.ts';
import {type ArsenalDraft} from './editor-state.ts';

const MAX_HISTORY=40;
export interface ArsenalRecipeDifference{
 key:ArsenalSlot|'weapon'|'platform';
 from:string;to:string;
}
export interface ArsenalRecipeLoadProposal{
 valid:boolean;
 reason?:string;
 changes:readonly ArsenalRecipeDifference[];
 nextRecipe?:ArsenalRecipeV2;
}
/** Compare every component, not just the famous receiver/stock silhouette. */
export function proposeArsenalRecipeLoad(current:ArsenalRecipeV2,
 raw:unknown):ArsenalRecipeLoadProposal{
 const next=readArsenalRecipe(raw);
 if(!next)return {valid:false,reason:'This saved build is invalid or outdated',changes:[]};
 const changes:ArsenalRecipeDifference[]=[];
 if(current.platformId!==next.platformId)changes.push({
  key:'platform',from:current.platformId,to:next.platformId});
 if(current.weapon!==next.weapon)changes.push({
  key:'weapon',from:current.weapon,to:next.weapon});
 for(const key of FAMILY_PART_SLOTS){
  if(current.parts[key]!==next.parts[key])
   changes.push({key,from:current.parts[key],to:next.parts[key]});
 }
 for(const key of ARSENAL_ACCESSORY_SLOTS){
  if(current.accessories[key]!==next.accessories[key])
   changes.push({key,from:current.accessories[key],to:next.accessories[key]});
 }
 return {valid:true,changes,nextRecipe:next};
}
export function arsenalRecipeDifferenceLabel(change:ArsenalRecipeDifference):string{
 const name=(id:string)=>arsenalPart(id)?.name??id;
 if(change.key==='platform')return 'Platform: '+change.from+' → '+change.to;
 if(change.key==='weapon')return 'Weapon class: '+change.from+' → '+change.to;
 return change.key+': '+name(change.from)+' → '+name(change.to);
}
/** Accept once; all changed components share ONE undo step.
 * Invalid or identical proposals preserve object identity.
 */
export function acceptArsenalRecipeLoad(draft:ArsenalDraft,
 proposal:ArsenalRecipeLoadProposal):ArsenalDraft{
 if(!proposal.valid||!proposal.nextRecipe||
  sameArsenalRecipe(draft.working,proposal.nextRecipe))return draft;
 const next=readArsenalRecipe(proposal.nextRecipe);
 if(!next)return draft;
 return {...draft,working:copyArsenalRecipe(next),
  undo:[...draft.undo.slice(-(MAX_HISTORY-1)),copyArsenalRecipe(draft.working)],
  redo:[]};
}
