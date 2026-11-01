/** Prioritize complete real spaces over the first merely walkable layout.
 * The actual placement/route solver remains authoritative. The comparison is
 * bounded to protect mobile initial-load performance and never treats
 * diagnostics as proof that impossible furniture has been installed.
 */
import type {Site,SiteScale} from '../breach-site.ts';
import {assessRoomContracts} from './room-contracts.ts';
import {assessUnitContracts} from './unit-contracts.ts';
const important=new Set(['kitchen','bathroom','restroom','guest','exam',
 'treatment','bay','workshop','waiting','bedroom','living']);
export type CompletenessScore={missingEssentials:number;
 criticalMissing:number;incompleteUnits:number;score:number};
export function measureSiteCompleteness(site:Site):CompletenessScore{
 const contracts=assessRoomContracts(site);
 let missingEssentials=0,criticalMissing=0;
 for(const contract of contracts){
  missingEssentials+=contract.missing.length;
  if(important.has(contract.purpose))criticalMissing+=contract.missing.length;
 }
 const incompleteUnits=assessUnitContracts(site).filter(x=>!x.complete).length;
 return {missingEssentials,criticalMissing,incompleteUnits,
  score:criticalMissing*3+missingEssentials+incompleteUnits*8};
}
export function shouldTryAnotherLayout(score:CompletenessScore,scale:SiteScale){
 // Only serious deficiencies merit one more expensive architecture build.
 // Compact and standard mobile cases have the tighter threshold.
 return score.criticalMissing>=
   (scale==='small'||scale==='standard'?3:2)||
   score.incompleteUnits>=2;
}
export function preferCompleteCandidate(candidate:CompletenessScore,
 incumbent:CompletenessScore):boolean{
 return candidate.score<incumbent.score;
}
