/** D15.1 read-only custody classification; not GO-time arrest permission.
 * Legacy D9 surrender leaves health zero; never fabricate conscious custody.
 */
import type {TeamActor} from './breach-game.ts';
export type SuspectCustodyDisposition=
 'not-suspect'|'active-threat'|'legacy-surrendered-down'|
 'incapacitated'|'living-compliant'|'invalid-state';
export type SuspectCustodyReadiness=Readonly<{
 disposition:SuspectCustodyDisposition;
 custodyCandidate:boolean;
}>;
export type SuspectContactFacts=Pick<TeamActor,
 'side'|'health'|'injuryStage'|'surrendered'>;
export function classifySuspectCustody(target:SuspectContactFacts):SuspectCustodyReadiness{
 const result=(disposition:SuspectCustodyDisposition):SuspectCustodyReadiness=>
  ({disposition,custodyCandidate:disposition==='living-compliant'});
 if(target.side!=='red')return result('not-suspect');
 if(!Number.isFinite(target.health)||!Number.isInteger(target.injuryStage)||
    target.injuryStage<0||target.injuryStage>3||
    typeof target.surrendered!=='boolean')return result('invalid-state');
 if(target.health<=0||target.injuryStage===3)
  return result(target.surrendered?'legacy-surrendered-down':'incapacitated');
 return result(target.surrendered?'living-compliant':'active-threat');
}
