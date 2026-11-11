/** After Action V4-5 — structured, authoritative mission summary.
 * Scores and mission outcomes come from debrief(Session), never inferred from
 * partial replay film or prose. Recorded pacing is clearly observational.
 */
import type {debrief,Session} from '../breach-game.ts';
import type {CampaignState} from '../campaign-state.ts';
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
 operationsLogged:number;phase:Session['phase'];
}):HTMLElement{
 const {name,stats,recorder,campaign,campaignMode,
  operationsLogged,phase}=input;
 const root=make('article','fw-v5-mission-details');
 root.append(make('div','fw-v5-mission-heading',
   (phase==='won'?'MISSION COMPLETE':'MISSION FAILED')+
   ' · '+name.toUpperCase()));
 root.append(section('OPERATION ASSESSMENT',[
   ['GRADE',stats.grade],['SCORE',String(stats.score)],
   ['TIME',timelineTime(stats.time)],
   ['OBJECTIVE',stats.objective?'SECURED':'NOT COMPLETED'],
   ['SURVIVORS',String(stats.survived)+' / '+stats.squad.length],
   ['CASUALTIES',String(stats.casualties)]
 ]));
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
 const rescue=stats.rescueStatus;
 if(rescue!=='none')root.append(section('CIVILIAN RESCUE',[
   ['RESULT',rescue.replaceAll('-',' ').toUpperCase()]
 ]));
 root.append(section('OPERATOR OUTCOMES',
   stats.squad.map(a=>[a.name.toUpperCase(),
     a.survived?(a.injury?'WOUNDED':'ACTIVE'):'INCAPACITATED'])));
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
