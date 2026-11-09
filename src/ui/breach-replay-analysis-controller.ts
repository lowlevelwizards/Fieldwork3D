/** Stage 9: own replay analysis/debrief UI state, disclosure and controls.
 * Playback, camera and world overlay updates remain owned by their systems.
 */
import {team,type Session} from '../breach-game.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {ReplayEventIndex,type ReplayIndexedEvent} from '../breach-replay-event-index.ts';
import {buildReplayChapters,addReplayBookmark,adjacentReplayChapter,
 type ReplayChapter,type ReplayBookmark} from '../breach-replay-chapters.ts';
import {indexReplayIncidents,featuredReplayIncidents,type ReplayIncident}
 from '../breach-replay-incidents.ts';
import {featuredReplaySquadEntries,type ReplaySquadEntryReview}
 from '../breach-replay-squad-entry.ts';
import {buildReplayExecutionInsights} from '../breach-replay-debrief.ts';
import {operatorContactEventKnown} from '../breach-replay-contact-lens.ts';
import {inspectRecordedShot,adjacentRecordedShot} from '../breach-replay-shot-inspector.ts';
import type {RecordedShot} from '../breach-replay-ballistics.ts';
import {replayFeedPosition} from '../breach-replay-feed-window.ts';
import {clusterReplayTimeline,replayTimelineBins} from '../breach-replay-timeline-markers.ts';
import {formatReplayTime} from '../breach-replay-transport.ts';
import {toggleReplaySurface,type ReplaySurface} from '../breach-replay-ui-state.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
import type {ReplayCameraController} from '../breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from '../breach-replay-knowledge-controller.ts';

export type BreachReplayAnalysisElements={
  replayActorControls:HTMLElement;
  replayAllEvents:HTMLElement;
  replayBookmark:HTMLButtonElement;
  replayChapterList:HTMLElement;
  replayClusterMenu:HTMLElement;
  replayDebriefInfo:HTMLOutputElement;
  replayDebriefMoments:HTMLElement;
  replayDirectSight:HTMLSelectElement;
  replayDockToggle:HTMLButtonElement;
  replayDrawer:HTMLElement;
  replayDrawerClose:HTMLButtonElement;
  replayDrawerTitle:HTMLElement;
  replayExportVideo:HTMLButtonElement;
  replayExtra:HTMLElement;
  replayFeed:HTMLElement;
  replayFeedFilter:HTMLSelectElement;
  replayFeedFollow:HTMLButtonElement;
  replayFeedInfo:HTMLOutputElement;
  replayFeedPanel:HTMLElement;
  replayFeedToggle:HTMLButtonElement;
  replayHighlights:HTMLElement;
  replayIncidentClose:HTMLButtonElement;
  replayIncidentDetails:HTMLElement;
  replayIncidentInvestigate:HTMLButtonElement;
  replayIncidentLoop:HTMLButtonElement;
  replayIncidentSummary:HTMLOutputElement;
  replayIncidentTitle:HTMLElement;
  replayIncidentWatch:HTMLButtonElement;
  replayMarks:HTMLElement;
  replayMiniPlay:HTMLButtonElement;
  replayMore:HTMLButtonElement;
  replayNextChapter:HTMLButtonElement;
  replayNextEvent:HTMLButtonElement;
  replayObserverTransitions:HTMLElement;
  replayOverlayChoices:HTMLElement;
  replayOverlayTrigger:HTMLButtonElement;
  replayPanel:HTMLElement;
  replayPresets:HTMLElement;
  replayPrevChapter:HTMLButtonElement;
  replayPrevEvent:HTMLButtonElement;
  replayQuickView:HTMLSelectElement;
  replayRail:HTMLElement;
  replayRailToggle:HTMLButtonElement;
  replaySeek:HTMLInputElement;
  replayShareToggle:HTMLButtonElement;
  replayShotClose:HTMLButtonElement;
  replayShotDetails:HTMLOutputElement;
  replayShotFocus:HTMLButtonElement;
  replayShotInspector:HTMLElement;
  replayShotNext:HTMLButtonElement;
  replayShotPrev:HTMLButtonElement;
  replayShotTitle:HTMLElement;
  replaySightChoices:HTMLElement;
  replaySightTrigger:HTMLButtonElement;
  replaySpeedChoices:HTMLElement;
  replaySpeedTrigger:HTMLButtonElement;
  replaySquadEntryList:HTMLElement;
  replaySquadEntryPanel:HTMLElement;
  replayViewChoices:HTMLElement;
  replayViewTrigger:HTMLButtonElement;
};
export type BreachReplayAnalysisConfig={
 ui:BreachReplayAnalysisElements;
 playback:ReplayPlaybackController;camera:ReplayCameraController;
 knowledge:ReplayKnowledgeController;
 getRecorder:()=>MissionRecorder;getSession:()=>Session;
 shotVisible:(shot:RecordedShot)=>boolean;seek:(time:number)=>void;
 presentCurrent:()=>void;refreshHud:()=>void;
 focusShot:(shot:RecordedShot)=>void;selectActor:(id:string)=>void;
 enableMovementAnalysis:()=>void;markRecentTrace:()=>void;
 applyPreset:(preset:'clean'|'movement'|'combat'|'visibility')=>void;
 getOverlayState:()=>{names:boolean;contacts:boolean;plans:boolean;objectives:boolean};
 isVideoActive:()=>boolean;persistBookmarks:()=>void|Promise<void>;
 unlockAudio:()=>void;showHelp:(message:string,duration:number)=>void;
};
export function createBreachReplayAnalysisController(config:BreachReplayAnalysisConfig){
 const ui=config.ui;
 const replayPlayback=config.playback,replayKnowledge=config.knowledge,
   replayCamera=config.camera;
 let replayEventIndex:ReplayEventIndex|null=null;
 let replayChapters:ReplayChapter[]=[];
 let replayIncidents:ReplayIncident[]=[];
 let replayFeaturedIncidents:ReplayIncident[]=[];
 let replaySquadEntries:ReplaySquadEntryReview[]=[];
 let selectedReplaySquadEntry:string|null=null;
 let selectedReplayIncidentId:string|null=null;
 let replayBookmarks:ReplayBookmark[]=[];
 let replayBookmarkCounter=0;
 let selectedReplayShotId:number|null=null;

/** Replay event feed and navigation share the same disclosure boundary. */
function replayEventKnown(e:ReplayIndexedEvent):boolean{
  if(replayKnowledge.observerId){
    const recorded=config.getRecorder().at(e.t)?.knowledge??null;
    return operatorContactEventKnown(e,recorded,replayKnowledge.observerId,
      new Set(team(config.getSession()).map(a=>a.id)));
  }
  if(replayKnowledge.omniscient||e.kind==='objective')return true;
  if(team(config.getSession()).some(a=>a.id===e.actor))return true;
  const frame=config.getRecorder().at(e.t);
  if(!frame)return false;
  if(frame.knowledge)return !!e.actor&&
    frame.knowledge.visibleActorIds.includes(e.actor);
  // Older recordings lack recorded visibility. Keep the guarded prior fallback.
  const p=e.p;
  return !!p&&(frame.seenGround.includes(
    Math.floor(p.x/40)+','+Math.floor(p.y/40))||
    frame.seenGround.includes(
      'fine:'+Math.floor(p.x/20)+','+Math.floor(p.y/20)));
}
/** Shot investigation never introduces unrecorded future information. */
function currentReplayShot():RecordedShot|null{
  return selectedReplayShotId===null?null:
    config.getRecorder().ballistics.shots.find(s=>s.id===selectedReplayShotId)??null;
}
function closeReplayShotInspector():void{
  selectedReplayShotId=null;
  ui.replayShotInspector.hidden=true;
}
function refreshReplayShotInspector():void{
  const shot=currentReplayShot();
  if(!shot||!config.shotVisible(shot)){
    closeReplayShotInspector();return;
  }
  const knowledge=config.getRecorder().at(shot.recordedAt)?.knowledge??null;
  const detail=inspectRecordedShot(shot,knowledge,replayKnowledge.omniscient);
  ui.replayShotInspector.hidden=false;
  ui.replayShotTitle.textContent='SHOT '+detail.id+' · '+
    formatReplayTime(detail.time);
  ui.replayShotDetails.textContent=
    detail.shooterId.toUpperCase()+' · '+detail.weapon.toUpperCase()+'\n'+
    (detail.targetId?('TARGET '+detail.targetId.toUpperCase()+' · '+
      (detail.hit?'HIT':'MISS')+
      (detail.healthAfter!==null?' · HP '+detail.healthBefore+
        ' → '+detail.healthAfter:'')):
      'TARGET DETAILS UNCONFIRMED')+'\n'+
    'IMPACT '+detail.end.x.toFixed(0)+', '+detail.end.y.toFixed(0)+
    (detail.surface?' · '+detail.surface.toUpperCase():'');
  const all=config.getRecorder().ballistics.shots;
  ui.replayShotPrev.disabled=!adjacentRecordedShot(all,shot.id,false,
    config.shotVisible);
  ui.replayShotNext.disabled=!adjacentRecordedShot(all,shot.id,true,
    config.shotVisible);
}
function selectReplayShot(shot:RecordedShot):void{
  if(!config.shotVisible(shot))return;
  selectedReplayShotId=shot.id;
  config.markRecentTrace();
  replayPlayback.pause();config.seek(shot.recordedAt);
  showReplayToolTab('layers');
  const layers=ui.replayExtra.querySelector<HTMLDetailsElement>(
    '[data-replay-group="layers"]');
  if(layers)layers.open=true;
  refreshReplayShotInspector();
}
function focusReplayShot():void{
  const shot=currentReplayShot();
  if(shot)config.focusShot(shot);
}
/** Rebuild chapter buttons only on replay entry, intel change or bookmark. */
function renderReplayChapters():void{
  const fragment=document.createDocumentFragment();
  const entries=[
    ...replayChapters.map(c=>({t:c.t,label:c.label,kind:'chapter'})),
    ...replayBookmarks.map(b=>({t:b.t,label:b.label,kind:'bookmark'}))
  ].sort((a,b)=>a.t-b.t);
  for(const entry of entries){
    const button=document.createElement('button');
    button.type='button';button.className='replay-chapter-item';
    button.dataset.kind=entry.kind;
    button.textContent=formatReplayTime(entry.t)+' · '+entry.label;
    button.addEventListener('click',()=>{
      replayPlayback.pause();config.seek(entry.t);
    });
    fragment.append(button);
  }
  ui.replayChapterList.replaceChildren(fragment);
}
/** At most a short horizontal row: every item is a real, disclosed fact.
 * Movement inspection enables existing planned/actual overlays without
 * changing the recorded film or issuing any gameplay orders.
 */
function renderReplayIncidentFocus():void{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  ui.replayIncidentDetails.hidden=!incident;
  if(!incident)return;
  ui.replayIncidentTitle.textContent=formatReplayTime(incident.start)+' · '+
    incident.label;
  ui.replayIncidentSummary.textContent=incident.summary;
}
/** Sparse personal observation events are independent of team battle feed.
 * Importantly a lost contact contains no guessed position or threat state.
 */
function renderObserverSightTransitions():void{
  const observer=replayKnowledge.observerId;
  const mount=ui.replayObserverTransitions;
  mount.hidden=!observer;
  if(!observer){mount.replaceChildren();return;}
  const transitions=replayKnowledge.sightIndex?.forObserver(observer)??[];
  const fragment=document.createDocumentFragment();
  if(!transitions.length){
    const empty=document.createElement('span');
    empty.className='replay-observer-empty';
    empty.textContent='NO PERSONAL CONTACT TRANSITIONS RECORDED';
    fragment.append(empty);
  }
  for(const event of transitions.slice(0,16)){
    const button=document.createElement('button');
    button.type='button';
    button.className='replay-debrief-moment';
    button.dataset.kind=event.kind;
    const time=document.createElement('span');
    time.className='time';
    time.textContent=formatReplayTime(event.t)+' · '+
      (event.kind==='visible-at-start'?'ALREADY VISIBLE':
        event.kind==='acquired'?'CONTACT ACQUIRED':'CONTACT LOST');
    const target=document.createElement('span');
    target.className='detail';target.textContent=event.targetId;
    button.append(time,target);
    button.title=event.targetId+' · '+event.kind;
    button.addEventListener('click',()=>{
      replayPlayback.pause();config.selectActor(observer);replayCamera.followId=observer;
      config.seek(event.t);
    });
    fragment.append(button);
  }
  mount.replaceChildren(fragment);
}
/** R4.4: only recorded friendly threshold crossing facts. No inferred
 * breach timing, synchronized intent, or knowledge of unseen enemies.
 */
function renderReplaySquadEntries():void{
  const host=ui.replaySquadEntryList;
  const panel=ui.replaySquadEntryPanel;
  panel.hidden=replaySquadEntries.length===0;
  if(panel.hidden){host.replaceChildren();return;}
  const fragment=document.createDocumentFragment();
  for(const entry of replaySquadEntries){
    const count=entry.crossings.filter(c=>c.crossedAt!==null).length;
    const button=document.createElement('button');
    button.type='button';button.className='replay-entry-review-item';
    button.setAttribute('aria-pressed',
      String(entry.doorId===selectedReplaySquadEntry));
    const title=document.createElement('strong');
    title.textContent=entry.doorId+' · '+count+'/'+entry.crossings.length+
      ' CROSSED'+(entry.spreadSeconds===null?'': ' · '+
      entry.spreadSeconds.toFixed(1)+'S SPREAD');
    const details=document.createElement('small');
    details.textContent=entry.crossings.map(c=>
      c.actorId.toUpperCase()+' '+
      (c.crossedAt===null?(c.alreadyBeyond?'ALREADY PAST':'NOT RECORDED'):
        formatReplayTime(c.crossedAt))).join(' · ');
    button.title='Measured crossings only · '+details.textContent;
    button.append(title,details);
    button.addEventListener('click',()=>{
      if(entry.firstCrossingAt===null)return;
      selectedReplaySquadEntry=entry.doorId;
      replayPlayback.pause();
      config.seek(Math.max(0,entry.firstCrossingAt-.6));
      renderReplaySquadEntries();
    });
    fragment.append(button);
  }
  host.replaceChildren(fragment);
}
function renderReplayDebrief():void{
  const stalls=buildReplayExecutionInsights(config.getRecorder().executionEvents,
    config.getRecorder().duration,5).filter(x=>
      (!replayKnowledge.observerId||x.actor===replayKnowledge.observerId)&&
      (x.end===null||(x.seconds??0)>=2))
    .slice(0,2);
  const fragment=document.createDocumentFragment();
  for(const incident of replayFeaturedIncidents){
    const button=document.createElement('button');
    button.type='button';button.className='replay-debrief-moment';
    button.dataset.kind=incident.kind;
    button.setAttribute('aria-pressed',
      String(incident.id===selectedReplayIncidentId));
    button.title=incident.label+' · '+incident.summary;
    const stamp=document.createElement('span');
    stamp.className='time';
    stamp.textContent=formatReplayTime(incident.start)+' · '+incident.label;
    const description=document.createElement('span');
    description.className='detail';
    description.textContent=incident.summary;
    button.append(stamp,description);
    button.addEventListener('click',()=>{
      replayPlayback.pause();
      selectedReplayIncidentId=incident.id;
      const friendly=incident.actorIds.find(id=>
        team(config.getSession()).some(a=>a.id===id));
      if(friendly){config.selectActor(friendly);replayCamera.followId=friendly;}
      if(incident.kind==='movement'){
        config.enableMovementAnalysis();
      }
      config.seek(incident.start);
      renderReplayDebrief();
    });
    fragment.append(button);
  }
  for(const stall of stalls.filter(x=>!replayFeaturedIncidents.some(i=>
    i.kind==='movement'&&i.actorIds.includes(x.actor)&&
    x.t>=i.start-.5&&x.t<=i.end+.5))){
    const button=document.createElement('button');
    button.type='button';button.className='replay-debrief-moment';
    button.dataset.kind='movement';
    button.title=stall.detail;
    const stamp=document.createElement('span');
    stamp.className='time';
    stamp.textContent=formatReplayTime(stall.t)+' · ORDER INTERRUPTION';
    const detail=document.createElement('span');
    detail.className='detail';
    detail.textContent=stall.detail+' · '+(stall.seconds===null?
      'NO RECORDED RESOLUTION':stall.seconds.toFixed(1)+'S');
    button.append(stamp,detail);
    button.addEventListener('click',()=>{
      replayPlayback.pause();selectedReplayIncidentId=null;
      if(team(config.getSession()).some(a=>a.id===stall.actor)){
        config.selectActor(stall.actor);replayCamera.followId=stall.actor;
      }
      config.enableMovementAnalysis();
      config.seek(stall.t);renderReplayDebrief();
    });
    fragment.append(button);
  }
  ui.replayDebriefMoments.replaceChildren(fragment);
  ui.replayDebriefInfo.textContent=replayFeaturedIncidents.length?
    replayFeaturedIncidents.length+' KEY INCIDENTS':
    'NO DISCLOSED INCIDENTS';
  renderReplayIncidentFocus();
  renderObserverSightTransitions();
}
function startReplayIncident(loop:boolean):void{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  if(!incident)return;
  if(!replayPlayback.startIncident(incident,config.getRecorder().duration,loop)){
    config.showHelp('INCIDENT TOO SHORT TO PLAY',2500);return;
  }
  // Incident start is already positioned by the transport controller.
  // Do not call config.seek here: seeking cancels incident playback.
  config.presentCurrent();
  config.unlockAudio();
  showReplayToolTab(null);
  config.refreshHud();
}

const replayFeedKinds:Record<string,readonly string[]>={
  all:[],
  combat:['shot','impact','wound','down','flash','surrender'],
  orders:['started','blocked','resumed','completed','door','reload','interaction'],
  contacts:['intel'],
  objectives:['objective']
};
let replayFeedEvents:readonly ReplayIndexedEvent[]=[];
let replayFeedRangeStart=0,replayFeedRangeEnd=0;
let replayFeedActiveKey:string|null=null;
let replayFeedFollowing=false;
function scrollReplayFeedSelection():void{
  ui.replayFeed.querySelector<HTMLElement>('.selected')?.
    scrollIntoView({block:'nearest'});
}
function renderReplayEventFeed():void{
  if(ui.replayFeed.hidden||!replayEventIndex)return;
  const allowed=replayFeedKinds[ui.replayFeedFilter.value]??[];
  replayFeedEvents=replayEventIndex.all.filter(event=>
    !allowed.length||allowed.includes(event.kind));
  const position=replayFeedPosition(replayFeedEvents,replayPlayback.time);
  replayFeedRangeStart=position.start;replayFeedRangeEnd=position.end;
  replayFeedActiveKey=replayFeedEvents[position.focusIndex]?.key??null;
  const fragment=document.createDocumentFragment();
  for(const event of replayFeedEvents.slice(position.start,position.end)){
    const button=document.createElement('button');
    button.type='button';button.className='replay-feed-item';
    button.dataset.kind=event.kind;button.dataset.eventKey=event.key;
    button.classList.toggle('selected',event.key===replayFeedActiveKey);
    button.textContent=formatReplayTime(event.t)+' · '+
      event.kind.toUpperCase()+' · '+event.text;
    button.addEventListener('click',()=>{
      replayPlayback.pause();config.seek(event.t);
      if(event.kind==='shot'){
        const shot=config.getRecorder().ballistics.shots.find(s=>
          Math.abs(s.recordedAt-event.t)<.17&&s.shooterId===event.actor&&
          config.shotVisible(s));
        if(shot)selectReplayShot(shot);
      }
    });
    fragment.append(button);
  }
  ui.replayFeed.replaceChildren(fragment);
  ui.replayFeedInfo.textContent=replayFeedEvents.length+
    ' KNOWN EVENTS · SHOWING '+(replayFeedEvents.length?position.start+1:0)+
    '–'+position.end;
  if(replayFeedFollowing)scrollReplayFeedSelection();
}
function syncReplayEventFeed():void{
  if(ui.replayFeed.hidden||!replayEventIndex)return;
  const position=replayFeedPosition(replayFeedEvents,replayPlayback.time);
  const key=replayFeedEvents[position.focusIndex]?.key??null;
  if(replayFeedFollowing&&position.focusIndex>=0&&
     (position.focusIndex<replayFeedRangeStart||
      position.focusIndex>=replayFeedRangeEnd)){
    renderReplayEventFeed();return;
  }
  if(key===replayFeedActiveKey)return;
  replayFeedActiveKey=key;
  for(const button of ui.replayFeed.querySelectorAll<HTMLButtonElement>('[data-event-key]'))
    button.classList.toggle('selected',button.dataset.eventKey===key);
  if(replayFeedFollowing)scrollReplayFeedSelection();
}
/** One tool surface at a time; never let advanced controls grow the dock. */
type ReplayToolTab='layers'|'export'|'events';
type ReplayPreset='clean'|'movement'|'combat'|'visibility'|'custom';
let replayToolTab:ReplayToolTab|null=null;
let replaySurface:ReplaySurface='none';
let replaySurfaceOpener:HTMLButtonElement|null=null;
let replayClusterOpener:HTMLButtonElement|null=null;
function closeReplaySurface(restoreFocus=true):void{
  const focusWasInside=ui.replayDrawer.contains(document.activeElement);
  const opener=replaySurfaceOpener??ui.replayMore;
  showReplayToolTab(null);
  replaySurfaceOpener=null;
  if(restoreFocus&&focusWasInside&&opener.isConnected)
    opener.focus({preventScroll:true});
}
function closeReplayCluster(restoreFocus=true):void{
  const focusWasInside=ui.replayClusterMenu.contains(document.activeElement);
  ui.replayClusterMenu.hidden=true;
  ui.replayClusterMenu.replaceChildren();
  const opener=replayClusterOpener;
  replayClusterOpener=null;
  if(restoreFocus&&focusWasInside&&opener?.isConnected)
    opener.focus({preventScroll:true});
}
let replayMomentsView:'highlights'|'events'='highlights';
let replayPreset:ReplayPreset='clean';
function setReplayMomentsView(view:'highlights'|'events'):void{
  replayMomentsView=view;
  ui.replayHighlights.hidden=view!=='highlights';
  ui.replayAllEvents.hidden=view!=='events';
  const active=replaySurface==='moments'&&view==='events';
  ui.replayFeed.hidden=!active;
  ui.replayFeedFilter.hidden=!active;
  ui.replayFeedInfo.hidden=!active;
  for(const b of ui.replayFeedPanel.querySelectorAll<HTMLButtonElement>('[data-moments-view]'))
    b.setAttribute('aria-pressed',String(b.dataset.momentsView===view));
  if(active)renderReplayEventFeed();
}
let replayDockCollapsed=false;
type ReplayChoiceKey='view'|'sight'|'speed'|'overlay';
const replayChoices={
  view:{trigger:ui.replayViewTrigger,menu:ui.replayViewChoices},
  sight:{trigger:ui.replaySightTrigger,menu:ui.replaySightChoices},
  speed:{trigger:ui.replaySpeedTrigger,menu:ui.replaySpeedChoices},
  overlay:{trigger:ui.replayOverlayTrigger,menu:ui.replayOverlayChoices}
};
let replayRailCollapsed=false;
let replayOverlaySignature='';
/** One fast signature gate: replay transport refreshes every frame; overlay
 * controls should update only when a visibility preference changes. */
function syncReplayOverlayChoices():void{
  const states:Record<string,boolean>={...config.getOverlayState()};
  const signature=Object.values(states).join('|');
  if(signature===replayOverlaySignature)return;
  replayOverlaySignature=signature;
  for(const button of ui.replayOverlayChoices
    .querySelectorAll<HTMLButtonElement>('[data-overlay-choice]')){
    const key=button.dataset.overlayChoice??'';
    if(!(key in states))continue;
    const value=states[key];
    button.textContent=key.toUpperCase()+' '+(value?'ON':'OFF');
    button.setAttribute('aria-pressed',String(value));
  }
  const cleared=Object.values(states).every(v=>!v);
  ui.replayOverlayTrigger.dataset.cleared=String(cleared);
  ui.replayOverlayTrigger.title=cleared?'Show replay overlays':
    'Show or hide replay overlays';
}

function setReplayRailCollapsed(collapsed:boolean):void{
  replayRailCollapsed=collapsed;
  closeReplayChoices();
  ui.replayRail.dataset.collapsed=String(collapsed);
  ui.replayRailToggle.textContent=collapsed?'›':'‹';
  const description=collapsed?'Expand replay side controls':
    'Collapse replay side controls';
  ui.replayRailToggle.setAttribute('aria-label',description);
  ui.replayRailToggle.title=description;
  ui.replayRailToggle.setAttribute('aria-expanded',String(!collapsed));
}
function closeReplayChoices():void{
  for(const {trigger,menu} of Object.values(replayChoices)){
    menu.hidden=true;
    trigger.setAttribute('aria-expanded','false');
  }
}
function toggleReplayChoice(key:ReplayChoiceKey):void{
  const {trigger,menu}=replayChoices[key];
  const open=menu.hidden;
  closeReplayChoices();
  menu.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));
}
function setReplayDockCollapsed(collapsed:boolean):void{
  replayDockCollapsed=collapsed;
  if(collapsed)showReplayToolTab(null);
  ui.replayPanel.dataset.collapsed=String(collapsed);
  ui.replayDockToggle.textContent=collapsed?'⌃':'⌄';
  ui.replayDockToggle.title=collapsed?'Expand replay timeline':'Minimize replay timeline';
  ui.replayDockToggle.setAttribute('aria-label',ui.replayDockToggle.title);
  ui.replayDockToggle.setAttribute('aria-expanded',String(!collapsed));
  ui.replayMiniPlay.hidden=!collapsed;
  ui.replayMiniPlay.textContent=replayPlayback.playing?'Ⅱ':'▶';
}
function showReplayToolTab(tab:ReplayToolTab|null):void{
  replayToolTab=tab;
  replaySurface=tab===null?'none':tab==='events'?'moments':tab==='export'?'share':'analyze';
  const analyze=replaySurface==='analyze',share=replaySurface==='share';
  ui.replayDrawer.hidden=replaySurface==='none';
  ui.replayDrawerTitle.textContent=replaySurface==='moments'?'MOMENTS':
    share?'SAVE / SHARE':'ANALYZE';
  ui.replayExtra.hidden=!(analyze||share);
  ui.replayFeedPanel.hidden=replaySurface!=='moments';
  ui.replayPresets.hidden=!analyze;
  ui.replayActorControls.hidden=!analyze;
  ui.replayMore.setAttribute('aria-expanded',String(analyze));
  ui.replayFeedToggle.setAttribute('aria-expanded',String(replaySurface==='moments'));
  ui.replayShareToggle.setAttribute('aria-expanded',String(share));
  for(const group of ui.replayExtra.querySelectorAll<HTMLElement>('[data-replay-group]'))
    group.hidden=share?group.dataset.replayGroup!=='export':
      !analyze||group.dataset.replayGroup==='export';
  setReplayMomentsView(replayMomentsView);
}
function toggleReplayPanel(surface:Exclude<ReplaySurface,'none'>,
  opener:HTMLButtonElement):void{
  const next=toggleReplaySurface(replaySurface,surface);
  if(next==='none'){closeReplaySurface(false);return;}
  replaySurfaceOpener=opener;
  setReplayDockCollapsed(false);
  showReplayToolTab(next==='moments'?'events':
    next==='share'?'export':'layers');
}

function renderReplayEventMarkers():void{
  ui.replayMarks.replaceChildren();
  ui.replayClusterMenu.hidden=true;
  ui.replayClusterMenu.replaceChildren();
  const duration=config.getRecorder().duration;
  if(duration<=0)return;
  const width=ui.replayMarks.clientWidth||ui.replaySeek.clientWidth||320;
  const bins=replayTimelineBins(width);
  const events=replayEventIndex?.markers??[];
  const clusters=clusterReplayTimeline(events,duration,width);
  const byBin=new Map<number,ReplayIndexedEvent[]>();
  for(const event of events){
    if(!Number.isFinite(event.t))continue;
    const bin=Math.min(bins-1,Math.max(0,Math.floor(event.t/duration*bins)));
    const list=byBin.get(bin);
    if(list)list.push(event);else byBin.set(bin,[event]);
  }
  const fragment=document.createDocumentFragment();
  for(const cluster of clusters){
    const members=byBin.get(cluster.index)??[];
    if(!members.length)continue;
    const marker=document.createElement('button');
    marker.type='button';
    marker.className='replay-mark replay-mark-'+cluster.kind;
    marker.style.left=((cluster.index+.5)/bins*100).toFixed(3)+'%';
    marker.dataset.cluster=String(members.length>1);
    marker.title=members.length+' event'+(members.length===1?'':'s')+
      ' near '+formatReplayTime(cluster.time);
    marker.setAttribute('aria-label',members.length===1?
      'Go to '+formatReplayTime(members[0].t)+': '+members[0].text:
      'Choose among '+members.length+' recorded events near '+
        formatReplayTime(cluster.time));
    marker.addEventListener('click',()=>{
      closeReplayCluster(false);
      if(members.length===1){
        replayPlayback.pause();config.seek(members[0].t);return;
      }
      const heading=document.createElement('strong');
      heading.textContent=members.length+' EVENTS · '+
        formatReplayTime(cluster.time);
      ui.replayClusterMenu.append(heading);
      for(const event of members){
        const choice=document.createElement('button');
        choice.type='button';choice.textContent=formatReplayTime(event.t)+
          ' · '+event.kind.toUpperCase()+' · '+event.text;
        choice.addEventListener('click',()=>{
          replayPlayback.pause();config.seek(event.t);
          ui.replayClusterMenu.hidden=true;
          marker.focus();
        });
        ui.replayClusterMenu.append(choice);
      }
      replayClusterOpener=marker;
      ui.replayClusterMenu.hidden=false;
      ui.replayClusterMenu.querySelector('button')?.focus({preventScroll:true});
    });
    fragment.append(marker);
  }
  ui.replayMarks.append(fragment);
}

 function rebuildReplayEventIndex():void{
   const recorder=config.getRecorder();
   replayEventIndex=new ReplayEventIndex(recorder.events,
     recorder.executionEvents,replayEventKnown);
   replayChapters=buildReplayChapters(replayEventIndex.all,recorder.duration);
   replayIncidents=indexReplayIncidents(replayEventIndex.all,recorder.duration);
   replayFeaturedIncidents=featuredReplayIncidents(replayIncidents,5);
   selectedReplayIncidentId=null;replayPlayback.clearIncident();
   renderReplayChapters();renderReplayDebrief();
 }
 function rebuildReplaySquadEntries():void{
   const recorder=config.getRecorder();
   replaySquadEntries=featuredReplaySquadEntries(recorder.frames,
     team(config.getSession()).map(a=>a.id),recorder.duration,3);
   selectedReplaySquadEntry=null;renderReplaySquadEntries();
 }
 function restoreBookmarks(marks:ReplayBookmark[]):void{
   replayBookmarks=marks;
   replayBookmarkCounter=Math.max(marks.length,
     ...marks.map(mark=>Number(mark.id.match(/bookmark-(\d+)/)?.[1]??0)));
   renderReplayChapters();
 }
 function addBookmark():void{
   const id='bookmark-'+(++replayBookmarkCounter);
   replayBookmarks=addReplayBookmark(replayBookmarks,replayPlayback.time,
     config.getRecorder().duration,id,
     'MARK '+String(replayBookmarkCounter).padStart(2,'0'));
   renderReplayChapters();void config.persistBookmarks();
 }
 function startSession():void{
   replayEventIndex=null;replayChapters=[];replayIncidents=[];
   replayFeaturedIncidents=[];replaySquadEntries=[];selectedReplaySquadEntry=null;
   selectedReplayIncidentId=null;replayBookmarks=[];replayBookmarkCounter=0;
   replayPreset='clean';replayMomentsView='highlights';
   replayOverlaySignature='';replayFeedEvents=[];
   replayFeedRangeStart=0;replayFeedRangeEnd=0;
   replayFeedFollowing=false;replayFeedActiveKey=null;
   ui.replayFeedFollow.setAttribute('aria-pressed','false');
   ui.replayFeedFollow.textContent='FOLLOW TIME OFF';
   closeReplayShotInspector();showReplayToolTab(null);
 }
 function reset():void{
   replayEventIndex=null;replayChapters=[];replayBookmarks=[];
   replayBookmarkCounter=0;replayIncidents=[];replayFeaturedIncidents=[];
   replaySquadEntries=[];selectedReplaySquadEntry=null;selectedReplayIncidentId=null;
   replayFeedEvents=[];replayFeedActiveKey=null;replayFeedFollowing=false;
   replayOverlaySignature='';renderReplaySquadEntries();
   ui.replayIncidentDetails.hidden=true;closeReplayShotInspector();
   ui.replayFeed.replaceChildren();ui.replayDebriefMoments.replaceChildren();
   ui.replayObserverTransitions.replaceChildren();
   ui.replayObserverTransitions.hidden=true;ui.replayDebriefInfo.textContent='';
   showReplayToolTab(null);closeReplayChoices();closeReplayCluster(false);
 }
 function bindReplayUi():void{
ui.replayMore.addEventListener('click',()=>
  toggleReplayPanel('analyze',ui.replayMore));
ui.replayShareToggle.addEventListener('click',()=>{
  if(config.isVideoActive()){ui.replayExportVideo.click();return;}
  toggleReplayPanel('share',ui.replayShareToggle);
});
for(const [key,{trigger}] of Object.entries(replayChoices) as
  Array<[ReplayChoiceKey,{trigger:HTMLButtonElement;menu:HTMLElement}]>){
  trigger.addEventListener('click',()=>toggleReplayChoice(key));
}
for(const b of ui.replayViewChoices.querySelectorAll<HTMLButtonElement>('[data-view-choice]')){
  b.addEventListener('click',()=>{
    ui.replayQuickView.value=b.dataset.viewChoice??'iso';
    ui.replayQuickView.dispatchEvent(new Event('change'));
    closeReplayChoices();
  });
}
for(const b of ui.replaySightChoices.querySelectorAll<HTMLButtonElement>('[data-sight-choice]')){
  b.addEventListener('click',()=>{
    ui.replayDirectSight.value=b.dataset.sightChoice??'team';
    ui.replayDirectSight.dispatchEvent(new Event('change'));
    closeReplayChoices();
  });
}
document.addEventListener('pointerdown',e=>{
  if(!(e.target instanceof Node)||ui.replayRail.contains(e.target))return;
  closeReplayChoices();
});
ui.replayDockToggle.addEventListener('click',()=>setReplayDockCollapsed(!replayDockCollapsed));
ui.replayRailToggle.addEventListener('click',()=>
  setReplayRailCollapsed(!replayRailCollapsed));
for(const button of ui.replayPresets.querySelectorAll<HTMLButtonElement>('[data-replay-preset]'))
  button.addEventListener('click',()=>{
    const p=button.dataset.replayPreset;
    if(p==='clean'||p==='movement'||p==='combat'||p==='visibility')config.applyPreset(p);
  });
for(const button of ui.replayFeedPanel.querySelectorAll<HTMLButtonElement>('[data-moments-view]'))
  button.addEventListener('click',()=>setReplayMomentsView(
    button.dataset.momentsView==='events'?'events':'highlights'));
ui.replayFeedToggle.addEventListener('click',()=>
  toggleReplayPanel('moments',ui.replayFeedToggle));
ui.replayDrawerClose.addEventListener('click',()=>closeReplaySurface());
ui.replayFeedFilter.addEventListener('change',renderReplayEventFeed);
ui.replayFeedFollow.addEventListener('click',()=>{
  replayFeedFollowing=!replayFeedFollowing;
  ui.replayFeedFollow.setAttribute('aria-pressed',String(replayFeedFollowing));
  ui.replayFeedFollow.textContent=replayFeedFollowing?'FOLLOW TIME ON':'FOLLOW TIME OFF';
  if(replayFeedFollowing)renderReplayEventFeed();
});
ui.replayIncidentWatch.addEventListener('click',()=>startReplayIncident(false));
ui.replayIncidentLoop.addEventListener('click',()=>startReplayIncident(true));
ui.replayIncidentInvestigate.addEventListener('click',()=>{
  const incident=replayIncidents.find(i=>i.id===selectedReplayIncidentId);
  if(!incident)return;
  replayPlayback.pause();config.seek(incident.start);
  const actor=incident.actorIds.find(id=>team(config.getSession()).some(a=>a.id===id));
  if(actor)config.selectActor(actor);
  const preset=incident.kind==='movement'||incident.kind==='door'||
    incident.kind==='orders'?'movement':
    incident.kind==='contact'?'visibility':'combat';
  config.applyPreset(preset);
  showReplayToolTab('layers');
  const layers=ui.replayExtra.querySelector<HTMLDetailsElement>(
    '[data-replay-group="layers"]');
  if(layers)layers.open=true;
});
ui.replayIncidentClose.addEventListener('click',()=>{
  replayPlayback.clearIncident();selectedReplayIncidentId=null;
  renderReplayDebrief();
});
ui.replayPrevChapter.addEventListener('click',()=>{
  const chapter=adjacentReplayChapter(replayChapters,replayPlayback.time,false);
  if(chapter){replayPlayback.pause();config.seek(chapter.t);}
});
ui.replayNextChapter.addEventListener('click',()=>{
  const chapter=adjacentReplayChapter(replayChapters,replayPlayback.time,true);
  if(chapter){replayPlayback.pause();config.seek(chapter.t);}
});
ui.replayBookmark.addEventListener('click',()=>{
  const id='bookmark-'+(++replayBookmarkCounter);
  replayBookmarks=addReplayBookmark(replayBookmarks,replayPlayback.time,config.getRecorder().duration,
    id,'MARK '+String(replayBookmarkCounter).padStart(2,'0'));
  renderReplayChapters();
  void config.persistBookmarks();
});
ui.replayShotClose.addEventListener('click',closeReplayShotInspector);
ui.replayShotFocus.addEventListener('click',focusReplayShot);
ui.replayShotPrev.addEventListener('click',()=>{
  const s=currentReplayShot();
  const prev=s&&adjacentRecordedShot(config.getRecorder().ballistics.shots,s.id,
    false,config.shotVisible);
  if(prev)selectReplayShot(prev);
});
ui.replayShotNext.addEventListener('click',()=>{
  const s=currentReplayShot();
  const next=s&&adjacentRecordedShot(config.getRecorder().ballistics.shots,s.id,
    true,config.shotVisible);
  if(next)selectReplayShot(next);
});
const jumpReplayEvent=(forward:boolean)=>{
  const item=forward?replayEventIndex?.next(replayPlayback.time):
    replayEventIndex?.previous(replayPlayback.time);
  if(item){replayPlayback.pause();config.seek(item.t);}
};
ui.replayPrevEvent.addEventListener('click',()=>jumpReplayEvent(false));
ui.replayNextEvent.addEventListener('click',()=>jumpReplayEvent(true));
 }
 return {
   get replayEventIndex(){return replayEventIndex;},
   get replayChapters(){return replayChapters;},
   get replayIncidents(){return replayIncidents;},
   get replayFeaturedIncidents(){return replayFeaturedIncidents;},
   get replaySquadEntries(){return replaySquadEntries;},
   get selectedReplaySquadEntry(){return selectedReplaySquadEntry;},
   get selectedReplayIncidentId(){return selectedReplayIncidentId;},
   get replayBookmarks(){return replayBookmarks;},
   get selectedReplayShotId(){return selectedReplayShotId;},
   set selectedReplayShotId(value:number|null){selectedReplayShotId=value;},
   get replayToolTab(){return replayToolTab;},
   get replayPreset(){return replayPreset;},
   set replayPreset(value:ReplayPreset){replayPreset=value;},
   startSession,reset,bindReplayUi,rebuildReplayEventIndex,
   rebuildReplaySquadEntries,restoreBookmarks,addBookmark,
   renderReplayChapters,renderReplayDebrief,renderReplaySquadEntries,
   renderReplayEventFeed,syncReplayEventFeed,renderReplayEventMarkers,
   closeReplayShotInspector,refreshReplayShotInspector,selectReplayShot,
   closeReplaySurface,closeReplayCluster,closeReplayChoices,
   setReplayRailCollapsed,setReplayDockCollapsed,showReplayToolTab,
   syncReplayOverlayChoices
 };
}
