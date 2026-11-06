/** Contract and disclosure checks. Player-facing dossiers NEVER carry MissionTruth. */
import type {MissionTruth,OperationDossierV1,IntelClaim} from './briefing-types.ts';
import {operationBrief} from '../breach-operations.ts';

export function validateBriefingClaims(
  truth:MissionTruth,claims:readonly IntelClaim[]
):string[]{
  const problems:string[]=[];
  const ids=new Set<string>();
  for(const claim of claims){
    if(ids.has(claim.id))problems.push('duplicate claim '+claim.id);
    ids.add(claim.id);
    if(!claim.text.trim()||!claim.provenance.trim())problems.push('untraceable claim '+claim.id);
    if(claim.disclosure==='floor-plan'&&!['floor-plan','full-view'].includes(truth.intelMode))
      problems.push('interior disclosure denied: '+claim.id);
    if(claim.disclosure==='exterior'&&truth.intelMode==='true-blind')
      problems.push('exterior disclosure denied: '+claim.id);
    if(claim.id==='civilian-presence'&&truth.activeCivilianCount===0)
      problems.push('no active civilians for '+claim.id);
  }
  return problems;
}
export function validateOperationDossier(truth:MissionTruth,d:OperationDossierV1):string[]{
  const problems=validateBriefingClaims(truth,d.claims);
  const contract=operationBrief(truth.missionKind);
  if(d.schema!==1||d.identity.seed!==truth.seed||d.identity.missionKind!==truth.missionKind)
    problems.push('dossier identity mismatched');
  if(d.contract.objective!==contract.objective||
     d.contract.condition!==contract.condition||
     d.contract.extraction!==contract.extraction)
    problems.push('authoritative objective contract mismatched');
  if(!d.incident.lead.trim()||!d.rendered.standard.includes(contract.objective)||
     !d.rendered.standard.includes(contract.extraction))
    problems.push('required briefing text missing');
  return problems;
}
