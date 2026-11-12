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
import type {AfterActionModelPresenter} from './breach-after-action-model.ts';
import {buildAfterActionTimeline,TIMELINE_FILTERS,
 type AfterActionTimelineEvent,type TimelineFilter}
 from '../breach-after-action-timeline.ts';
import {renderAfterActionTimeline} from './breach-after-action-timeline.ts';
import {inspectForensicEvidence,type ForensicScope,
 type ForensicEvidence} from '../breach-forensic-evidence.ts';

/** Exactly one historical 3D presentation per debrief root and recording.
 * A tab/selection redraw moves its canvas, never rebuilding its rigs.
 */
type ModelOwner={
 recorder:MissionRecorder;presenter:AfterActionModelPresenter|null;
 pending:boolean;unavailable:boolean;version:number;
};
const models=new WeakMap<HTMLElement,ModelOwner>();
export function disposeAfterActionPresentation(root:HTMLElement):void{
 const owner=models.get(root);
 if(!owner)return;
 owner.version++;owner.presenter?.dispose();models.delete(root);
}
function presentModel(root:HTMLElement,recorder:MissionRecorder,
 host:HTMLElement|null,operatorId:string|null,
 evidence:ForensicEvidence|null):void{
 const fallback=()=>{
   const state=owners.get(root);
   if(state?.recorder===recorder&&state.tab==='combat'&&
     state.inspectionMode==='3d'){
     state.inspectionMode='paper';
     queueMicrotask(()=>renderers.get(root)?.());
   }
 };
 let owner=models.get(root);
 if(owner&&owner.recorder!==recorder){
   disposeAfterActionPresentation(root);owner=undefined;
 }
 if(!owner){
   owner={recorder,presenter:null,pending:false,unavailable:false,version:0};
   models.set(root,owner);
 }
 if(!host){owner.presenter?.hide();return;}
 if(owner.presenter){
   owner.presenter.setEvidence(evidence);
   owner.presenter.show(host,operatorId);return;
 }
 const identities=recorder.manifest?.actors??[];
 if(!identities.length){
   host.textContent='NO RECORDED HISTORICAL MODEL';fallback();return;
 }
 if(owner.unavailable){
   host.textContent='3D UNAVAILABLE · RECORDED DETAILS STILL AVAILABLE';
   fallback();return;
 }
 if(owner.pending)return;
 owner.pending=true;
 const version=++owner.version;
 // Dynamic module load never touches live simulation or mission report.
 void import('./breach-after-action-model.ts').then(module=>{
   if(models.get(root)!==owner||owner.version!==version)return;
   owner.pending=false;
   owner.presenter=module.createAfterActionModelPresenter(identities,()=>{
     owner.unavailable=true;
     owner.presenter?.dispose();owner.presenter=null;
     fallback();
   });
   const current=root.querySelector<HTMLElement>(
     '[data-after-squad-model], [data-after-model]');
   if(!owner.presenter){
     owner.unavailable=true;
     if(current)current.textContent='3D UNAVAILABLE · RECORDED DETAILS STILL AVAILABLE';
     fallback();return;
   }
   if(current){
     const id=current.hasAttribute('data-after-squad-model')?
       owners.get(root)?.selectedOperator??null:
       current.dataset.afterModel??null;
     owner.presenter.setEvidence(currentCombatEvidence(root));
     owner.presenter.show(current,id);
   }
 }).catch(()=>{
   if(models.get(root)!==owner||owner.version!==version)return;
   owner.pending=false;owner.unavailable=true;
   const current=root.querySelector<HTMLElement>(
     '[data-after-squad-model], [data-after-model]');
   if(current)current.textContent='3D UNAVAILABLE · RECORDED DETAILS STILL AVAILABLE';
   fallback();
 });
}

export type AfterActionTab='squad'|'combat'|'highlights';
type State={
  recorder:MissionRecorder;report:AfterActionReport;tab:AfterActionTab;
  selectedOperator:string|null;selectedContact:string|null;
  selectedShotId:number|null;contactSide:'red'|'blue';paperBack:boolean;
  inspectionMode:'paper'|'3d';forensicScope:ForensicScope;
  selectedHighlight:string|null;
  operatorRecordOpen:boolean;summaryCompact:boolean;
  scroll:Partial<Record<AfterActionTab,number>>;
  showIntel:boolean;
  timelineEvents:readonly AfterActionTimelineEvent[];
  timelineFilter:TimelineFilter;timelineSelectedKey:string|null;
  timelineClusterId:string|null;timelineLedgerOpen:boolean;
  timelineLedgerLimit:number;timelineRailScroll:number;
  timelineGroupScroll:number;timelineLedgerScroll:number;
};
const owners=new WeakMap<HTMLElement,State>();
function currentCombatEvidence(root:HTMLElement):ForensicEvidence|null{
 const s=owners.get(root);
 if(!s||s.tab!=='combat'||s.inspectionMode!=='3d')return null;
 const contacts=s.contactSide==='red'?
   s.report.hostiles:s.report.friendlyCasualties;
 const contact=contacts.find(c=>c.id===s.selectedContact)??
   contacts[0]??null;
 return contact?inspectForensicEvidence(contact,
   s.selectedShotId,s.forensicScope):null;
}
const renderers=new WeakMap<HTMLElement,()=>void>();
const timelineRenderers=new WeakMap<HTMLElement,()=>void>();
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
   disposeAfterActionPresentation(root);
   state={recorder:rec,report:buildAfterActionReport(rec),tab:'squad',
     selectedOperator:null,selectedContact:null,selectedShotId:null,
     contactSide:'red',paperBack:false,inspectionMode:'3d',
     forensicScope:'cumulative',
     selectedHighlight:null,operatorRecordOpen:false,summaryCompact:false,
     scroll:{},showIntel:options.showIntel,
     timelineEvents:buildAfterActionTimeline(rec),
     timelineFilter:'key',timelineSelectedKey:null,timelineClusterId:null,
     timelineLedgerOpen:false,timelineLedgerLimit:30,timelineRailScroll:0,
     timelineGroupScroll:0,timelineLedgerScroll:0};
   owners.set(root,state);
   // A new recording never inherits a previous mission's open report sheet.
   const oldDetails=root.querySelector<HTMLElement>('#afterActionDetails');
   if(oldDetails)oldDetails.hidden=true;
   if(!bound.has(root)){
    bound.add(root);
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]')){
     tabButton.addEventListener('click',()=>{
       const s=owners.get(root);if(!s)return;
       s.scroll[s.tab]=safeContent.scrollTop;
        s.summaryCompact=true;
        s.tab=tabButton.dataset.afterTab as AfterActionTab;
       renderers.get(root)?.();
     });
   }
   const summaryToggle=root.querySelector<HTMLButtonElement>('#afterActionSummaryToggle');
    const syncSummary=()=>{
      const current=owners.get(root);if(!current)return;
      root.classList.toggle('fw-v5-summary-compact',current.summaryCompact);
      if(summaryToggle){
        summaryToggle.textContent=current.summaryCompact?'RESULT ▾':'SUMMARY ▴';
        summaryToggle.setAttribute('aria-expanded',String(!current.summaryCompact));
        summaryToggle.setAttribute('aria-label',
          current.summaryCompact?'Expand mission result':'Collapse mission result');
      }
    };
    summaryToggle?.addEventListener('click',()=>{
      const current=owners.get(root);if(!current)return;
      current.summaryCompact=!current.summaryCompact;syncSummary();
    });
    safeContent.addEventListener('scroll',()=>{
      const current=owners.get(root);if(!current)return;
      // Selection redraws replace the section DOM, not the player's reading position.
      current.scroll[current.tab]=safeContent.scrollTop;
      if(current.summaryCompact||safeContent.scrollTop<24)return;
      current.summaryCompact=true;syncSummary();
    },{passive:true});
    const details=root.querySelector<HTMLElement>('#afterActionDetails');
    const open=root.querySelector<HTMLButtonElement>('#afterActionDetailsToggle');
   const close=root.querySelector<HTMLButtonElement>('#afterActionDetailsClose');
   const dismiss=()=>{if(details){details.hidden=true;open?.focus();}};
   open?.addEventListener('click',()=>{
     if(details){
       details.hidden=false;
       timelineRenderers.get(root)?.();
       close?.focus();
     }
   });
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
   // A menu exit can release GPU resources while retaining this report.
   // Reopening the same completed mission remounts its presenter once.
   if(!models.has(root)&&!root.hidden)renderers.get(root)?.();
   return; // Never destroy selections or scroll on repeated HUD updates.
 }
 root.classList.add('fw-debrief-v3','fw-v5-workspace');
 root.classList.remove('fw-debrief-v2');
 const drawTimeline=():void=>{
   const s=owners.get(root),host=root.querySelector<HTMLElement>(
     '#afterActionTimeline');
   if(!s||!host)return;
   const previous=host.querySelector<HTMLElement>('.fw-v5-timeline-rail');
   if(previous)s.timelineRailScroll=previous.scrollLeft;
   const oldGroup=host.querySelector<HTMLElement>('.fw-v5-timeline-group-items');
   if(oldGroup)s.timelineGroupScroll=oldGroup.scrollTop;
   const oldLedger=host.querySelector<HTMLElement>('.fw-v5-timeline-ledger-list');
   if(oldLedger)s.timelineLedgerScroll=oldLedger.scrollTop;
   const hidden=root.querySelector<HTMLElement>('#afterActionDetails')?.hidden;
   if(hidden)return;
   const focused=document.activeElement instanceof HTMLElement&&
     host.contains(document.activeElement)?document.activeElement:null;
   const priorEvent=focused?.dataset.timelineEventKey??null;
   const priorCluster=focused?.dataset.timelineCluster??null;
   const priorFilter=focused?.dataset.timelineFilter??null;
   const priorStep=focused?.dataset.timelineStep??null;
   const priorClass=focused?.className??'';
   const actorName=(id:string):string=>
     s.recorder.manifest?.actors.find(actor=>actor.id===id)?.name??
       'UNKNOWN RECORDED ACTOR';
   const contacts=[...s.report.hostiles,...s.report.friendlyCasualties];
   const toContact=(event:AfterActionTimelineEvent)=>
     contacts.find(c=>c.id===event.targetId||
       (event.category==='casualty'&&c.id===event.actorId))??null;
   const toOperator=(event:AfterActionTimelineEvent)=>
     s.report.operators.find(op=>op.id===event.actorId)??null;
   const persist=()=>timelineRenderers.get(root)?.();
   const panel=renderAfterActionTimeline({
     events:s.timelineEvents,duration:s.recorder.duration,
     width:host.clientWidth||host.parentElement?.clientWidth||640,
     complete:s.recorder.completeness.complete,
     state:{filter:s.timelineFilter,selectedKey:s.timelineSelectedKey,
       clusterId:s.timelineClusterId,ledgerOpen:s.timelineLedgerOpen,
       ledgerLimit:s.timelineLedgerLimit},
     actorName,
     inspectLabel:event=>toContact(event)?'INSPECT COMBAT':
       toOperator(event)?'INSPECT OPERATOR':null,
     highlightsAvailable:replayHighlightMoments(s.recorder).length>0,
     actions:{
       filter:value=>{
         s.timelineFilter=value;s.timelineClusterId=null;
         if(value!=='all'&&!s.timelineEvents.some(e=>
           e.key===s.timelineSelectedKey&&
           (value==='key'?e.priority>=7:e.category===value))){
           s.timelineSelectedKey=s.timelineEvents.find(e=>
             value==='key'?e.priority>=7:e.category===value)?.key??null;
         }
         s.timelineGroupScroll=0;s.timelineLedgerScroll=0;
         s.timelineLedgerLimit=30;persist();
       },
       select:key=>{
         if(!s.timelineEvents.some(e=>e.key===key))return;
         s.timelineSelectedKey=key;s.timelineClusterId=null;persist();
       },
       selectCluster:(id,key)=>{
         s.timelineClusterId=id;s.timelineSelectedKey=key;
         s.timelineGroupScroll=0;persist();
       },
       ledger:open=>{
         s.timelineLedgerOpen=open;s.timelineLedgerScroll=0;persist();
       },
       more:()=>{s.timelineLedgerLimit+=30;persist();},
       watch:event=>{
         root.dispatchEvent(new CustomEvent('fw-after-action-replay',{
           bubbles:true,detail:{surface:'timeline',time:event.t,
             shotId:event.shotId,
             contactId:event.shotId!==null?
               event.targetId??undefined:undefined}
         }));
       },
       inspect:event=>{
         const contact=toContact(event),operator=toOperator(event);
         if(!contact&&!operator)return;
         s.scroll[s.tab]=safeContent.scrollTop;
         if(contact){
           s.contactSide=contact.side;s.selectedContact=contact.id;
           s.selectedShotId=event.shotId!==null&&
             contact.shots.some(shot=>shot.id===event.shotId)?
               event.shotId:null;
           s.tab='combat';
         }else if(operator){
           s.selectedOperator=operator.id;
           s.operatorRecordOpen=true;s.tab='squad';
         }
         const details=root.querySelector<HTMLElement>('#afterActionDetails');
         if(details)details.hidden=true;
         renderers.get(root)?.();
         const focus=contact?
           root.querySelector<HTMLButtonElement>('[data-after-tab="combat"]'):
           root.querySelector<HTMLButtonElement>('.fw-v4-record-back');
         focus?.focus({preventScroll:true});
       },
       highlights:()=>{
         s.scroll[s.tab]=safeContent.scrollTop;s.tab='highlights';
         const details=root.querySelector<HTMLElement>('#afterActionDetails');
         if(details)details.hidden=true;
         renderers.get(root)?.();
         root.querySelector<HTMLButtonElement>(
           '[data-after-tab="highlights"]')?.focus({preventScroll:true});
       }
     }
   });
   host.replaceChildren(panel);
   const rail=host.querySelector<HTMLElement>('.fw-v5-timeline-rail');
   if(rail)rail.scrollLeft=s.timelineRailScroll;
   const group=host.querySelector<HTMLElement>('.fw-v5-timeline-group-items');
   if(group)group.scrollTop=s.timelineGroupScroll;
   const ledger=host.querySelector<HTMLElement>('.fw-v5-timeline-ledger-list');
   if(ledger)ledger.scrollTop=s.timelineLedgerScroll;
   if(focused){
     const buttons=[...host.querySelectorAll<HTMLButtonElement>('button')];
     const restored=buttons.find(node=>priorEvent!==null&&
       node.dataset.timelineEventKey===priorEvent&&
       (priorClass.includes('ledger-item')?
         node.className.includes('ledger-item'):true))??
       buttons.find(node=>priorCluster!==null&&
         node.dataset.timelineCluster===priorCluster)??
       buttons.find(node=>priorFilter!==null&&
         node.dataset.timelineFilter===priorFilter)??
       buttons.find(node=>priorStep!==null&&
         node.dataset.timelineStep===priorStep)??
       buttons.find(node=>priorClass.includes('ledger-toggle')&&
         node.className.includes('ledger-toggle'))??
       buttons.find(node=>priorClass.includes('timeline-more')&&
         node.className.includes('timeline-more'))??null;
     if(restored&&!restored.disabled)restored.focus({preventScroll:true});
   }
 };
 timelineRenderers.set(root,drawTimeline);
 function draw():void{
   const s=owners.get(root);if(!s)return;
   for(const tabButton of safeNav.querySelectorAll<HTMLButtonElement>('[data-after-tab]'))
     tabButton.setAttribute('aria-pressed',
       String(tabButton.dataset.afterTab===s.tab));
   if(intel)intel.hidden=!s.showIntel;
   if(raw)raw.hidden=false;
   root.classList.toggle('fw-v5-summary-compact',s.summaryCompact);
    const summary=root.querySelector<HTMLButtonElement>('#afterActionSummaryToggle');
    if(summary){
      summary.textContent=s.summaryCompact?'RESULT ▾':'SUMMARY ▴';
      summary.setAttribute('aria-expanded',String(!s.summaryCompact));
      summary.setAttribute('aria-label',
        s.summaryCompact?'Expand mission result':'Collapse mission result');
    }
    root.classList.toggle('fw-v4-record-open',s.tab==='squad'&&s.operatorRecordOpen);
   root.classList.toggle('fw-v4-squad-active',s.tab==='squad');
   const choose=(id:string|null)=>{
     if(id===s.selectedOperator&&s.tab==='squad'&&!s.operatorRecordOpen)return;
     s.selectedOperator=id;s.operatorRecordOpen=false;s.tab='squad';
      s.summaryCompact=true;draw();
     // Redraw replaces buttons; keep keyboard/switch access anchored to the
     // corresponding rank choice, not a destroyed DOM element.
     const selectedHeading=id===null?null:safeContent.querySelector<HTMLElement>(
       '.fw-v4-selected-overview .fw-v3-squad-name h2');
     if(selectedHeading){
       selectedHeading.tabIndex=-1;
       selectedHeading.focus({preventScroll:true});
     }else{
       const rows=[...safeContent.querySelectorAll<HTMLButtonElement>(
         '[data-after-operator-id]')];
       (rows.find(row=>row.getAttribute('data-after-operator-id')===id)??
         rows[0])?.focus({preventScroll:true});
     }
   };
   const inspectContribution=(sourceKey:string)=>{
     if(!s.timelineEvents.some(event=>event.key===sourceKey))return;
     s.timelineFilter='all';s.timelineSelectedKey=sourceKey;
     s.timelineClusterId=null;
     const details=root.querySelector<HTMLElement>('#afterActionDetails');
     if(!details)return;
     details.hidden=false;drawTimeline();
     details.querySelector<HTMLElement>('.fw-v5-timeline-inspect')
       ?.scrollIntoView({block:'nearest'});
   };
   let screen:HTMLElement;
   if(s.tab==='squad'){
     screen=renderSquadView(s.report,s.recorder.manifest,
       s.selectedOperator,(id)=>choose(id),(id)=>{
         s.selectedOperator=id;
         s.operatorRecordOpen=true;draw();
         safeContent.querySelector<HTMLButtonElement>(
           '.fw-v4-record-back')?.focus({preventScroll:true});
       },inspectContribution);
     if(s.operatorRecordOpen){
       const operator=s.report.operators.find(o=>o.id===s.selectedOperator);
       if(operator){
         screen.classList.add('fw-v4-record-expanded');
         const record=make('section','fw-v4-operator-record fw-v4-squad-focus');
         record.id='afterActionOperatorRecord';
         record.setAttribute('aria-label','Full operator record for '+operator.name);
         const back=make('button','fw-v4-record-back','‹ BACK TO SQUAD') as HTMLButtonElement;
         back.type='button';
         back.addEventListener('click',()=>{
           s.operatorRecordOpen=false;draw();
           safeContent.querySelector<HTMLButtonElement>(
             '.fw-v3-details-link')?.focus();
         });
         const modelHost=make('div','fw-v4-squad-model',
           'LOADING RECORDED 3D OPERATOR');
         modelHost.setAttribute('data-after-squad-model','');
         modelHost.setAttribute('aria-label',
           'Historical 3D model for '+operator.name);
         record.append(back,modelHost,renderSquadDetails(operator,inspectContribution));
         // The complete record replaces the detail pane, not the ranked roster.
         const focus=screen.querySelector('.fw-v3-squad-focus');
         if(focus)focus.replaceWith(record);
         else screen.append(record);
       }
     }
   }
   else if(s.tab==='combat')screen=renderCombatReport(s.report,{
     selectedContact:s.selectedContact,selectedShotId:s.selectedShotId,
     side:s.contactSide,back:s.paperBack,inspectionMode:s.inspectionMode,
     scope:s.forensicScope
   },{
     chooseContact:(id)=>{s.selectedContact=id;s.selectedShotId=null;draw();},
     chooseShot:(id)=>{
       // The active default contact must become explicit as soon as a shot
       // is selected, otherwise the origin snapshot contains an orphan shot.
       if(id!==null){
         const contacts=s.contactSide==='red'?
           s.report.hostiles:s.report.friendlyCasualties;
         const owner=contacts.find(c=>c.shots.some(shot=>shot.id===id));
         if(!owner)return;
         s.selectedContact=owner.id;
       }
       s.selectedShotId=id;draw();
     },
     chooseSide:(side)=>{s.contactSide=side;s.selectedContact=null;
       s.selectedShotId=null;draw();},
     chooseView:(back)=>{s.paperBack=back;draw();},
     chooseMode:(mode)=>{s.inspectionMode=mode;draw();},
     chooseScope:(scope)=>{s.forensicScope=scope;draw();},
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
   // Mission Details is a mission-level report; operator records live on Squad.
   const operatorDetails=root.querySelector<HTMLElement>('#afterActionOperatorDetail');
   if(operatorDetails)operatorDetails.replaceChildren();
   const forensicDetails=root.querySelector<HTMLElement>('#afterActionContactDetail');
   // Stage 5 retired the redundant read-only shot ledger in Mission Details.
   // Combat's authoritative forensic inspector remains the only shot sheet.
   if(forensicDetails)forensicDetails.replaceChildren();
   // Keep the historical renderer and cached rigs alive through tab changes
   // and replay return. Only the DOM host is replaced during UI redraws.
   safeContent.replaceChildren(screen);
   const squadHost=screen.querySelector<HTMLElement>('[data-after-squad-model]');
   const combatHost=screen.querySelector<HTMLElement>('[data-after-model]');
   presentModel(root,s.recorder,squadHost??combatHost,
     squadHost?s.selectedOperator:combatHost?.dataset.afterModel??null,
     currentCombatEvidence(root));
   safeContent.scrollTop=s.scroll[s.tab]??0;
   drawTimeline();
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
 forensicScope?:ForensicScope;
 timelineFilter?:TimelineFilter;timelineSelectedKey?:string|null;
 timelineClusterId?:string|null;timelineLedgerOpen?:boolean;
 timelineLedgerLimit?:number;timelineRailScroll?:number;
 timelineGroupScroll?:number;timelineLedgerScroll?:number;
 operatorRecordOpen:boolean;summaryCompact?:boolean;
  detailsOpen:boolean;detailsScroll:number;
 scroll:Partial<Record<AfterActionTab,number>>;
};
export function afterActionSnapshot(root:HTMLElement):AfterActionReturnContext|null{
 const s=owners.get(root);if(!s)return null;
 const active=root.querySelector<HTMLElement>('#afterActionBody');
 if(active)s.scroll[s.tab]=active.scrollTop;
 // A clip can launch after the user scrolls without triggering a redraw.
 // Read the live offsets at the exact return snapshot boundary.
 const details=root.querySelector<HTMLElement>('#afterActionDetails');
 if(details&&!details.hidden){
   const rail=root.querySelector<HTMLElement>('.fw-v5-timeline-rail');
   const group=root.querySelector<HTMLElement>('.fw-v5-timeline-group-items');
   const ledger=root.querySelector<HTMLElement>('.fw-v5-timeline-ledger-list');
   if(rail)s.timelineRailScroll=rail.scrollLeft;
   if(group)s.timelineGroupScroll=group.scrollTop;
   if(ledger)s.timelineLedgerScroll=ledger.scrollTop;
 }
 return {recorder:s.recorder,tab:s.tab,operatorId:s.selectedOperator,
   contactId:s.selectedContact,contactSide:s.contactSide,
   shotId:s.selectedShotId,highlightId:s.selectedHighlight,
   paperBack:s.paperBack,inspectionMode:s.inspectionMode,
   forensicScope:s.forensicScope,
   timelineFilter:s.timelineFilter,timelineSelectedKey:s.timelineSelectedKey,
   timelineClusterId:s.timelineClusterId,
   timelineLedgerOpen:s.timelineLedgerOpen,
   timelineLedgerLimit:s.timelineLedgerLimit,
   timelineRailScroll:s.timelineRailScroll,
   timelineGroupScroll:s.timelineGroupScroll,
   timelineLedgerScroll:s.timelineLedgerScroll,
   operatorRecordOpen:s.operatorRecordOpen,
    summaryCompact:s.summaryCompact,
    detailsOpen:!root.querySelector<HTMLElement>('#afterActionDetails')?.hidden,
   detailsScroll:root.querySelector<HTMLElement>('.fw-after-detail-content')?.scrollTop??0,
   scroll:{...s.scroll}};
}
export function restoreAfterActionWorkspace(
 root:HTMLElement,context:AfterActionReturnContext
):boolean{
 const s=owners.get(root);
 if(!s||s.recorder!==context.recorder)return false;
 if(!(['squad','combat','highlights'] as string[]).includes(context.tab))return false;
 if(context.operatorId!==null&&
   !s.report.operators.some(o=>o.id===context.operatorId))return false;
 const contactList=context.contactSide==='blue'?
   s.report.friendlyCasualties:s.report.hostiles;
 const contact=contactList.find(c=>c.id===context.contactId);
 if(context.contactId!==null&&!contact)return false;
 if(context.shotId!==null&&(!contact||
   !contact.shots.some(shot=>shot.id===context.shotId)))return false;
 if(context.highlightId!==null&&
   !replayHighlightMoments(s.recorder).some(m=>m.id===context.highlightId))
   return false;
 if(context.timelineFilter!==undefined&&
   !TIMELINE_FILTERS.includes(context.timelineFilter))return false;
 if(context.timelineSelectedKey!=null&&
   !s.timelineEvents.some(e=>e.key===context.timelineSelectedKey))
   return false;
 s.tab=context.tab;s.selectedOperator=context.operatorId;
 s.selectedContact=context.contactId;s.contactSide=context.contactSide;
 s.selectedShotId=context.shotId;s.selectedHighlight=context.highlightId;
 s.paperBack=context.paperBack;s.inspectionMode=context.inspectionMode;
 s.forensicScope=context.forensicScope??'cumulative';
 s.timelineFilter=context.timelineFilter??'all';
 s.timelineSelectedKey=context.timelineSelectedKey??null;
 s.timelineClusterId=context.timelineClusterId??null;
 s.timelineLedgerOpen=context.timelineLedgerOpen??false;
 const limit=context.timelineLedgerLimit??30;
 s.timelineLedgerLimit=Number.isFinite(limit)?
   Math.min(Math.max(30,s.timelineEvents.length),Math.max(30,limit)):30;
 s.timelineRailScroll=Math.max(0,context.timelineRailScroll??0);
 s.timelineGroupScroll=Math.max(0,context.timelineGroupScroll??0);
 s.timelineLedgerScroll=Math.max(0,context.timelineLedgerScroll??0);
 s.operatorRecordOpen=context.operatorRecordOpen&&!!context.operatorId;
  s.summaryCompact=context.summaryCompact??true;
  s.scroll={...context.scroll};
 const detail=root.querySelector<HTMLElement>('#afterActionDetails');
 if(detail)detail.hidden=!context.detailsOpen;
 renderers.get(root)?.();
 const detailsScroll=root.querySelector<HTMLElement>('.fw-after-detail-content');
 if(detailsScroll)detailsScroll.scrollTop=context.detailsScroll;
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
 markDebriefEntry:()=>void;enterReplay:()=>boolean;exitReplay:()=>void;
 queueHighlights:()=>void;
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
 if(replayRequestsBound.has(ui.debrief))return;
 replayRequestsBound.add(ui.debrief);
 const launchFailure=(message:string)=>{
   port.showHelp(message,4000);
   port.updateReplayHud();
 };
 const beginFromDebrief=(rec:MissionRecorder):boolean=>{
   const origin=afterActionSnapshot(ui.debrief);
   if(!origin||origin.recorder!==rec){
     launchFailure('DEBRIEF CONTEXT UNAVAILABLE · REPLAY NOT STARTED');
     return false;
   }
   port.markDebriefEntry();
   if(!port.enterReplay()){
     launchFailure('REPLAY UNAVAILABLE · DEBRIEF PRESERVED');
     return false;
   }
   port.setReturn(origin);
   return true;
 };
 ui.watchReplay.addEventListener('click',()=>{
   if(port.isReplaying())return;
   const rec=port.getRecorder();
   if(!beginFromDebrief(rec))return;
   try{port.queueHighlights();}
   catch{
     port.exitReplay();
     launchFailure('COULD NOT OPEN FULL REPLAY · RETURNED TO DEBRIEF');
   }
 });
 ui.debrief.addEventListener('fw-after-action-replay',event=>{
   const detail=(event as CustomEvent<{
     surface:string;contactId?:string;shotId?:number|null;time:number;end?:number
   }>).detail;
   if(!detail||port.isReplaying())return;
   const rec=port.getRecorder(),request=makeAfterActionLaunchRequest(rec,detail);
   if(!request){
     launchFailure('RECORDED CLIP UNAVAILABLE · SELECTION PRESERVED');
     return;
   }
   if(!beginFromDebrief(rec))return;
   try{
     port.queueHighlights();
     if(port.getStage()&&port.getViewMode()==='plan2d')port.cameraMode('iso');
     port.camera.camMount='chest';port.camera.lens='cam';
     // Personal Bodycam requires a historically eligible friendly observer.
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
     if(!port.playback.startIncident(request.range,rec.duration,true,true))
       throw Error('Invalid incident bounds');
     port.presentReplay();port.unlockAudio();
     ui.afterActionClipHud.hidden=false;
     ui.afterActionClipLabel.textContent=request.label+' · LOOP';
     ui.afterActionClipToggle.textContent='UNCLIP';
     port.updateReplayHud();
   }catch{
     // Undo partial clip entry through the existing replay lifecycle.
     port.exitReplay();
     launchFailure('COULD NOT OPEN CLIP · RETURNED TO DEBRIEF');
   }
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
