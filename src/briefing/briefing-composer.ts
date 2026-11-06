/** B4: Three authored report structures around ONE validated scenario. */
import type {MissionTruth,OperationDossierV1,ReportQuality,NarrativeStyle,IntelClaim} from './briefing-types.ts';
import {briefingRng,mixBriefingSeed} from './briefing-seed.ts';
import {selectIncident,type IncidentSelection} from './incident-director.ts';
import {intelligenceClaims} from './intelligence-director.ts';
import {validateOperationDossier} from './briefing-validation.ts';

export type DossierOptions=IncidentSelection & {
  quality?:ReportQuality;
  style?:NarrativeStyle;
};
const adjectives=['GREY','COLD','QUIET','LATE','NARROW','HOLLOW','IRON','DUST','DARK','STILL'];
const nouns=['WINDOW','SIGNAL','LEDGER','CROSSING','HARBOR','STREET','HORIZON','ECHO','BRIDGE','LINE'];
const styles:readonly NarrativeStyle[]=['dispatch','operations','intelligence'];
const LABEL=(s:string)=>s.replaceAll('-', ' ').toUpperCase();

function composeText(
  dossier:Pick<OperationDossierV1,'incident'|'claims'|'contract'>,
  length:'brief'|'standard'|'detailed'
):string{
  const {lead,context,style}=dossier.incident;
  const {objective,condition,extraction}=dossier.contract;
  const threat=dossier.claims.find(c=>c.id==='threat')?.text??'Threat information unavailable.';
  const site=dossier.claims.find(c=>c.id==='floor-plan'||c.id==='layout-unknown')?.text??'';
  const other=dossier.claims.filter(c=>!['threat','floor-plan','layout-unknown'].includes(c.id));
  if(length==='brief')
    return [lead,'OBJECTIVE — '+objective,'EXTRACTION — '+extraction].join('\n\n');
  const summary=style==='dispatch'
    ?'DISPATCH — '+lead+' '+context
    :style==='operations'
      ?'SITUATION — '+lead+' '+context
      :'INTELLIGENCE SUMMARY — '+context+' '+lead;
  const content=[summary,'THREAT — '+threat,'SITE — '+site];
  if(length==='detailed'&&other.length)
    content.push('SUPPLEMENTAL REPORTS — '+other.map(c=>
      '['+LABEL(c.source)+' / '+LABEL(c.confidence)+'] '+c.text).join(' '));
  return [...content,'OBJECTIVE — '+objective,'SUCCESS — '+condition,
    'EXTRACTION — '+extraction].join('\n\n');
}
export function createOperationDossier(
  truth:MissionTruth,opts:DossierOptions={}
):OperationDossierV1{
  const incident=selectIncident(truth,opts);
  const narrativeSeed=mixBriefingSeed(truth.seed,(opts.narrativeSalt??0)^0x4b54a129);
  const rand=briefingRng(narrativeSeed);
  const lead=incident.leads[Math.floor(rand()*incident.leads.length)];
  const context=incident.contexts[Math.floor(rand()*incident.contexts.length)];
  // Report quality remains independent of the selected architectural intel mode.
  const quality:ReportQuality=opts.quality??
    (rand()<.28?'low':rand()<.72?'medium':'high');
  const style=opts.style??styles[Math.floor(rand()*styles.length)];
  const title='OPERATION '+adjectives[Math.floor(rand()*adjectives.length)]+' '+
    nouns[Math.floor(rand()*nouns.length)];
  const claims=intelligenceClaims(truth,quality);
  const contract={
    objective:truth.objective.objective,
    condition:truth.objective.condition,
    extraction:truth.objective.extraction
  };
  const draft={
    identity:{seed:truth.seed,missionKind:truth.missionKind,
      incidentId:incident.id,narrativeSeed,title,entryId:truth.entryId,version:1 as const},
    classification:{building:truth.subtype??LABEL(truth.building),
      siteName:truth.siteName,intelMode:truth.intelMode,reportQuality:quality},
    incident:{name:incident.name,lead,context,style},
    claims,contract
  };
  const dossier:OperationDossierV1={
    schema:1,...draft,
    rendered:{brief:composeText(draft,'brief'),
      standard:composeText(draft,'standard'),
      detailed:composeText(draft,'detailed')}
  };
  const issues=validateOperationDossier(truth,dossier);
  if(issues.length)throw new Error('Invalid operation dossier: '+issues.join('; '));
  return dossier;
}
export function presentOperationDossier(
  dossier:OperationDossierV1,length:'brief'|'standard'|'detailed'='standard'
):string{return dossier.rendered[length];}
