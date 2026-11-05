/** E5-A: explicit sparse-encounter eligibility before changing the live
 * population generator. A zero-threat site is NEVER a capture/clear mission,
 * and ordinary occupancy does not imply an armed opponent.
 *
 * The current population director retains its two-hostile migration floor
 * until site validation, session construction, objectives, and replay agree.
 */
import type {OperationKind} from '../breach-operations.ts';
import type {EncounterPremise} from './encounter-types.ts';
export type PopulationContract={
 mission:OperationKind;premise:EncounterPremise;risk:1|2|3;
};
export function hostileMinimumForContract(c:PopulationContract):number{
 // Preserve legacy combat encounter floors while migrating noncombat
 // contract handling; neither CLEAR nor CAPTURE silently loses defenders.
 if(c.mission==='capture'||c.mission==='clear')return 2;
 if(c.risk!==1)return 2;
 if(c.mission==='intel'||c.mission==='rescue'){
  if(c.premise==='vacant'||c.premise==='after-hours')return 0;
 }
 return 1;
}
export function admissibleHostileCount(
 c:PopulationContract,count:number):boolean{
 return Number.isInteger(count)&&count>=hostileMinimumForContract(c);
}
