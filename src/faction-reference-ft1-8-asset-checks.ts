/** FT1.8B: machine-verifiable existing-catalog checks, not silhouette review.
 * Unknown target geometry is never reported absent on a name-only search.
 */
import {familyPreset} from './equipment-weapon-families.ts';
import {referenceWeaponChoice} from './faction-reference-weapons.ts';
import {buildReferenceCoverageMatrix} from './faction-reference-coverage-matrix.ts';
import {buildFT18Triage} from './faction-reference-ft1-8-triage.ts';

export type CatalogInspection={
 candidateId:string;status:'existing-not-selected'|'representative-selected'|
 'needs-visual-inspection';
 modelId:string|null;currentSelection:string|null;
 evidence:'resolved-game-preset'|'existing-fidelity-audit';
 explanation:string;verifiedModelAbsence:false;
};
const knownWeaponChecks:Readonly<Record<string,{referenceId:string;presetId:string}>>={
 'gap:fnc-family':{referenceId:'belgian-jigsaw-1995',presetId:'fnc-service'},
 'gap:ag3-variant':{referenceId:'norwegian-m98-2005',presetId:'hk-g3a3'}
};
export function inspectFT18Catalog():readonly CatalogInspection[]{
 const triage=buildFT18Triage();
 return triage.map((entry):CatalogInspection=>{
  const known=knownWeaponChecks[entry.candidate.id];
  if(known){
   const model=familyPreset(known.presetId);
   const selected=referenceWeaponChoice(known.referenceId);
   if(model){
    return {candidateId:entry.candidate.id,
     status:selected.presetId===known.presetId?'representative-selected':'existing-not-selected',
     modelId:known.presetId,currentSelection:selected.presetId,
     evidence:'resolved-game-preset' as const,
     explanation:selected.presetId===known.presetId?
      'Existing same-family preset selected; specific national configuration still needs visual review.':
      'Real modeled preset exists in the weapon family catalog; inspect compatibility before assigning.',
     verifiedModelAbsence:false as const};
   }
  }
  return {candidateId:entry.candidate.id,
   status:'needs-visual-inspection' as const,modelId:null,
   currentSelection:entry.candidate.currentProxies.join('; ')||null,
   evidence:'existing-fidelity-audit' as const,
   explanation:'Authored gap and current stand-in recorded; no catalog-wide geometry-absence claim.',
   verifiedModelAbsence:false as const};
 });
}
/** Mapping fixes are suggestions only; a compatible asset still needs fit review. */
export function ft18PotentialMappingFixes(){
 const seen=new Map<string,{gapId:string;candidateModel:string;references:string[]}>();
 for(const cell of buildReferenceCoverageMatrix().cells)for(const gap of cell.gaps){
  if(gap.status!=='existing-unassigned'||!gap.existingCandidate)continue;
  const key=gap.id+'|'+gap.existingCandidate;
  const prior=seen.get(key)??{gapId:gap.id,candidateModel:gap.existingCandidate,references:[]};
  prior.references.push(cell.referenceId);
  seen.set(key,prior);
 }
 return [...seen.values()].map(x=>({...x,references:x.references.sort()}))
  .sort((a,b)=>a.gapId.localeCompare(b.gapId));
}
