/** After Action V2: one stateful full-screen presentation owner.
 * Reuses source recorder and mission results; never mutates combat or replay.
 */
import {buildAfterActionReport,type AfterActionReport} from '../breach-after-action-report.ts';
import {renderSquadView,renderSquadDetails} from './breach-after-action-squad.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {renderCombatReport} from './breach-after-action-combat.ts';
import {renderAfterActionHighlights} from './breach-after-action-highlights.ts';
import {replayHighlightMoments} from '../breach-highlight-frames.ts';
let activeModel:HTMLElement|null=null;
let stopModel:(()=>void)|null=null;
let modelRequest=0;
function disposeModel(){modelRequest++;stopModel?.();stopModel=null;activeModel=null;}

export type AfterActionTab='squad'|'combat'|'highlights';
type State={
  recorder:MissionRecorder;report:AfterActionReport;tab:AfterActionTab;
  selectedOperator:string|null;selectedContact:string|null;
  selectedShotId:number|null;contactSide:'red'|'blue';paperBack:boolean;
  inspectionMode:'paper'|'3d';
  scroll:Partial<Record<AfterActionTab,number>>;
  showIntel:boolean;
};
const owners=new WeakMap<HTMLElement,State>();
const bound=new WeakSet<HTMLElement>();
const make=(tag:string,cls='',value?:string)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
};
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
   state={recorder:rec,report:buildAfterActionReport(rec),tab:'squad',
     selectedOperator:null,selectedContact:null,selectedShotId:null,
     contactSide:'red',paperBack:false,inspectionMode:'paper',
     scroll:{},showIntel:options.showIntel};
   owners.set(root,state);
   root.querySelector<HTMLElement>('#afterActionIntro')?.removeAttribute('hidden');
   if(!bound.has(root)){
    bound.add(root);
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]')){
     tabButton.addEventListener('click',()=>{
       const s=owners.get(root);if(!s)return;
       s.scroll[s.tab]=safeContent.scrollTop;
       s.tab=tabButton.dataset.afterTab as AfterActionTab;
       draw();
     });
   }
   const intro=root.querySelector<HTMLElement>('#afterActionIntro');
   root.querySelector<HTMLButtonElement>('#afterActionContinue')?.addEventListener('click',()=>{
     if(intro)intro.hidden=true;
   });
   const details=root.querySelector<HTMLElement>('#afterActionDetails');
   const open=root.querySelector<HTMLButtonElement>('#afterActionDetailsToggle');
   const close=root.querySelector<HTMLButtonElement>('#afterActionDetailsClose');
   const dismiss=()=>{if(details){details.hidden=true;open?.focus();}};
   open?.addEventListener('click',()=>{if(details){details.hidden=false;close?.focus();}});
   close?.addEventListener('click',dismiss);
   details?.addEventListener('keydown',e=>{
     if(e.key==='Escape'){e.preventDefault();dismiss();}
   });
   }
 }else{
   state.showIntel=options.showIntel;
   return; // Never destroy selected tabs and scroll on repeated HUD updates.
 }
 root.classList.add('fw-debrief-v3');
 root.classList.remove('fw-debrief-v2');
 function draw():void{
   const s=owners.get(root);if(!s)return;
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]'))
     tabButton.setAttribute('aria-pressed',
       String(tabButton.dataset.afterTab===s.tab));
   if(intel)intel.hidden=!s.showIntel;
   if(raw)raw.hidden=false;
   const choose=(id:string|null)=>{s.selectedOperator=id;s.tab='squad';draw();};
   let screen:HTMLElement;
   if(s.tab==='squad')screen=renderSquadView(s.report,s.recorder.manifest,
     s.selectedOperator,(id)=>choose(id),()=>
       root.querySelector<HTMLButtonElement>('#afterActionDetailsToggle')?.click());
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
   else{
     screen=make('section','fw-after-section');
     screen.append(make('p','fw-after-empty','REPORT SECTION UNAVAILABLE'));
   }
   const operatorDetails=root.querySelector<HTMLElement>('#afterActionOperatorDetail');
   if(operatorDetails){
     const operator=s.report.operators.find(o=>o.id===s.selectedOperator);
     operatorDetails.replaceChildren(operator?renderSquadDetails(operator):
       make('p','fw-after-muted','Select an operator to inspect their full record.'));
   }
   const forensicDetails=root.querySelector<HTMLElement>('#afterActionContactDetail');
   if(forensicDetails){
     const contact=(s.contactSide==='red'?s.report.hostiles:
       s.report.friendlyCasualties).find(c=>c.id===s.selectedContact);
     const ledger=make('div','fw-v3-ledger');
     if(contact){
       ledger.append(make('h3','',contact.name+' / SHOT HISTORY'));
       for(const shot of contact.shots){
         const row=make('div','fw-after-pair');
         const result=shot.outcome==='non-damaging'?'NO DAMAGE':
           shot.outcome.replaceAll('-',' ').toUpperCase();
         row.append(make('span','',String(shot.id)+' · '+shot.shooterId),
           make('span','',result+' · '+(shot.region??'UNKNOWN')));
         ledger.append(row);
       }
     }
     forensicDetails.replaceChildren(ledger);
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
