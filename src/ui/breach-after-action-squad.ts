/** V3-B: immediate visual operator selection, three metrics and proof-based distinctions. */
import type {AfterActionReport,OperatorAfterAction}
 from '../breach-after-action-report.ts';
import type {ReplayManifest} from '../breach-replay-manifest.ts';
import {createSquadMiniature} from './breach-after-action-miniature.ts';
const el=(tag:string,cls='',label?:string)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(label!==undefined)e.textContent=label;return e;
};
function action(label:string,onClick:()=>void,cls:string){
 const b=document.createElement('button');b.type='button';b.className=cls;
 b.textContent=label;b.addEventListener('click',onClick);return b;
}
function metric(value:string,label:string){
 const e=el('div','fw-v3-metric');
 e.append(el('strong','',value),el('span','',label));return e;
}
function achievement(op:OperatorAfterAction):string|null{
 if(op.status==='incapacitated')return 'INCAPACITATED';
 if(op.status==='heavy')return 'HEAVILY WOUNDED';
 if(op.status==='wounded')return 'WOUNDED IN ACTION';
 if(op.incapacitations>0&&op.shots>=5&&op.hits===op.shots)
   return 'MARKSMAN · PERFECT ACCURACY';
 if((op.doorsForced??0)>0)return 'ENTRY SPECIALIST';
 if((op.windowsTraversed??0)>0)return 'WINDOW ENTRY';
 if(op.categories.objective>0)return 'OBJECTIVE CONTRIBUTOR';
 if(op.contactReports>0)return 'CONTACT REPORTER';
 if(op.rank===1&&op.contribution>0)return 'TOP CONTRIBUTOR';
 return null;
}
function contextMetric(op:OperatorAfterAction){
 if(op.categories.objective>0)return metric(String(op.categories.objective),'OBJECTIVE');
 if((op.doorsForced??0)>0)return metric(String(op.doorsForced),'FORCED DOORS');
 if((op.windowsTraversed??0)>0)return metric(String(op.windowsTraversed),'WINDOW ENTRIES');
 if(op.contactReports>0)return metric(String(op.contactReports),'CONTACTS');
 if((op.doorsOpened??0)>0)return metric(String(op.doorsOpened),'DOORS OPENED');
 if(op.shots>0)return metric(Math.round(op.hits/op.shots*100)+'%','ACCURACY');
 return metric('—','NO RECORDED ACTION');
}
export function renderSquadView(report:AfterActionReport,
 manifest:ReplayManifest|null,selectedId:string|null,
 choose:(id:string)=>void,more:()=>void):HTMLElement{
 const section=el('section','fw-v3-squad');
 const operators=report.operators;
 const selected=operators.find(o=>o.id===selectedId)??operators[0]??null;
 if(!selected){section.append(el('p','fw-after-empty','NO SQUAD RECORD AVAILABLE'));return section;}
 const roster=el('nav','fw-v3-roster');
 roster.setAttribute('aria-label','Select an operator');
 for(const op of operators){
   const card=action('',()=>choose(op.id),'fw-v3-roster-card');
   card.setAttribute('aria-pressed',String(op.id===selected.id));
   card.setAttribute('aria-label',op.name+' · '+op.status);
   const identity=manifest?.actors.find(a=>a.id===op.id)??null;
   card.append(createSquadMiniature(identity),el('strong','',op.name),
     el('small','',op.status==='active'?'ACTIVE':op.status.toUpperCase()));
   roster.append(card);
 }
 section.append(roster);
 const main=el('div','fw-v3-squad-focus');
 const figure=el('div','fw-v3-hero-figure');
 const identity=manifest?.actors.find(a=>a.id===selected.id)??null;
 figure.append(createSquadMiniature(identity,true));
 const info=el('div','fw-v3-squad-info');
 const name=el('div','fw-v3-squad-name');
 name.append(el('small','',String(selected.rank).padStart(2,'0')+
   ' / '+String(operators.length)+' · CONTRIBUTION RANK'),
   el('h2','',selected.name),
   el('span','',selected.status.toUpperCase()));
 const metrics=el('div','fw-v3-metrics');
 metrics.append(
   metric(selected.shots?selected.hits+'/'+selected.shots:'—','HITS / SHOTS'),
   metric(String(selected.incapacitations),'INCAPACITATIONS'),
   contextMetric(selected)
 );
 info.append(name,metrics);
 const earned=achievement(selected);
 if(earned)info.append(el('div','fw-v3-distinction','✦ '+earned));
 info.append(action('FULL OPERATOR RECORD',more,'fw-v3-details-link'));
 main.append(figure,info);section.append(main);
 if(!report.complete)section.append(el('p','fw-after-muted',
   'PARTIAL REPLAY · SOME CONTRIBUTIONS MAY BE UNRECORDED'));
 return section;
}
export function renderSquadDetails(op:OperatorAfterAction):HTMLElement{
 const root=el('section','fw-v3-operator-details');
 root.append(el('h3','',op.name+' / RECORDED CONTRIBUTIONS'));
 const pairs:[string,string][]=[
  ['RANK',String(op.rank)],['CONTRIBUTION SCORE',String(op.contribution)],
  ['SHOTS',String(op.shots)],['HITS',String(op.hits)],
  ['DAMAGING HITS',String(op.damagingHits)],
  ['NON-DAMAGING HITS',String(op.armorStops)],
  ['INCAPACITATIONS',String(op.incapacitations)],
  ['CONTACT REPORTS',String(op.contactReports)],
  ['DOORS OPENED',op.doorsOpened===null?'NOT RECORDED':String(op.doorsOpened)],
  ['DOORS FORCED',op.doorsForced===null?'NOT RECORDED':String(op.doorsForced)],
  ['WINDOW ENTRIES',op.windowsTraversed===null?'NOT RECORDED':String(op.windowsTraversed)]
 ];
 for(const [label,value] of pairs){
  const row=el('div','fw-after-pair');
  row.append(el('span','',label),el('span','',value));root.append(row);
 }
 const notice=el('p','fw-after-muted',
  'Contribution is a retrospective summary, not the mission grade or Campaign XP.');
 root.append(notice);return root;
}
