/** Side-effect-free AI goal arbitration. Physical execution remains in the actor motor. */
export type AIIntentKind='watch'|'investigate'|'engage'|'defend'|'withdraw';
export type AIIntent={kind:AIIntentKind;chosenAt:number;commitUntil:number;reason:string};
export type AIContext={visible:boolean;hasBelief:boolean;recentSound:boolean;
 suppression:number;morale:number};
const priority:Record<AIIntentKind,number>=
 {watch:0,investigate:1,defend:2,engage:3,withdraw:4};
export function chooseAiIntent(previous:AIIntent|null,context:AIContext,
 now:number):AIIntent{
 let kind:AIIntentKind='watch',reason='no actionable observations';
 if(context.hasBelief||context.recentSound){
  kind='investigate';reason='unresolved contact or sound';
 }
 if(context.suppression>.35){kind='defend';reason='under suppressive fire';}
 if(context.visible){kind='engage';reason='confirmed direct visual contact';}
 if(context.suppression>.67&&context.morale<.62){
  kind='withdraw';reason='untenable exposed position';
 }
 if(previous&&now<previous.commitUntil&&
   priority[kind]<=priority[previous.kind]&&
   // Contact loss must never authorize shooting at a remembered position.
   !(previous.kind==='engage'&&!context.visible))
  return previous;
 if(previous&&previous.kind===kind)return previous;
 return {kind,chosenAt:now,commitUntil:now+
  (kind==='investigate'?1.8:kind==='watch'?1.2:.45),reason};
}
