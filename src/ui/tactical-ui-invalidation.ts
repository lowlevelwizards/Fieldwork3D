/** R7.2 — per-mounted-view semantic invalidation, presentation only.
 * No Session mutation, gameplay event listener, RAF, wall clock or DOM reads.
 * An in-place edit changes derived visual values rather than plan identity.
 */
export type QuickStateViewChoice={
 id:string;label:string;title?:string;disabled?:boolean;pressed?:boolean;
};
export type QuickStateView={
 ownerId:string;nodeId:number|null;
 scope:string;scopeTitle:string;scopeAria:string;scopeKind:string;
 choices:readonly QuickStateViewChoice[];
};
/** Encode every field actually rendered by the command strip. JSON tuples
 * avoid ambiguous separators in callsigns, messages and accessible labels.
 */
export function quickStateViewSignature(view:QuickStateView):string{
 return JSON.stringify([
  view.ownerId,view.nodeId,
  view.scope,view.scopeTitle,view.scopeAria,view.scopeKind,
  view.choices.map(choice=>[
   choice.id,choice.label,choice.title??null,
   choice.disabled??null,choice.pressed??null
  ])
 ]);
}
export type TacticalInvalidationStats=Readonly<{
 attempts:number;reconciled:number;skipped:number;
}>;
/** Surface identity is required: a new mount or actual Session must paint even
 * when the text happens to match the previous mission's text.
 */
export function createTacticalSectionInvalidator(){
 let root:object|null=null,scope:object|null=null,session:object|null=null;
 let signature:string|null=null;
 let attempts=0,reconciled=0,skipped=0;
 function invalidate():void{
  root=null;scope=null;session=null;signature=null;
 }
 function shouldReconcile(input:{
  root:object;scope:object;session:object;signature:string;
 }):boolean{
  attempts++;
  if(root===input.root&&scope===input.scope&&session===input.session&&
    signature===input.signature){skipped++;return false;}
  root=input.root;scope=input.scope;session=input.session;
  signature=input.signature;
  reconciled++;
  return true;
 }
 function stats():TacticalInvalidationStats{
  return {attempts,reconciled,skipped};
 }
 return {invalidate,shouldReconcile,stats};
}
