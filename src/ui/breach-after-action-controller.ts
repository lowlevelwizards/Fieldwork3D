/** After Action V2: one stateful full-screen presentation owner.
 * Reuses source recorder and mission results; never mutates combat or replay.
 */
import {buildAfterActionReport,type AfterActionReport,
  type OperatorAfterAction} from '../breach-after-action-report.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {renderCombatReport} from './breach-after-action-combat.ts';
import {renderAfterActionHighlights} from './breach-after-action-highlights.ts';
import {replayHighlightMoments} from '../breach-highlight-frames.ts';
let activeModel:HTMLElement|null=null;
let stopModel:(()=>void)|null=null;
let modelRequest=0;
function disposeModel(){modelRequest++;stopModel?.();stopModel=null;activeModel=null;}

export type AfterActionTab='overview'|'squad'|'combat'|'highlights'|'timeline';
type State={
  recorder:MissionRecorder;report:AfterActionReport;tab:AfterActionTab;
  selectedOperator:string|null;selectedContact:string|null;
  selectedShotId:number|null;contactSide:'red'|'blue';paperBack:boolean;
  inspectionMode:'paper'|'3d';
  scroll:Partial<Record<AfterActionTab,number>>;
  showIntel:boolean;
};
const owners=new WeakMap<HTMLElement,State>();
const make=(tag:string,cls='',value?:string)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
};
const button=(text:string,fn:()=>void,cls='fw-after-link')=>{
  const el=document.createElement('button');
  el.type='button';el.className=cls;el.textContent=text;
  el.addEventListener('click',fn);return el;
};
const num=(n:number|null)=>n===null?'NOT RECORDED':String(n);
const time=(seconds:number)=>Math.floor(seconds/60)+':'+
  String(Math.floor(seconds%60)).padStart(2,'0');
function line(label:string,value:string){
 const el=make('div','fw-after-pair');
 el.append(make('span','',label),make('span','',value));
 return el;
}
function rankedCard(op:OperatorAfterAction,click:()=>void){
 const b=button('',click,'fw-after-person');
 const first=make('span');
 first.append(make('b','fw-after-rank',String(op.rank).padStart(2,'0')+'  '),
   make('span','',op.name),
   make('small','',op.status.toUpperCase()+' · '+
     op.incapacitations+' INCAPACITATIONS · '+op.hits+'/'+op.shots+' HITS'));
 b.append(first,make('b','fw-after-score',String(op.contribution)));
 return b;
}
function overview(state:State,open:(tab:AfterActionTab)=>void,
  choose:(id:string)=>void):HTMLElement{
 const section=make('section','fw-after-section');
 section.append(make('p','fw-after-caption',
   'AFTER ACTION / FULL RECONSTRUCTION'),
   make('h2','fw-after-heading','Squad contributions'));
 const rows=make('div','fw-after-rank-list');
 for(const op of state.report.operators)rows.append(rankedCard(op,()=>choose(op.id)));
 section.append(rows);
 const total=state.report.shots.length;
 const hostiles=state.report.hostiles;
 const panel=make('div','fw-after-panel');
 panel.append(make('h3','','OPERATION RECORD'),
   line('Duration',time(state.report.duration)),
   line('Total shots (both sides)',String(total)),
   line('Hostile contacts',String(hostiles.length)),
   line('Incapacitated',String(hostiles.filter(c=>c.resolution==='incapacitated').length)),
   line('Surrendered',String(hostiles.filter(c=>c.resolution==='surrendered').length)));
 section.append(panel,button('EXAMINE ALL CONTACTS',()=>open('combat')));
 if(!state.report.complete)section.append(make('p','fw-after-empty',
   'PARTIAL RECORD — counts may be incomplete.'));
 return section;
}
function squad(state:State,choose:(id:string|null)=>void):HTMLElement{
 const section=make('section','fw-after-section');
 section.append(make('h2','fw-after-heading','SQUAD PERFORMANCE'),
   make('p','fw-after-muted',
     'Contribution rank is descriptive, not the mission grade or Campaign XP.'));
 if(!state.selectedOperator){
   const list=make('div','fw-after-rank-list');
   for(const op of state.report.operators)list.append(rankedCard(op,()=>choose(op.id)));
   section.append(list);return section;
 }
 const op=state.report.operators.find(o=>o.id===state.selectedOperator);
 if(!op){choose(null);return section;}
 section.append(button('‹ ALL OPERATORS',()=>choose(null)),
   make('h2','fw-after-heading',op.name+' / '+op.status.toUpperCase()),
   line('Contribution rank',String(op.rank)+' / '+state.report.operators.length),
   line('Contribution score',String(op.contribution)));
 const cats=make('div','fw-after-bars');
 for(const [name,value] of Object.entries(op.categories))
   cats.append(make('span','',name.toUpperCase()+' '+value));
 section.append(cats);
 const panel=make('div','fw-after-panel');
 panel.append(make('h3','','RECORDED CONTRIBUTIONS'),
   line('Shots / verified hits',op.shots+' / '+op.hits),
   line('Damaging hits',String(op.damagingHits)),
   line('Armor-stopped hits',String(op.armorStops)),
   line('Incapacitations',String(op.incapacitations)),
   line('Contact reports',String(op.contactReports)),
   line('Doors opened',num(op.doorsOpened)),
   line('Doors forced',num(op.doorsForced)),
   line('Windows traversed',num(op.windowsTraversed)));
 section.append(panel,make('p','fw-after-muted',
   'Support actions appear only when the recording contains structured completion evidence.'));
 return section;
}
export function renderAfterActionWorkspace(root:HTMLElement,rec:MissionRecorder,
  options:{showIntel:boolean}):void{
 const content=root.querySelector<HTMLElement>('#afterActionBody');
 const nav=root.querySelector<HTMLElement>('#afterActionTabs');
 const intel=root.querySelector<HTMLElement>('#debriefIntelBlock');
 const raw=root.querySelector<HTMLElement>('#debriefStats')?.parentElement;
 if(!content||!nav)return;
 const safeContent=content,safeNav=nav;
 let state=owners.get(root);
 if(!state||state.recorder!==rec){
   state={recorder:rec,report:buildAfterActionReport(rec),tab:'overview',
     selectedOperator:null,selectedContact:null,selectedShotId:null,
     contactSide:'red',paperBack:false,inspectionMode:'paper',
     scroll:{},showIntel:options.showIntel};
   owners.set(root,state);
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]')){
     tabButton.addEventListener('click',()=>{
       const s=owners.get(root);if(!s)return;
       s.scroll[s.tab]=safeContent.scrollTop;
       s.tab=tabButton.dataset.afterTab as AfterActionTab;
       draw();
     });
   }
 }else{
   state.showIntel=options.showIntel;
   return; // Never destroy selected tabs and scroll on repeated HUD updates.
 }
 root.classList.add('fw-debrief-v2');
 function draw():void{
   const s=owners.get(root);if(!s)return;
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]'))
     tabButton.setAttribute('aria-pressed',
       String(tabButton.dataset.afterTab===s.tab));
   if(intel)intel.hidden=s.tab!=='timeline'||!s.showIntel;
   if(raw)raw.hidden=s.tab!=='timeline';
   const change=(tab:AfterActionTab)=>{s.scroll[s.tab]=safeContent.scrollTop;s.tab=tab;draw();};
   const choose=(id:string|null)=>{s.selectedOperator=id;s.tab='squad';draw();};
   let screen:HTMLElement;
   if(s.tab==='overview')screen=overview(s,change,id=>choose(id));
   else if(s.tab==='squad')screen=squad(s,choose);
   else if(s.tab==='combat')screen=renderCombatReport(s.report,{
     selectedContact:s.selectedContact,selectedShotId:s.selectedShotId,
     side:s.contactSide,back:s.paperBack,inspectionMode:s.inspectionMode
   },{
     chooseContact:(id)=>{s.selectedContact=id;s.selectedShotId=null;draw();},
     chooseShot:(id)=>{s.selectedShotId=id;draw();},
     chooseSide:(side)=>{s.contactSide=side;s.selectedContact=null;
       s.selectedShotId=null;draw();},
     chooseView:(back)=>{s.paperBack=back;draw();},
     chooseMode:(mode)=>{s.inspectionMode=mode;draw();},
     viewReplay:(contact,shot)=>{
       root.dispatchEvent(new CustomEvent('fw-after-action-replay',{
         bubbles:true,detail:{surface:'combat',contactId:contact.id,
           shotId:shot?.id??null,time:shot?.at??contact.resolvedAt??0}
       }));
     }
   });
   else if(s.tab==='highlights')screen=renderAfterActionHighlights(
     replayHighlightMoments(s.recorder),s.recorder,(moment)=>{
       root.dispatchEvent(new CustomEvent('fw-after-action-replay',{
         bubbles:true,detail:{surface:'highlights',time:moment.at,
           end:moment.end,highlightId:moment.id}
       }));
     });
   else if(s.tab==='timeline'){
     screen=make('section','fw-after-section');
     screen.append(make('h2','fw-after-heading','TACTICAL RECORD'),
       make('p','fw-after-muted','Expand intelligence and full report below.'));
   }else{
     screen=make('section','fw-after-section');
     screen.append(make('p','fw-after-empty','REPORT SECTION UNAVAILABLE'));
   }
   disposeModel();
   safeContent.replaceChildren(screen);
   const modelHost=screen.querySelector<HTMLElement>('[data-after-model]');
   if(modelHost){
     const chosen=s.recorder.manifest?.actors.find(a=>
       a.id===s.selectedContact);
     if(chosen){
       const token=++modelRequest;
       activeModel=modelHost;
       void import('./breach-after-action-model.ts').then(module=>{
         if(modelRequest!==token||!modelHost.isConnected||activeModel!==modelHost)return;
         stopModel=module.mountAfterActionModel(modelHost,chosen);
       }).catch(()=>{if(modelHost.isConnected)
         modelHost.textContent='3D VIEW UNAVAILABLE ON THIS DEVICE';});
     }
   }
   safeContent.scrollTop=s.scroll[s.tab]??0;
 }
 draw();
}
/** Used by scoped replay to restore the originating detail and viewport. */
export function afterActionSnapshot(root:HTMLElement):{
 tab:AfterActionTab;operatorId:string|null;contactId:string|null;
 scroll:Partial<Record<AfterActionTab,number>>;
}|null{
 const s=owners.get(root);if(!s)return null;
 const current=root.querySelector<HTMLElement>('#afterActionBody');
 if(current)s.scroll[s.tab]=current.scrollTop;
 return {tab:s.tab,operatorId:s.selectedOperator,contactId:s.selectedContact,
   scroll:{...s.scroll}};
}

/** Rebuild when a replay visit has captured new authentic frames. */
export function refreshAfterActionWorkspace(root:HTMLElement):void{
 const s=owners.get(root);if(!s)return;
 const active=root.querySelector<HTMLElement>('#afterActionBody');
 const button=root.querySelector<HTMLButtonElement>(
   '[data-after-tab="'+s.tab+'"]');
 if(active)s.scroll[s.tab]=active.scrollTop;
 button?.click();
}
