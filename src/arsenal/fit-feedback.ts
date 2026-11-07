/** R14b: concise, inspectable fit status. Never pretend that greyed-out
 * compatibility means a part is owned or can be force-installed.
 */
import type {ArsenalEditProposal} from './compatibility.ts';
export type ArsenalFitState='equipped'|'fits'|'requires'|'incompatible';
export interface ArsenalFitFeedback{
 state:ArsenalFitState;label:string;explanation:string;
}
export function arsenalFitFeedback(proposal:ArsenalEditProposal,
 equipped=false):ArsenalFitFeedback{
 if(equipped)return {state:'equipped',label:'EQUIPPED',
  explanation:'This component is already on the current weapon.'};
 if(!proposal.valid){
  const reason=proposal.reasons.join(' · ')||'This part does not fit the current weapon.';
  const hint=/another platform|Arsenal gallery|different core|receiver/i.test(reason)?
   ' Choose Model to start from a compatible weapon.':
   /mount|rail/i.test(reason)?
   ' Try a compatible optic mount or front end.':
   ' Choose a compatible part or adjust the assembly first.';
  return {state:'incompatible',label:'UNAVAILABLE · TAP FOR WHY',
   explanation:reason+hint+' Nothing was changed.'};
 }
 if(proposal.requiresConfirmation){
  return {state:'requires',label:'NEEDS CHANGES',
   explanation:proposal.reasons.join(' · ')||
    'This part requires additional component changes. Review them before accepting.'};
 }
 return {state:'fits',label:'FITS',
  explanation:'This component fits without changing other parts.'};
}
