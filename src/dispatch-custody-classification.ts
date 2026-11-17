/** D15.1: classification-only contact authority.
 * The existing D9 surrender event puts a hostile in the downed health state.
 * This module MUST NOT transform that legacy representation into an arrest.
 * A future living-submission transition must be implemented and proven in
 * the simulation before this projection can authorize a custody order.
 */
import type {TeamActor} from './breach-game.ts';

export type SuspectCustodyDisposition=
 'not-suspect'|'active-threat'|'legacy-surrendered-down'|
 'incapacitated'|'living-compliant'|'invalid-state';
export type SuspectCustodyReadiness=Readonly<{
 disposition:SuspectCustodyDisposition;
 /** Capability precondition only; never a custody event or completed arrest. */
 physicallyRestrainable:boolean;
}>;
export type SuspectContactFacts=Pick<TeamActor,
 'side'|'health'|'injuryStage'|'surrendered'>;

export function classifySuspectCustody(
 target:SuspectContactFacts):SuspectCustodyReadiness{
 const result=(disposition:SuspectCustodyDisposition):SuspectCustodyReadiness=>
  Object.freeze({disposition,physicallyRestrainable:disposition==='living-compliant'});
 if(target.side!=='red')return result('not-suspect');
 if(!Number.isFinite(target.health)||!Number.isInteger(target.injuryStage)||
    target.injuryStage<0||target.injuryStage>3||
    typeof target.surrendered!=='boolean')return result('invalid-state');
 if(target.health<=0||target.injuryStage===3)
  return result(target.surrendered?'legacy-surrendered-down':'incapacitated');
 if(target.surrendered)return result('living-compliant');
 return result('active-threat');
}
