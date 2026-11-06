/** Cheap repeated-dossier audit for one fixed, resolved mission. No new worlds. */
import type {MissionTruth,ReportQuality,NarrativeStyle} from './briefing-types.ts';
import {eligibleIncidents} from './incident-catalog.ts';
import {createOperationDossier} from './briefing-composer.ts';
import {validateOperationDossier} from './briefing-validation.ts';

const qualities:readonly ReportQuality[]=['low','medium','high'];
const styles:readonly NarrativeStyle[]=['dispatch','operations','intelligence'];
export type BriefingAuditResult={
  samples:number;uniqueFamilies:number;uniqueLeads:number;uniqueTitles:number;
  repeatedLeads:number;validationErrors:string[];
  previews:{incident:string;quality:ReportQuality;style:NarrativeStyle;
    title:string;excerpt:string}[];
};
export function auditBriefingVariations(
  truth:MissionTruth,count=24
):BriefingAuditResult{
  const eligible=eligibleIncidents(truth);
  const authored=eligible.filter(x=>!x.id.startsWith('generic-'));
  const choices=authored.length?authored:eligible;
  const previews:BriefingAuditResult['previews']=[];
  const errors:string[]=[];
  const leads:string[]=[];
  const n=Math.min(100,Math.max(1,Math.floor(count)));
  for(let i=0;i<n;i++){
    const def=choices[i%choices.length];
    const quality=qualities[i%qualities.length],style=styles[(i+Math.floor(i/3))%styles.length];
    const dossier=createOperationDossier(truth,{
      forceIncidentId:def.id,quality,style,narrativeSalt:i
    });
    const invalid=validateOperationDossier(truth,dossier);
    errors.push(...invalid.map(e=>i+': '+e));
    leads.push(dossier.incident.lead);
    previews.push({
      incident:dossier.incident.name,quality,style,title:dossier.identity.title,
      excerpt:dossier.incident.lead
    });
  }
  return {
    samples:n,uniqueFamilies:new Set(previews.map(p=>p.incident)).size,
    uniqueLeads:new Set(leads).size,
    uniqueTitles:new Set(previews.map(p=>p.title)).size,
    repeatedLeads:n-new Set(leads).size,
    validationErrors:errors,previews
  };
}
