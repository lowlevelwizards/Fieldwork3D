/** After Action V2: one stateful full-screen presentation owner.
 * Reuses source recorder and mission results; never mutates combat or replay.
 */
import {buildAfterActionReport,type AfterActionReport} from '../breach-after-action-report.ts';
import {renderSquadView,renderSquadDetails} from './breach-after-action-squad.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {makeAfterActionLaunchRequest} from '../breach-after-action-replay-navigation.ts';
import type {TacticalScene3D,ViewMode} from '../breach-3d.ts';
import type {ReplayCameraController} from '../breach-replay-camera-controller.ts';
import type {ReplayBodycamController} from '../breach-replay-bodycam-controller.ts';
import type {ReplayKnowledgeController} from '../breach-replay-knowledge-controller.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
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
  inspectionMode:'paper'|'3d';selectedHighlight:string|null;
  scroll:Partial<Record<AfterActionTab,number>>;
  showIntel:boolean;
};
const owners=new WeakMap<HTMLElement,State>();
const renderers=new WeakMap<HTMLElement,()=>void>();
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
     selectedHighlight:null,scroll:{},showIntel:options.showIntel};
   owners.set(root,state);
   root.querySelector<HTMLElement>('#afterActionIntro')?.removeAttribute('hidden');
   if(!bound.has(root)){
    bound.add(root);
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]')){
     tabButton.addEventListener('click',()=>{
       const s=owners.get(root);if(!s)return;
       s.scroll[s.tab]=safeContent.scrollTop;
       s.tab=tabButton.dataset.afterTab as AfterActionTab;
       renderers.get(root)?.();
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
     if(e.key==='Escape'){e.preventDefault();dismiss();return;}
     if(e.key!=='Tab'||!details)return;
     const controls=[...details.querySelectorAll<HTMLElement>(
       'button:not([disabled]),a[href],summary')].filter(node=>
         !node.closest('[hidden]'));
     if(!controls.length)return;
     const first=controls[0],last=controls[controls.length-1];
     if(e.shiftKey&&document.activeElement===first){
       e.preventDefault();last.focus();
     }else if(!e.shiftKey&&document.activeElement===last){
       e.preventDefault();first.focus();
     }
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
     replayHighlightMoments(s.recorder),s.recorder,s.selectedHighlight,
     id=>{s.selectedHighlight=id;draw();},(moment)=>{
       s.selectedHighlight=moment.id;
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
   // Reparent the existing model when only the selected shot changes.
   // Rebuilding it on every shot was an expensive V2 regression.
   let modelHost=screen.querySelector<HTMLElement>('[data-after-model]');
   const previousHost=safeContent.querySelector<HTMLElement>('[data-after-model]');
   const reuse=!!(modelHost&&previousHost&&stopModel&&
     modelHost.dataset.afterModel===previousHost.dataset.afterModel);
   if(reuse&&modelHost&&previousHost){
     modelHost.replaceWith(previousHost);modelHost=previousHost;
   }else disposeModel();
   safeContent.replaceChildren(screen);
   if(modelHost&&!reuse){
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
 renderers.set(root,draw);
 draw();
}
/** Direct return context: all selections and visual modes survive clip/unclip.
 * Recorder identity prevents a stale replay from restoring into another mission.
 */
export type AfterActionReturnContext={
 recorder:MissionRecorder;tab:AfterActionTab;operatorId:string|null;
 contactId:string|null;contactSide:'red'|'blue';shotId:number|null;
 highlightId:string|null;paperBack:boolean;inspectionMode:'paper'|'3d';
 detailsOpen:boolean;scroll:Partial<Record<AfterActionTab,number>>;
};
export function afterActionSnapshot(root:HTMLElement):AfterActionReturnContext|null{
 const s=owners.get(root);if(!s)return null;
 const active=root.querySelector<HTMLElement>('#afterActionBody');
 if(active)s.scroll[s.tab]=active.scrollTop;
 return {recorder:s.recorder,tab:s.tab,operatorId:s.selectedOperator,
   contactId:s.selectedContact,contactSide:s.contactSide,
   shotId:s.selectedShotId,highlightId:s.selectedHighlight,
   paperBack:s.paperBack,inspectionMode:s.inspectionMode,
   detailsOpen:!root.querySelector<HTMLElement>('#afterActionDetails')?.hidden,
   scroll:{...s.scroll}};
}
export function restoreAfterActionWorkspace(
 root:HTMLElement,context:AfterActionReturnContext
):boolean{
 const s=owners.get(root);
 if(!s||s.recorder!==context.recorder)return false;
 s.tab=context.tab;s.selectedOperator=context.operatorId;
 s.selectedContact=context.contactId;s.contactSide=context.contactSide;
 s.selectedShotId=context.shotId;s.selectedHighlight=context.highlightId;
 s.paperBack=context.paperBack;s.inspectionMode=context.inspectionMode;
 s.scroll={...context.scroll};
 const detail=root.querySelector<HTMLElement>('#afterActionDetails');
 if(detail)detail.hidden=!context.detailsOpen;
 renderers.get(root)?.();
 return true;
}
/** Rebuild without synthesizing tab clicks or changing the selected context. */
export function refreshAfterActionWorkspace(root:HTMLElement):void{
 const s=owners.get(root);if(!s)return;
 const active=root.querySelector<HTMLElement>('#afterActionBody');
 if(active)s.scroll[s.tab]=active.scrollTop;
 renderers.get(root)?.();
}

/** Bind replay entry and clip control to the existing after-action UI owner.
 * This is UI navigation only; recorder, camera, and playback stay authoritative.
 * Listeners are installed once per persistent debrief root across mission resets. */
export type AfterActionReplayNavigationPorts={
 ui:{watchReplay:HTMLButtonElement;debrief:HTMLElement;
   afterActionClipHud:HTMLElement;afterActionClipLabel:HTMLElement;
   afterActionClipToggle:HTMLButtonElement};
 getRecorder:()=>MissionRecorder;isReplaying:()=>boolean;
 markDebriefEntry:()=>void;enterReplay:()=>void;queueHighlights:()=>void;
 getStage:()=>TacticalScene3D|null;getViewMode:()=>ViewMode;
 cameraMode:(mode:ViewMode)=>void;
 camera:ReplayCameraController;director:ReplayCameraController['director'];
 bodycam:ReplayBodycamController;knowledge:ReplayKnowledgeController;
 startBodycam:()=>boolean;
 chooseCamera:(mode:'free'|'operator'|'squad'|'director')=>void;
 playback:ReplayPlaybackController;presentReplay:()=>void;
 unlockAudio:()=>void;updateReplayHud:()=>void;
 showHelp:(message:string,duration?:number)=>void;
 setReturn:(ctx:AfterActionReturnContext|null)=>void;
 getReturn:()=>AfterActionReturnContext|null;
};
const replayRequestsBound=new WeakSet<HTMLElement>();
export function bindAfterActionReplayNavigation(port:AfterActionReplayNavigationPorts):void{
 const ui=port.ui;
 console.info('[A8 probe] binding replay button',
   location.search,'alreadyBound',replayRequestsBound.has(ui.debrief),
   'connected',ui.watchReplay.isConnected);
 if(replayRequestsBound.has(ui.debrief))return;
 replayRequestsBound.add(ui.debrief);
 ui.watchReplay.addEventListener('click',()=>{
  console.info('[A8 probe] replay button handler',location.search);
  port.markDebriefEntry();port.enterReplay();
  if(port.isReplaying())port.queueHighlights();
 });
 ui.debrief.addEventListener('fw-after-action-replay',event=>{
  const detail=(event as CustomEvent<{
    surface:string;contactId?:string;shotId?:number|null;time:number;end?:number
  }>).detail;
  if(!detail||port.isReplaying())return;
  const rec=port.getRecorder(),request=makeAfterActionLaunchRequest(rec,detail);
  if(!request)return;
  const origin=afterActionSnapshot(ui.debrief);
  port.markDebriefEntry();port.enterReplay();
  if(!port.isReplaying())return;
  port.setReturn(origin);
  port.queueHighlights();
  if(port.getStage()&&port.getViewMode()==='plan2d')port.cameraMode('iso');
  port.camera.camMount='chest';port.camera.lens='cam';
  // Only recorded friendly observer evidence can authorize personal Bodycam.
  const shot=detail.shotId==null?null:
    rec.ballistics.shots.find(s=>s.id===detail.shotId)??null;
  const shooter=shot?.shooterId??null;
  const candidate=shooter&&port.bodycam.observers.includes(shooter)?shooter:
    detail.contactId&&port.bodycam.observers.includes(detail.contactId)?
      detail.contactId:null;
  if(port.getStage()&&candidate){
    port.knowledge.observerId=candidate;
    if(!port.startBodycam())port.chooseCamera('director');
  }else if(port.getStage()&&port.director.camEligibleObservers.length){
    port.chooseCamera('director');
  }else{
    port.camera.lens='ortho';port.chooseCamera('free');
    port.showHelp('BODYCAM UNAVAILABLE · TACTICAL REPLAY',3000);
  }
  port.playback.startIncident(request.range,rec.duration,true,true);
  port.presentReplay();port.unlockAudio();
  ui.afterActionClipHud.hidden=false;
  ui.afterActionClipLabel.textContent=request.label+' · LOOP';
  ui.afterActionClipToggle.textContent='UNCLIP';
  port.updateReplayHud();
 });
 ui.afterActionClipToggle.addEventListener('click',()=>{
  if(!port.isReplaying()||!port.getReturn())return;
  if(port.playback.incident){
    port.playback.unclipIncident();
    ui.afterActionClipToggle.textContent='RECLIP';
    ui.afterActionClipLabel.textContent='FULL REPLAY';
  }else if(port.playback.reclipIncident()){
    ui.afterActionClipToggle.textContent='UNCLIP';
    ui.afterActionClipLabel.textContent='INCIDENT · LOOP';
  }
  port.presentReplay();
 });
}
