/** After Action V4-5 — structured, authoritative mission summary.
 * Scores and mission outcomes come from debrief(Session), never inferred from
 * partial replay film or prose. Recorded pacing is clearly observational.
 */
import type {debrief,Session} from '../breach-game.ts';
import type {CampaignState} from '../campaign-state.ts';
import type {DispatchIncidentContext} from '../dispatch-incident-context.ts';
import type {CampaignMode} from '../breach-app-mode.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {summarizeMissionPacing} from '../breach-mission-pacing.ts';
import {timelineTime} from '../breach-after-action-timeline.ts';
type Stats=ReturnType<typeof debrief>;
const make=(tag:string,cls='',text?:string)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;return el;
};
const field=(label:string,value:string)=>{
 const card=make('div','fw-v5-mission-field');
 card.append(make('dt','',label),make('dd','',value));return card;
};
const metric=(n:number|null,suffix='')=>
 n===null?'—':String(Math.round(n*10)/10)+suffix;
const section=(title:string,items:readonly [string,string][])=>{
 const root=make('section','fw-v5-mission-section');
 root.append(make('h3','',title));
 const grid=make('dl','fw-v5-mission-grid');
 for(const [label,value] of items)grid.append(field(label,value));
 root.append(grid);return root;
};
export function renderStructuredMissionDetails(input:{
 name:string;stats:Stats;recorder:MissionRecorder;
 campaign:CampaignState|null;campaignMode:CampaignMode;
 incident?:DispatchIncidentContext|null;
 operationsLogged:number;phase:Session['phase'];
}):HTMLElement{
 const {name,stats,recorder,campaign,campaignMode,
  incident,operationsLogged,phase}=input;
 const root=make('article','fw-v5-mission-details');
 const disposition=stats.operationOutcome.disposition;
 root.append(make('div','fw-v5-mission-heading',
   (phase==='won'?'MISSION COMPLETE':disposition==='withdrawn'?
     'SQUAD WITHDRAWN':'MISSION FAILED')+
   ' · '+name.toUpperCase()));
 if(incident)root.append(section('DISPATCH INCIDENT',[
  ['CALL REFERENCE',incident.reference],['ASSIGNMENT',incident.title],
  ['REGION',incident.region],['RISK',String(incident.risk)],
  ['CAMPAIGN DAY',String(incident.day)]
 ]));
 root.append(section('OPERATION ASSESSMENT',[
   ['GRADE',stats.grade],['SCORE',String(stats.score)],
   ['TIME',timelineTime(stats.time)],
   ['OBJECTIVE',stats.objective?'SECURED':'NOT COMPLETED'],
   ['SURVIVORS',String(stats.survived)+' / '+stats.squad.length],
   ['CASUALTIES',String(stats.casualties)],
   ['EXTRACTED',String(stats.operationOutcome.extractedOperatorIds.length)],
   ['EVACUATED CASUALTIES',String(stats.operationOutcome.evacuatedCasualtyIds.length)],
   ['LEFT BEHIND',String(stats.operationOutcome.leftBehindOperatorIds.length)]
 ]));
 if(stats.optionalIntel.total>0)root.append(section('OPTIONAL INTELLIGENCE',[
   ['DISCOVERED',String(stats.optionalIntel.discovered)+' / '+stats.optionalIntel.total],
   ['COLLECTED · FINAL',String(stats.optionalIntel.collected)],
   ['PHYSICALLY RECOVERED',String(stats.optionalIntel.recovered)],
   ['CAMPAIGN CREDIT',campaignMode==='mission'?
     String(stats.optionalIntel.recovered)+' INTEL BEFORE RESOURCE CAP':
     'QUICK PLAY · SCORE ONLY']
 ]));
 if(stats.missingPersonRecovery)root.append(section('MISSING OPERATOR RECOVERY',[
   ['CAREER ID',stats.missingPersonRecovery.operatorId],
   ['RECOVERED BY',stats.squad.find(a=>a.id===stats.missingPersonRecovery!.carrierId)?.name??
     stats.missingPersonRecovery.carrierId],
   ['TRANSPORT','PHYSICAL CUSTODY VERIFIED'],
   ['MEDICAL', 'POST-EVACUATION TREATMENT REQUIRED']
 ]));
 if(stats.scoreComponents?.length){
  const breakdown=make('section','fw-v5-mission-section fw-v5-score-breakdown');
  breakdown.append(make('h3','','SCORE EXPLANATION'));
  const ledger=make('dl','fw-v5-score-ledger');
  for(const component of stats.scoreComponents){
   const row=make('div','fw-v5-score-line');
   const capped=component.label==='SCORE LIMIT'&&component.amount<0;
   row.append(make('dt','',capped?'SCORE CAPPED AT 100':component.label),
     make('dd','',capped?
       String(stats.score-component.amount)+' → '+stats.score:
       (component.amount>0?'+':'')+component.amount));
   ledger.append(row);
  }
  const total=make('div','fw-v5-score-line fw-v5-score-total');
  total.append(make('dt','','FINAL SCORE'),
    make('dd','',String(stats.score)+' · '+stats.grade));
  ledger.append(total);breakdown.append(ledger);
  breakdown.append(make('p','fw-v5-mission-note',
    'Accuracy and pauses are recorded statistics, not scoring modifiers.'));
  root.append(breakdown);
 }
 if(incident){
  const review=stats.forceReview;
  root.append(section('DISPATCH FORCE & CONTACT REVIEW',[
   ['EVIDENCE',review.status==='civilian-harm-documented'?
     'BLUE-ATTRIBUTED CIVILIAN HARM RECORDED':
     'NO BLUE-ATTRIBUTED CIVILIAN HARM IN RETAINED EVIDENCE'],
   ['CIVILIANS INJURED BY SQUAD',String(review.blueCivilianInjured)],
   ['CIVILIANS INCAPACITATED BY SQUAD',String(review.blueCivilianDown)],
   ['OTHER-SIDE CIVILIAN INJURIES',String(review.redCivilianInjured)],
   ['OTHER-SIDE CIVILIAN INCAPACITATIONS',String(review.redCivilianDown)],
   ['SUSPECT CHALLENGES',String(review.challenges)],
   ['RECORDED REFUSALS',String(review.refusals)],
   ['RECORDED SURRENDERS',String(review.surrenders)]
  ]));
  // Incident entries are derived from physics and simulation event IDs;
  // no unseen threat geometry, legal conclusion or guessed evidence.
  if(review.harm.length){
   const harm=make('section','fw-v5-mission-section');
   harm.append(make('h3','','DOCUMENTED CIVILIAN IMPACTS'));
   const rows=make('dl','fw-v5-mission-grid');
   for(const hit of review.harm.slice(0,12)){
    const officer=stats.squad.find(o=>o.id===hit.actorId);
    rows.append(field('SHOT '+hit.shotId+' · '+timelineTime(hit.at),
     (hit.sourceSide==='blue'?'SQUAD · '+(officer?.name??hit.actorId):
      'OTHER SIDE · '+hit.actorId)+' / '+hit.victimId+
      ' / '+hit.severity.toUpperCase()));
   }
   harm.append(rows);
   if(review.harm.length>12)harm.append(make('p','fw-v5-mission-note',
    'Showing 12 of '+review.harm.length+' retained impact records.'));
   root.append(harm);
  }
  root.append(make('p','fw-v5-mission-note',
   'Evidence review, not a legal ruling. Civilian-harm deductions above are '+
   'the existing score penalty; no second penalty is applied.'));
  root.append(make('p','fw-v5-mission-note',
   'A lack of recorded civilian harm does not establish that every use of force was justified.'));
 }
 root.append(section('FIRE & TEMPO',[
   ['SHOTS',String(stats.shots)],['HITS',String(stats.hits)],
   ['ACCURACY',stats.shots>0?stats.accuracy+'%':'—'],
   ['PAUSES',String(stats.pauses)]
 ]));
 const pace=summarizeMissionPacing(recorder.events);
 root.append(section('RECORDED MISSION PACING',[
   ['FIRST VISUAL CONTACT',pace.firstContactAt===null?'—':
     timelineTime(pace.firstContactAt)],
   ['FIRST GUNFIRE',pace.firstShotAt===null?'—':
     timelineTime(pace.firstShotAt)],
   ['OBSERVED OBJECTIVE',pace.objectiveAt===null?'—':
     timelineTime(pace.objectiveAt)],
   ['RECORDED EXTRACTION',pace.extractionAt===null?'—':
     timelineTime(pace.extractionAt)],
   ['CONTACT → OBJECTIVE',metric(pace.contactToObjective,'s')],
   ['OBJECTIVE → EXIT',metric(pace.objectiveToExtraction,'s')]
 ]));
 // Final observed mission outcome is separate from the force/harm review.
 // SECURED WITHOUT RESTRAINT, physically restrained and actively escorted
 // must not collapse into one generic "safe" count.
 const civilianContact=stats.civilianContact;
 if(Object.values(civilianContact).some(n=>n>0))
  root.append(section('CIVILIAN ENCOUNTERS · CLOSEOUT',[
   ['FRIGHTENED / HIDING',String(civilianContact.frightened)],
   ['SECURED · UNRESTRAINED',String(civilianContact.secured)],
   ['RESTRAINED WITH FLEX CUFFS',String(civilianContact.restrained)],
   ['ESCORTED',String(civilianContact.escorted)]
  ]));
 if(stats.type==='capture')root.append(section('CAPTURE TARGET · MEDICAL OUTCOME',[
   ['VITAL STATUS',stats.captureVitals.replaceAll('-',' ').toUpperCase()],
   ['CAPTURE OUTCOME',stats.captureOutcome.replaceAll('-',' ').toUpperCase()],
   ['SECURED AT SCENE',stats.captureSecured?'YES':'NO'],
   ['DEATH RECORDED',stats.captureDeathAt!==null?
     timelineTime(stats.captureDeathAt):'NO CONFIRMED FATALITY']
 ]));
 const rescue=stats.rescueStatus;
 if(rescue!=='none')root.append(section('CIVILIAN RESCUE',[
   ['RESULT',rescue.replaceAll('-',' ').toUpperCase()]
 ]));
 root.append(section('OPERATOR OUTCOMES',
   stats.squad.map(a=>[a.name.toUpperCase(),
     a.survived?(a.injury>=2?'HEAVILY WOUNDED':
       a.injury>0?'WOUNDED':'ACTIVE'):'INCAPACITATED'])));
 if(campaignMode==='mission'){
   const history=campaign?.history??[];
   const recent=history.at(-1);
   const gains=recent?.gains?.flatMap(person=>{
     const member=campaign?.operators.find(op=>op.id===person.id);
     const text=Object.entries(person.gains).filter(([,v])=>(v??0)>0)
       .map(([skill,v])=>skill.replace(/([A-Z])/g,' $1')+
         ' +'+((v??0)*100).toFixed(1)+'%');
     return text.length?[[
       (member?.callsign??person.id).toUpperCase(),text.join(' · ')
     ] as [string,string]]:[];
   })??[];
   root.append(section('CAMPAIGN CONTINUITY',[
     ['OPERATIONS LOGGED',String(operationsLogged)],
     ...(gains.length?gains:
       [['CAREER DEVELOPMENT','NO RECORDED GAINS'] as [string,string]])
   ]));
 }else root.append(make('p','fw-v5-mission-note',
   'QUICK PLAY · NO CAMPAIGN PROGRESSION'));
 if(!recorder.completeness.complete)root.append(make('p',
   'fw-v5-mission-warning',
   'REPLAY INCOMPLETE · authoritative mission result remains valid; '+
   'missing event evidence is not reconstructed'));
 root.append(make('p','fw-v5-mission-note',
   'Pacing is derived from recorded events; — means no verified timestamp.'));
 return root;
}
