/** B4 Briefing Lab: authoring and review, never a live tactical controller. */
import type {MissionTruth,OperationDossierV1,ReportQuality,NarrativeStyle,BriefingLength} from './briefing/briefing-types.ts';
import type {IntelMode} from './breach-intel.ts';
import type {SiteScale} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import {eligibleIncidents} from './briefing/incident-catalog.ts';
import {selectIncident} from './briefing/incident-director.ts';
import {createOperationDossier,presentOperationDossier} from './briefing/briefing-composer.ts';
import {validateOperationDossier} from './briefing/briefing-validation.ts';
import type {LabGenerationRequest,LabGenerationResponse} from './briefing-lab-worker.ts';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const ui={
  mission:el<HTMLSelectElement>('missionKind'),scale:el<HTMLSelectElement>('siteScale'),
  intel:el<HTMLSelectElement>('intelMode'),seed:el<HTMLInputElement>('siteSeed'),
  quality:el<HTMLSelectElement>('reportQuality'),
  style:el<HTMLSelectElement>('reportStyle'),
  length:el<HTMLSelectElement>('reportLength'),
  incident:el<HTMLSelectElement>('incident'),
  steer:el<HTMLInputElement>('steerEncounter'),
  rebuild:el<HTMLButtonElement>('rebuildEncounter'),
  generate:el<HTMLButtonElement>('generateSite'),
  rerollIncident:el<HTMLButtonElement>('rerollIncident'),
  rerollWording:el<HTMLButtonElement>('rerollWording'),
  copy:el<HTMLButtonElement>('copyText'),
  export:el<HTMLButtonElement>('exportDossier'),
  status:el<HTMLElement>('labStatus'),title:el<HTMLElement>('output-title'),
  meta:el<HTMLElement>('operationMeta'),text:el<HTMLElement>('briefText'),
  comparison:el<HTMLElement>('compareCards'),
  truth:el<HTMLElement>('groundTruth'),diagnostics:el<HTMLElement>('diagnostics')
};
let truth:MissionTruth|null=null;
let dossier:OperationDossierV1|null=null;
let narrativeSalt=0;
let requestId=0;
let currentWorker:Worker|null=null;

function showError(message:string){ui.status.textContent='GENERATION ERROR · '+message;ui.generate.disabled=false;}
function rebuildIncidentChoices(){
  if(!truth)return;
  const choices=eligibleIncidents(truth);
  ui.incident.replaceChildren(...choices.map(def=>{
    const option=document.createElement('option');
    option.value=def.id;option.textContent=def.name.toUpperCase();
    return option;
  }));
  const preferred=truth.encounterIncidentId??selectIncident(truth).id;
  ui.incident.value=choices.some(c=>c.id===preferred)?preferred:
    selectIncident(truth).id;
}
function renderDossier(){
  if(!truth)return;
  const incidentId=ui.incident.value;
  const quality=ui.quality.value as ReportQuality;
  const style=ui.style.value as NarrativeStyle;
  try{
    const opts={forceIncidentId:incidentId||undefined,narrativeSalt,quality,style};
    dossier=createOperationDossier(truth,opts);
    ui.title.textContent=dossier.identity.title;
    ui.meta.textContent=[
      truth.missionKind.toUpperCase(),
      truth.subtype?.replaceAll('-', ' ').toUpperCase()??truth.building.toUpperCase(),
      'REPORT '+quality.toUpperCase(),
      'SEED '+truth.seed,
      truth.encounterIncidentId?'STEERED EXPERIMENT':'READ-ONLY'].join(' · ');
    ui.text.textContent=presentOperationDossier(dossier,ui.length.value as BriefingLength);
    ui.comparison.replaceChildren(...(['dispatch','operations','intelligence'] as const).map(name=>{
      const compared=createOperationDossier(truth!,{...opts,style:name});
      const card=document.createElement('article');
      card.className='compare-card';
      const label=document.createElement('strong');
      label.textContent=name.toUpperCase();
      const body=document.createElement('p');
      body.textContent=compared.rendered.standard;
      card.append(label,body);return card;
    }));
    const problems=validateOperationDossier(truth,dossier);
    ui.diagnostics.textContent=
      (problems.length?problems.join('\n'):'NO VALIDATION ERRORS')+'\n'+
      (truth.encounterIncidentId?'INTENT: '+truth.encounterIncidentId+
        ' / COMPOSED: '+dossier.identity.incidentId+'\n':'NO ENCOUNTER STEERING\n')+'\n'+
      dossier.claims.map(c=>c.id+' / '+c.source+' / '+c.confidence+
        '\n  '+c.text+'\n  provenance: '+c.provenance).join('\n\n');
    ui.status.textContent='VALID DOSSIER · '+dossier.incident.name.toUpperCase()+
      ' · '+dossier.claims.length+' REPORTS';
  }catch(e){showError(e instanceof Error?e.message:String(e));}
}
function generateSite(){
  ++requestId;
  currentWorker?.terminate();
  const seed=Number(ui.seed.value);
  if(!Number.isSafeInteger(seed)||seed<1||seed>0xffffffff){
    showError('Enter a valid unsigned 32-bit site seed');return;
  }
  ui.generate.disabled=true;ui.status.textContent='GENERATING MAP AND ENCOUNTER…';
  const worker=new Worker(new URL('./briefing-lab-worker.ts',import.meta.url),
    {type:'module'});
  currentWorker=worker;
  const id=requestId;
  worker.onmessage=(event:MessageEvent<LabGenerationResponse>)=>{
    if(id!==requestId||event.data.id!==id)return;
    worker.terminate();currentWorker=null;ui.generate.disabled=false;
    if(event.data.kind==='error'){showError(event.data.message);return;}
    truth=event.data.truth;narrativeSalt=0;
    ui.truth.textContent=JSON.stringify(truth,null,2);
    rebuildIncidentChoices();
    renderDossier();
  };
  worker.onerror=()=>{
    if(id!==requestId)return;
    worker.terminate();currentWorker=null;
    showError('Architecture worker stopped unexpectedly');
  };
  const message:LabGenerationRequest={
    id,seed,scale:ui.scale.value as SiteScale,
    mission:ui.mission.value as OperationKind,
    intel:ui.intel.value as IntelMode,
    useIncidentIntent:ui.steer.checked,
    requestedIncidentId:ui.steer.checked?ui.incident.value||undefined:undefined
  };
  worker.postMessage(message);
}
ui.generate.addEventListener('click',generateSite);
ui.steer.addEventListener('change',()=>{
  ui.status.textContent=ui.steer.checked?
    'STEERING ENABLED FOR NEXT SITE GENERATION · current mission unchanged':
    'STEERING DISABLED · current mission unchanged';
});
ui.rebuild.addEventListener('click',()=>{
  // Explicitly opt in. This may regenerate encounter and (if needed) geometry.
  ui.steer.checked=true;generateSite();
});
ui.incident.addEventListener('change',renderDossier);
ui.quality.addEventListener('change',renderDossier);
ui.style.addEventListener('change',renderDossier);
ui.length.addEventListener('change',renderDossier);
ui.rerollIncident.addEventListener('click',()=>{
  if(!truth)return;
  const choices=eligibleIncidents(truth);
  if(choices.length<2){ui.status.textContent='NO ALTERNATE ELIGIBLE INCIDENT';return;}
  const current=choices.findIndex(c=>c.id===ui.incident.value);
  ui.incident.value=choices[(current+1)%choices.length].id;
  renderDossier();
});
ui.rerollWording.addEventListener('click',()=>{
  if(!truth)return;narrativeSalt++;renderDossier();
});
ui.intel.addEventListener('change',()=>{
  // An intel mode changes architectural disclosure; derive fresh facts,
  // rather than silently modifying the resolved mission truth object.
  if(truth)generateSite();
});
ui.copy.addEventListener('click',()=>{
  if(!dossier)return;
  void navigator.clipboard.writeText(
    presentOperationDossier(dossier,ui.length.value as BriefingLength))
    .then(()=>{ui.status.textContent='BRIEFING COPIED';})
    .catch(()=>{ui.status.textContent='CLIPBOARD PERMISSION NOT AVAILABLE';});
});
ui.export.addEventListener('click',()=>{
  if(!truth||!dossier)return;
  const blob=new Blob([JSON.stringify({schema:1,truth,dossier},null,2)],
    {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='fieldwork-briefing-'+truth.seed+'.json';
  link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
});
generateSite();
