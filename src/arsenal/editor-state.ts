/** Arsenal V2: immutable draft and bounded, transaction-level undo/redo. */
import {copyArsenalRecipe,sameArsenalRecipe,type ArsenalRecipeV2} from './recipes.ts';
import {alternateStockPosition,type WeaponStockPosition}
 from '../weapon-stock-position.ts';
import {proposeArsenalPartChange,type ArsenalEditProposal} from './compatibility.ts';
import type {ArsenalSlot} from './catalog.ts';
import {arsenalRecipeToLegacy} from './recipes.ts';
import {chooseWeaponMountPosition}
 from '../weapons/geometry/weapon-mount-position-edits.ts';
import {copyMountSelections,type MountableSlot}
 from '../weapons/geometry/weapon-mount-selections.ts';
import type {PhysicalAttachmentPlacement}
 from '../weapons/geometry/weapon-physical-mount-fit.ts';

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

/** M2.6G: a position selection is one undoable and entirely free edit.
 * M2.7 adds the visual rail picker; this API is already mode-neutral.
 */
export function editArsenalMountPosition(draft:ArsenalDraft,slot:MountableSlot,
 location:PhysicalAttachmentPlacement|null):ArsenalDraft{
 const current=arsenalRecipeToLegacy(draft.working);
 if(!current)return draft;
 const edited=chooseWeaponMountPosition(current,slot,location);
 if(edited===current)return draft;
 const nextRecipe:ArsenalRecipeV2={
  ...copyArsenalRecipe(draft.working),
  mountSelections:copyMountSelections(edited.mountSelections)
 };
 return commitArsenalProposal(draft,{
  valid:true,requestedSlot:slot,requestedPartId:location?.attachmentId??'automatic',
  changes:[],requiresConfirmation:false,reasons:[],nextRecipe
 });
}

/** A supported physical stock change is one normal reversible draft edit.
 * No gameplay/campaign state is touched before an explicit Apply.
 */
export function editArsenalStockPosition(draft:ArsenalDraft,
 requested:WeaponStockPosition):ArsenalDraft{
 const allowed=alternateStockPosition(draft.working.parts.stock);
 if(requested!=='deployed'&&requested!==allowed)return draft;
 const next=copyArsenalRecipe(draft.working);
 if(requested==='deployed')delete next.stockPosition;
 else next.stockPosition=requested;
 return commitArsenalProposal(draft,{
  valid:true,requestedSlot:'stock',requestedPartId:next.parts.stock,
  changes:[],requiresConfirmation:false,reasons:[],nextRecipe:next
 });
}
