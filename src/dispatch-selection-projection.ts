/** D2.3 pure projection for a future Dispatch equipment/appearance editor.
 * Does NOT change equipment, operators, inventory, rules, saves, or UI state.
 * A retained current value may be displayed without authorizing a new pick.
 */
import {validEquipmentChoice,type EquipmentSlot} from './equipment-catalog.ts';
import {evaluateDispatchContent,type DispatchContentKind,
 type DispatchPolicyContext,type DispatchPolicyDecision}
 from './dispatch-content-policy.ts';

export type DispatchSelectionRequest=Readonly<{
 context:DispatchPolicyContext;kind:DispatchContentKind;
 candidateIds:readonly string[];
 /** REQUIRED for equipment. Validate the authoritative slot before choosing. */
 equipmentSlot?:EquipmentSlot;
 /** Preserved legacy/current choice, even if unsuitable for new selection. */
 currentId?:string;
}>;
export type DispatchSelectionOption=DispatchPolicyDecision&Readonly<{
 allowedForNewSelection:boolean;
 retainedCurrent:boolean;
}>;

/** No hidden filter: the caller can explain precisely why each existing item
 * is unavailable. The actual editor must enforce allowedForNewSelection again
 * at its commit boundary once a playable Dispatch mode exists.
 */
export function projectDispatchSelection(request:DispatchSelectionRequest):
 readonly DispatchSelectionOption[]{
 const seen=new Set<string>(),options:DispatchSelectionOption[]=[];
 for(const id of request.candidateIds){
  if(seen.has(id))continue;
  seen.add(id);
  const policy=evaluateDispatchContent({kind:request.kind,id,context:request.context});
  const validSlot=request.kind!=='equipment'||
   (request.equipmentSlot!==undefined&&validEquipmentChoice(request.equipmentSlot,id));
  const allowedForNewSelection=policy.selectable&&validSlot;
  const retainedCurrent=id===request.currentId&&!allowedForNewSelection;
  const reason=validSlot?policy.reason:request.equipmentSlot===undefined?
   'Equipment slot required for new selection':'Not valid for this equipment slot';
  options.push(Object.freeze({...policy,
   selectable:allowedForNewSelection,allowedForNewSelection,retainedCurrent,
   reason
  }));
 }
 if(request.currentId!==undefined&&!seen.has(request.currentId)){
  const policy=evaluateDispatchContent({
   kind:request.kind,id:request.currentId,context:request.context
  });
  options.push(Object.freeze({...policy,
   selectable:false,allowedForNewSelection:false,retainedCurrent:true,
   reason:'Current saved selection is retained for review; not offered as a new choice'
  }));
 }
 return Object.freeze(options);
}

/** Re-evaluate a single request at the eventual write boundary. Callers must
 * also keep their existing ownership, budget, slot and appearance checks.
 */
export function mayChooseDispatchSelection(
 request:Omit<DispatchSelectionRequest,'candidateIds'|'currentId'>,
 id:string):boolean{
 const policy=evaluateDispatchContent({kind:request.kind,id,context:request.context});
 return policy.selectable&&(request.kind!=='equipment'||
  (request.equipmentSlot!==undefined&&validEquipmentChoice(request.equipmentSlot,id)));
}
