/** Arsenal V2: immutable draft and bounded, transaction-level undo/redo. */
import {copyArsenalRecipe,sameArsenalRecipe,type ArsenalRecipeV2} from './recipes.ts';
import {proposeArsenalPartChange,type ArsenalEditProposal} from './compatibility.ts';
import type {ArsenalSlot} from './catalog.ts';

const HISTORY_LIMIT=40;
export interface ArsenalDraft{
 original:ArsenalRecipeV2;
 working:ArsenalRecipeV2;
 undo:readonly ArsenalRecipeV2[];
 redo:readonly ArsenalRecipeV2[];
}
export function createArsenalDraft(recipe:ArsenalRecipeV2):ArsenalDraft{
 return {original:copyArsenalRecipe(recipe),working:copyArsenalRecipe(recipe),
  undo:[],redo:[]};
}
/** A dependency proposal is ONE undo step; pure preview never touches inventory. */
export function commitArsenalProposal(draft:ArsenalDraft,
 proposal:ArsenalEditProposal,confirmed=false):ArsenalDraft{
 if(!proposal.valid||!proposal.nextRecipe||
  (proposal.requiresConfirmation&&!confirmed)||
  sameArsenalRecipe(draft.working,proposal.nextRecipe))return draft;
 return {...draft,working:copyArsenalRecipe(proposal.nextRecipe),
  undo:[...draft.undo.slice(-(HISTORY_LIMIT-1)),copyArsenalRecipe(draft.working)],
  redo:[]};
}
export function editArsenalDraft(draft:ArsenalDraft,
 slot:ArsenalSlot,id:string,confirmed=false):{
 draft:ArsenalDraft;proposal:ArsenalEditProposal
}{
 const proposal=proposeArsenalPartChange(draft.working,slot,id);
 return {draft:commitArsenalProposal(draft,proposal,confirmed),proposal};
}
export function undoArsenalDraft(draft:ArsenalDraft):ArsenalDraft{
 if(!draft.undo.length)return draft;
 return {...draft,working:copyArsenalRecipe(draft.undo[draft.undo.length-1]),
  undo:draft.undo.slice(0,-1),
  redo:[...draft.redo.slice(-(HISTORY_LIMIT-1)),copyArsenalRecipe(draft.working)]};
}
export function redoArsenalDraft(draft:ArsenalDraft):ArsenalDraft{
 if(!draft.redo.length)return draft;
 return {...draft,working:copyArsenalRecipe(draft.redo[draft.redo.length-1]),
  redo:draft.redo.slice(0,-1),
  undo:[...draft.undo.slice(-(HISTORY_LIMIT-1)),copyArsenalRecipe(draft.working)]};
}
export function arsenalDraftDirty(draft:ArsenalDraft):boolean{
 return !sameArsenalRecipe(draft.original,draft.working);
}
