import {
  W,H,activeWorldBounds,WALLS,COVER,GRID,doorCenter,doorLeafSegment,type Pt,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  operationBriefing,
  planMove,planMoveStroke,planNearbyInteraction,planAim,setFirePolicy,planWait,planWaitAt,setWaitDuration,
  plannedControl,setNodeControl,setStartPace,planReloadAt,planDoorFlash,
  planSync,movePlanNode,
  finalPoint,doorAtNode,backOne,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,liveVisibility,
  planReload,reloadNow,planFlash,moveFlashTarget,flashTrajectory,
  cycleWeapon,
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import {renderSnapshot,type RenderActor}
  from './breach-frame-interpolation.ts';
import {routeLineHit} from './breach-route-edit.ts';
import {placeContextMenu,type AvoidRect,type ScreenPath,type MenuSide} from './breach-context-placement.ts';
import {coverPresentation,shotVisibility,doorVisibility,contactFade} from './breach-presentation.ts';
import {heardIntensity} from './breach-acoustics.ts';
import {parseOperationHistory,addOperationRecord,
  type OperationRecord} from './breach-operations.ts';
import {MissionRecorder,applyReplayFrame} from './breach-replay.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {injuryOf,WEAPONS} from './breach-combat.ts';
import {doorReachable} from './breach-door.ts';
import {canRelocateCover} from './breach-movable-cover.ts';
import {INTEL_MODES,doorKnown,wallKnown,roomKnown,
  routeWithIntel,intelPassable,type IntelMode} from './breach-intel.ts';
import {orderFailureText} from './breach-nav-diagnostics.ts';
import {DisplayRouteCache} from './breach-route-cache.ts';
import {FrameMeter} from './breach-perf.ts';
import {formatAfterAction} from './breach-after-action.ts';
import {initialRoster,readRoster,applyRosterIdentity,recordRosterMission,
  resupplyRoster,equipRoster} from './breach-roster.ts';
import {newCampaign,readCampaign,migrateLegacyRoster,acceptContract,resolveOperation,
 type CampaignState,type CampaignReport} from './campaign-state.ts';
import {CampaignScreen} from './campaign-ui.ts';
import {awarenessDebugLine} from './breach-awareness-debug.ts';
import {fixedStepBudget} from './breach-fixed-clock.ts';
import './breach-style.css';
import {tacticalIcon,decorateIconButton,tacticalIconForState} from './ui/tactical-icons.ts';
import {contextActionChoices} from './ui/context-actions.ts';
import {PaletteMotion} from './ui/palette-motion.ts';
import {TacticalFeedback} from './ui/tactical-feedback.ts';
import {paintFogMask,FOG_WIDTH,FOG_HEIGHT} from './breach-fog-mask.ts';

const el=<T extends HTMLElement>(id:string)=>{
  const node=document.getElementById(id);
  if(!node)throw Error('Missing tactical UI: '+id);
  return node as T;
};
const canvas=el<HTMLCanvasElement>('breachCanvas');
const feedbackLayer=document.createElement('canvas');
feedbackLayer.id='tacticalFeedback';
feedbackLayer.setAttribute('aria-hidden','true');
document.body.append(feedbackLayer);
const feedbackDraw=feedbackLayer.getContext('2d');
const tacticalFeedback=new TacticalFeedback();
const ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D unavailable');
const draw:CanvasRenderingContext2D=ctx;
const ui={
  rook:el<HTMLButtonElement>('rook'),
  moss:el<HTMLButtonElement>('moss'),
  rookHp:el<HTMLElement>('rookHp'),mossHp:el<HTMLElement>('mossHp'),
  clear:el<HTMLButtonElement>('clear'),
  play:el<HTMLButtonElement>('play'),restart:el<HTMLButtonElement>('restart'),
  phase:el<HTMLElement>('phase'),clock:el<HTMLOutputElement>('clock'),
  hint:el<HTMLElement>('hint'),feed:el<HTMLElement>('feed'),
  mission:el<HTMLElement>('mission'),
  briefingToggle:el<HTMLButtonElement>('briefingToggle'),
  uiHelp:el<HTMLButtonElement>('uiHelp'),
  uiSoundToggle:el<HTMLButtonElement>('uiSoundToggle'),
  briefingPanel:el<HTMLElement>('briefingPanel'),
  briefingTitle:el<HTMLElement>('briefingTitle'),
  briefingBody:el<HTMLElement>('briefingBody'),
  briefingClose:el<HTMLButtonElement>('briefingClose'),
  context:el<HTMLElement>('contextTools'),
  quickStates:el<HTMLElement>('quickStates'),
  quickScope:el<HTMLElement>('quickScope'),
  tacticalHud:el<HTMLElement>('tacticalHud'),
  orders:el<HTMLElement>('advancedOrders'),
  moreOrders:el<HTMLButtonElement>('moreOrders'),
  cancelTarget:el<HTMLButtonElement>('cancelTarget'),
  siteSettingsToggle:el<HTMLButtonElement>('siteSettingsToggle'),
  siteSize:el<HTMLButtonElement>('siteSize'),
  siteSettings:el<HTMLElement>('siteSettings'),
  replayMore:el<HTMLButtonElement>('replayMore'),
  replayExtra:el<HTMLElement>('replayExtra'),
  viewIso:el<HTMLButtonElement>('viewIso'),
  viewTop:el<HTMLButtonElement>('viewTop'),
  view2d:el<HTMLButtonElement>('view2d'),
  cameraFit:el<HTMLButtonElement>('cameraFit'),
  intelMode:el<HTMLButtonElement>('intelMode'),
  ash:el<HTMLButtonElement>('ash'),vale:el<HTMLButtonElement>('vale'),
  ashHp:el<HTMLElement>('ashHp'),valeHp:el<HTMLElement>('valeHp'),
  back:el<HTMLButtonElement>('back'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
  wait:el<HTMLButtonElement>('wait'),sync:el<HTMLButtonElement>('sync'),
  reload:el<HTMLButtonElement>('reload'),flash:el<HTMLButtonElement>('flash'),
  loadout:el<HTMLButtonElement>('loadout'),
  stance:el<HTMLButtonElement>('stance'),variant:el<HTMLButtonElement>('variant'),
  contact:el<HTMLButtonElement>('contact'),
  debrief:el<HTMLElement>('debrief'),
  debriefTitle:el<HTMLElement>('debriefTitle'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
  watchReplay:el<HTMLButtonElement>('watchReplay'),
  replayPanel:el<HTMLElement>('replayPanel'),
  replayPlay:el<HTMLButtonElement>('replayPlay'),
  replayBack:el<HTMLButtonElement>('replayBack'),
  replayForward:el<HTMLButtonElement>('replayForward'),
  replaySpeed:el<HTMLButtonElement>('replaySpeed'),
  replaySeek:el<HTMLInputElement>('replaySeek'),
  replayMarks:el<HTMLElement>('replayMarks'),
  replaySight:el<HTMLButtonElement>('replaySight'),
  replayView:el<HTMLButtonElement>('replayView'),
  replayExit:el<HTMLButtonElement>('replayExit'),
  replayPrevEvent:el<HTMLButtonElement>('replayPrevEvent'),
  replayNextEvent:el<HTMLButtonElement>('replayNextEvent'),
  replayFollow:el<HTMLButtonElement>('replayFollow'),
  replayAnalysis:el<HTMLButtonElement>('replayAnalysis'),
  replayEventText:el<HTMLOutputElement>('replayEventText'),
  replayClock:el<HTMLOutputElement>('replayClock'),
  rookAmmo:el<HTMLElement>('rookAmmo'),mossAmmo:el<HTMLElement>('mossAmmo'),
  ashAmmo:el<HTMLElement>('ashAmmo'),valeAmmo:el<HTMLElement>('valeAmmo'),
};
for(const key of ['back','undo','redo','moreOrders','siteSettingsToggle','cancelTarget'] as const){
  decorateIconButton(ui[key],key);
}
const randomSiteSeed=()=>{
  const bytes=new Uint32Array(1);
  if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);
  return bytes[0]||((Date.now()^Math.floor(Math.random()*1e9))>>>0);
};
const startupParams=new URLSearchParams(location.search);
const legacyStudy=startupParams.has('fixedSite');
const requestedSeed=Number(startupParams.get('seed'));
const initialSiteSeed=startupParams.has('seed')&&Number.isSafeInteger(requestedSeed)&&
 requestedSeed>0&&requestedSeed<=0xffffffff?requestedSeed:randomSiteSeed();
let selectedIntelMode:IntelMode='floor-plan';
let requestedSiteScale:'standard'|'expanded'=
  startupParams.get('scale')==='expanded'?'expanded':'standard';
const ROSTER_KEY='fieldwork3d.operator-roster.v1';
let persistentRoster=(()=>{
 try{return readRoster(localStorage.getItem(ROSTER_KEY));}
 catch{return initialRoster();}
})();
function saveRoster(){
 try{localStorage.setItem(ROSTER_KEY,JSON.stringify(persistentRoster));}
 catch{/* Private browser storage may be unavailable. */}
}
const CAMPAIGN_KEY='fieldwork3d.campaign.v1';
let campaign:CampaignState|null=(()=>{
 try{return readCampaign(localStorage.getItem(CAMPAIGN_KEY));}catch{return null;}
})();
let campaignMode:'menu'|'home'|'mission'|'quick'=
 legacyStudy||startupParams.has('quick')?'quick':'menu';
function saveCampaign(){
 if(!campaign)return;
 try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));}
 catch{console.warn('Campaign save unavailable');}
}
function applyCampaignSkills(){
 if(campaignMode!=='mission'||!campaign)return;
 for(const a of team(state)){
  const m=campaign.operators.find(x=>x.id===a.id);
  if(m){a.name=m.callsign;a.skills={...m.skills};}
 }
}
let state:Session=newSession(0,legacyStudy?undefined:initialSiteSeed,
  selectedIntelMode,requestedSiteScale);
applyRosterIdentity(state,persistentRoster);
applyCampaignSkills();
let recorder=new MissionRecorder();recorder.capture(state,true);
const OPERATION_HISTORY_KEY='fieldwork3d.operation-history.v1';
let recordedOperation:Session|null=null;
function operationHistory():OperationRecord[]{
  try{return parseOperationHistory(localStorage.getItem(OPERATION_HISTORY_KEY));}
  catch{return [];}
}
function recordCompletedOperation(){
  if(replaying||recordedOperation===state||!state.started||
    (state.phase!=='won'&&state.phase!=='lost'))return;
  recordedOperation=state;
  if(campaignMode==='mission'&&campaign?.activeContractId){
   const members=team(state);
   const stats=debrief(state);
   const result:CampaignReport={
    id:'operation-'+campaign.activeContractId,contractId:campaign.activeContractId,
    day:campaign.day,outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,
    participatingIds:members.map(a=>a.id),
    casualties:members.filter(a=>a.health<=0).map(a=>a.id),
    objective:stats.objective,events:[]
   };
   campaign=resolveOperation(campaign,result);saveCampaign();return;
  }
  persistentRoster=recordRosterMission(state,persistentRoster);
  saveRoster();
  const stats=debrief(state);
  const record:OperationRecord={
    seed:state.site?.seed??state.variant,
    kind:state.missionType,
    outcome:state.phase==='won'?'success':'failure',
    grade:stats.grade,elapsed:stats.time,casualties:stats.casualties
  };
  try{localStorage.setItem(OPERATION_HISTORY_KEY,
    JSON.stringify(addOperationRecord(operationHistory(),record)));}
  catch{/* Private mode may reject local storage. Game still works. */}
}
let replaying=false,replayPlaying=false,replayTime=0,replayRate=1;
let replayPresentation:ReplayPresentation|null=null;
let replayOmniscient=true,finishedSession:Session|null=null;
let replayFollow=false,replayAnalysis=false,replayFollowId='rook';
let stage:TacticalScene3D|null=null;
let viewMode:ViewMode='iso';
try{stage=new TacticalScene3D();}
catch(error){console.warn('3D unavailable; reverting to tactical plan',error);
  viewMode='plan2d';}
// Explicit developer opt-in only; no hidden intelligence in normal gameplay.
const awarenessParam=new URLSearchParams(location.search).get('awareness');
const awarenessPanel=awarenessParam!==null?
  document.createElement('output'):null;
if(awarenessPanel){
 awarenessPanel.id='awarenessDiagnostics';
 Object.assign(awarenessPanel.style,{
  position:'fixed',right:'8px',top:'70px',zIndex:'75',
  maxWidth:'260px',whiteSpace:'pre-wrap',pointerEvents:'none',
  padding:'9px',font:'11px/1.35 monospace',
  color:'#dce3c9',background:'rgba(5,10,10,.88)'
 });
 document.body.append(awarenessPanel);
}
const navDiagnostics=new URLSearchParams(location.search).has('nav');
const navPanel=navDiagnostics?document.createElement('output'):null;
if(navPanel){
  navPanel.id='navDiagnostics';
  Object.assign(navPanel.style,{
    position:'fixed',left:'8px',top:'68px',zIndex:'70',
    pointerEvents:'none',background:'rgba(6,12,11,.83)',
    color:'#dce3c9',padding:'8px',font:'11px monospace',
    maxWidth:'210px',whiteSpace:'pre-wrap'
  });
  document.body.append(navPanel);
}
/** Optional, compact between-mission operations board.
 * No mandatory management screen blocks immediate mission deployment.
 */
const operationsToggle=document.createElement('button');
operationsToggle.id='operationsBoardToggle';operationsToggle.type='button';
operationsToggle.textContent='OPERATIONS';
operationsToggle.setAttribute('aria-label','Open squad operations and resupply');
ui.siteSettings.append(operationsToggle);
const operationsBoard=document.createElement('section');
operationsBoard.id='operationsBoard';
operationsBoard.hidden=true;
operationsBoard.setAttribute('aria-label','Squad operations board');
Object.assign(operationsBoard.style,{
 position:'fixed',right:'12px',top:'76px',bottom:'84px',zIndex:'95',
 boxSizing:'border-box',width:'min(360px, calc(100vw - 24px))',
 overflowY:'auto',padding:'14px',borderRadius:'12px',
 background:'rgba(12,20,20,.96)',border:'1px solid #687973',
 color:'#e0e9de',font:'13px/1.45 Oxanium, sans-serif',
 boxShadow:'0 12px 35px #0008'
});
document.body.append(operationsBoard);
function renderOperationsBoard(){
 operationsBoard.replaceChildren();
 const heading=document.createElement('div');
 heading.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px';
 const title=document.createElement('strong');
 title.textContent='SQUAD OPERATIONS';heading.append(title);
 const close=document.createElement('button');
 close.type='button';close.textContent='CLOSE';
 close.addEventListener('click',()=>{operationsBoard.hidden=true;});
 heading.append(close);operationsBoard.append(heading);
 const history=operationHistory();
 const intro=document.createElement('p');
 intro.textContent='OPERATIONS: '+history.length+
  ' · LAST: '+(history.at(-1)?.grade??'NONE')+
  ' · Gear and injuries carry between deployments.';
 operationsBoard.append(intro);
 for(const member of persistentRoster.members){
  const card=document.createElement('article');
  card.style.cssText='border:1px solid #566760;border-radius:9px;padding:10px;margin:9px 0';
  const name=document.createElement('strong');
  name.textContent=member.callsign+'  ·  '+member.weapon.toUpperCase();
  card.append(name);
  const details=document.createElement('p');
  details.textContent=member.missions+' OPS · '+member.successful+
   ' SUCCESSES · '+member.magazine+' / '+member.reserve+' RDS'+
   (member.recovery>0?' · RECOVERING '+member.recovery+' OPS':' · READY');
  card.append(details);
  const actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const supply=document.createElement('button');
  supply.type='button';supply.textContent='RESUPPLY';
  supply.setAttribute('aria-label','Resupply '+member.callsign);
  supply.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   persistentRoster=resupplyRoster(persistentRoster,member.id);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   renderOperationsBoard();updateHud();
  });
  actions.append(supply);
  const equip=document.createElement('button');
  equip.type='button';equip.textContent='NEXT WEAPON';
  equip.setAttribute('aria-label','Change weapon for '+member.callsign);
  equip.addEventListener('click',()=>{
   if(state.phase!=='planning'||replaying)return;
   const ids=['carbine','smg','rifle','shotgun'] as const;
   const next=ids[(ids.indexOf(member.weapon)+1)%ids.length];
   persistentRoster=equipRoster(persistentRoster,member.id,next);
   saveRoster();applyRosterIdentity(state,persistentRoster);
   renderOperationsBoard();updateHud();
  });
  actions.append(equip);card.append(actions);operationsBoard.append(card);
 }
 const hint=document.createElement('p');
 hint.textContent='Close to deploy normally. Recovery advances after each operation.';
 operationsBoard.append(hint);
}
operationsToggle.addEventListener('click',()=>{
 if(state.phase!=='planning'||replaying)return;
 operationsBoard.hidden=!operationsBoard.hidden;
 if(!operationsBoard.hidden){
  hideContextPalette();
  renderOperationsBoard();
 }
});
let selected='rook';
let looking=false,flashMode=false;
let firePlacement:'focus'|'suppress'|null=null;
let lookMode:'look'|'pie'|'strafe'='look';
let contextSignature='';
let contextActionsSignature='';
let lastContextSide:MenuSide|null=null;
let lastAuthoringAt=0;
const paletteMotion=new PaletteMotion();
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
let paletteWidth=0,paletteHeight=0;
let tetherBrightUntil=0;
let paletteExit:Animation|null=null;
const contextTether=document.createElement('div');
contextTether.id='contextTether';
contextTether.setAttribute('aria-hidden','true');
document.body.append(contextTether);
function hideContextPalette(){
  if(!paletteMotion.active)return;
  paletteMotion.hide();contextTether.hidden=true;
  ui.context.style.pointerEvents='none';
  if(reducedMotionMedia.matches){ui.context.hidden=true;return;}
  paletteExit?.cancel();
  paletteExit=ui.context.animate([
    {opacity:1,scale:1},{opacity:0,scale:.96}
  ],{duration:115,easing:'ease-in',fill:'forwards'});
  const exit=paletteExit;
  exit.onfinish=()=>{
    if(!paletteMotion.active){ui.context.hidden=true;exit.cancel();}
    if(paletteExit===exit)paletteExit=null;
  };
}
function advanceContextPalette(dt:number){
  if(ui.context.hidden||!paletteMotion.active){contextTether.hidden=true;return;}
  const reduced=reducedMotionMedia.matches;
  paletteMotion.step(dt,reduced);
  const x=paletteMotion.x.position,y=paletteMotion.y.position;
  ui.context.style.transform='translate3d('+x.toFixed(2)+'px,'+
    y.toFixed(2)+'px,0)';
  const w=paletteWidth,h=paletteHeight;
  const ax=paletteMotion.anchorX,ay=paletteMotion.anchorY;
  const bx=Math.max(x,Math.min(ax,x+w));
  const by=Math.max(y,Math.min(ay,y+h));
  const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  const visible=length>24&&!reduced;
  contextTether.hidden=!visible;
  if(visible){
    // At long distance use only a nearby pointer instead of cutting
    // straight across the entire tactical board.
    const short=length>390,segment=short?45:length;
    const vx=dx/length,vy=dy/length;
    const sx=short?bx-vx*segment:ax,sy=short?by-vy*segment:ay;
    contextTether.style.left=sx+'px';contextTether.style.top=sy+'px';
    contextTether.style.width=segment+'px';
    contextTether.style.opacity=performance.now()<tetherBrightUntil?'.75':
      length>390?'.32':length>210?'.22':'.43';
    contextTether.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  }
}
let selectedNode:number|null=null;
let doorMenuDismissedId:string|null=null;
let flashDoorId:string|null=null;
let armedOrigin:'here'|'end'='end';
let doorFocusId:string|null=null;
let draggingNode:Pt|null=null;
function cancelTargeting(){
  looking=false;flashMode=false;firePlacement=null;flashDoorId=null;
  contextSignature='';updateHud();
}
const fogCanvas=document.createElement('canvas');
fogCanvas.width=FOG_WIDTH;fogCanvas.height=FOG_HEIGHT;
const fogContext=fogCanvas.getContext('2d');
if(!fogContext)throw Error('Fog canvas unavailable');
let fogStamp=-1;
let audio:AudioContext|null=null;
let lastSoundShotId=0,lastEventAudio='';
let lastFootstepSoundTime=0;
const playTone=(frequency:number,decay:number,noise=false,
  level=1,pan=0)=>{
  try{
    if(!audio)return;
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=noise?'sawtooth':'triangle';osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.065*Math.max(.02,level),audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+decay);
    osc.connect(gain);
    if(typeof audio.createStereoPanner==='function'){
      const stereo=audio.createStereoPanner();
      stereo.pan.value=Math.max(-1,Math.min(1,pan));
      gain.connect(stereo);stereo.connect(audio.destination);
    }else gain.connect(audio.destination);
    osc.start();osc.stop(audio.currentTime+decay+.01);
  }catch{/* Audio must never interrupt control. */}
};
// Separate, low-volume UI cues reuse the existing unlocked WebAudio context.
let uiSoundEnabled=true,lastUiCue=0;
try{uiSoundEnabled=localStorage.getItem('fieldwork3d.ui.sound')!=='off';}
catch{/* Storage is optional. */}
function uiClickTone(kind:'select'|'command'|'go'|'pause'|'warning'){
  if(!uiSoundEnabled)return;
  const now=performance.now();if(now-lastUiCue<75)return;
  lastUiCue=now;
  unlockAudio();
  try{
    if(!audio||audio.state!=='running')return;
    const frequencies={select:480,command:610,go:330,pause:255,warning:170};
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type=kind==='go'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(frequencies[kind],audio.currentTime);
    if(kind==='go')oscillator.frequency.exponentialRampToValueAtTime(
      240,audio.currentTime+.14);
    const duration=kind==='go'?.15:kind==='pause'?.085:.055;
    gain.gain.setValueAtTime(kind==='go'?.018:.010,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
    oscillator.connect(gain);gain.connect(audio.destination);
    oscillator.start();oscillator.stop(audio.currentTime+duration+.015);
  }catch{/* UI feedback never blocks interaction. */}
}
function unlockAudio(){
  try{
    if(!audio&&typeof AudioContext!=='undefined')audio=new AudioContext();
    if(audio?.state==='suspended')void audio.resume();
  }catch{/* WebAudio may be unavailable in embedded browsers. */}
}

let last=performance.now(),accum=0,hudAt=0;
let previousRenderActors:Record<string,RenderActor>|null=null;
const displayRouteCache=new DisplayRouteCache();
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let trace:Pt[]|null=null;
const activePointers=new Map<number,{x:number;y:number;startX:number;startY:number;
  wasUnit:boolean;nodeId:number|null;
  mode:'undecided'|'route'|'pan'|'node'|'pivot'|'sweep'|'cameraOrbit'|'cameraPan'|'cameraMulti';moved:boolean}>();
let pinchDistance=0,panMid:Pt|null=null;
const colors:Record<string,string>={
  rook:'#a2d4ca',moss:'#b9c6a0',ash:'#dfb992',vale:'#b7b1d9',
};
const colorFor=(id:string)=>colors[id]??'#d9c5a3';
const squadIds=['rook','moss','ash','vale'] as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function layout(){
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  dpr=Math.min(devicePixelRatio||1,2);
  feedbackLayer.width=Math.round(cssW*dpr);
  feedbackLayer.height=Math.round(cssH*dpr);
  feedbackLayer.style.width=cssW+'px';
  feedbackLayer.style.height=cssH+'px';
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  stage?.resize(cssW,cssH);
  const available=Math.max(240,cssH-(cssH<500?85:172));
  const bounds=activeWorldBounds();
  const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  const fit=Math.min((cssW-20)/width,available/height);
  viewScale=fit*zoom;
  ox=cssW/2-(bounds.minX+bounds.maxX)*viewScale/2+panX;
  oy=cssH/2-(bounds.minY+bounds.maxY)*viewScale/2-11+panY;
}
const toWorld=(x:number,y:number):Pt=>{
  if(stage&&viewMode!=='plan2d')return stage.screenToWorld(x,y)??{x:-500,y:-500};
  return {x:(x-ox)/viewScale,y:(y-oy)/viewScale};
};
const worldToScreen=(p:Pt,height=4):Pt=>
  stage&&viewMode!=='plan2d'?stage.project(p,height):
    {x:ox+p.x*viewScale,y:oy+p.y*viewScale};
function fitZoom(next:number,x=cssW/2,y=cssH/2){
  if(stage&&viewMode!=='plan2d'){
    stage.zoomAt(clamp(next,.65,6)/stage.view.zoom,x,y);
  }else{
    zoom=clamp(next,.65,4.8);layout();
  }
  updateContext();
}
function cameraMode(mode:ViewMode){
  viewMode=stage?mode:'plan2d';
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
  for(const [m,button] of [['iso',ui.viewIso],
    ['top',ui.viewTop],['plan2d',ui.view2d]] as const){
    button.setAttribute('aria-pressed',String(m===viewMode));
  }
  contextSignature='';updateHud();
}
function turnCamera(shift:number){
  if(stage&&viewMode!=='plan2d'){
    stage.rotate(shift);updateContext();
  }
}
const uid=(id:string)=>team(state).find(o=>o.id===id);
function selectUnit(id:string){
  const actor=uid(id);if(!actor||actor.health<=0)return;
  uiClickTone('select');selected=id;looking=false;
  selectedNode=null;doorFocusId=null;
  doorMenuDismissedId=null;updateHud();
}
// First-use explanations never obstruct play permanently; settings can reopen help.
let helpText='',helpUntil=0;
function showUiHelp(text:string,duration=4200){
  if(!text)return;
  helpText=text;helpUntil=performance.now()+duration;
}
function discoverAction(action:string,description:string){
  try{
    const key='fieldwork3d.ui.discovered.'+action;
    if(localStorage.getItem(key))return;
    localStorage.setItem(key,'1');
  }catch{/* in-memory hints still work when private storage is disabled */}
  showUiHelp(description);
}
function message(){
  if(replaying)return 'MISSION FILM · ORBIT, PAN, ZOOM AND SCRUB FREELY';
  if(flashMode)return 'FLASH: tap a target, or CANCEL to back out.';
  if(state.phase==='planning'){
    if(looking)return lookMode==='pie'?
      'PIE: tap a point to watch continuously while moving.':
      lookMode==='strafe'?
        'STRAFE: tap a direction to hold while moving.':
        'LOOK: tap a direction to face at this node, then resume normal travel-facing.';
    if(selectedNode!==null)return 'Waypoint selected: LOOK / PIE / STRAFE, drag to move, DELETE to remove.';
    return 'Tap a route line to insert a waypoint · tap a node to edit or delete.';
  }
  if(state.phase==='running')return 'Executing. Pause to change your plan.';
  return state.phase==='won'?'Station secured. Review your report.':
    'Team lost. Review the debrief and try another approach.';
}
function armFacing(mode:'look'|'pie'|'strafe'){
  looking=!looking||lookMode!==mode;
  lookMode=mode;
  armedOrigin=selectedNode===null?'here':'end';
  updateHud();
}
/** The tray never competes with the expanded TOOLS panel or GO/BACK. */
function focusedDoor(a:TeamActor,node:ReturnType<typeof selectedPlanNode>){
  const points=node?[node.p]:[finalPoint(a),a.p];
  const explicit=state.doors.find(d=>d.id===doorFocusId&&
    doorKnown(state.intel,d.id)&&
    points.some(p=>doorReachable(p,d)));
  if(explicit)return explicit;
  return state.doors.filter(d=>doorKnown(state.intel,d.id)&&
    d.id!==doorMenuDismissedId&&points.some(p=>
    doorReachable(p,d)))
    .sort((x,y)=>{
      const dx=Math.min(...points.map(p=>distance(p,doorCenter(x))));
      const dy=Math.min(...points.map(p=>distance(p,doorCenter(y))));
      return dx-dy;
    })[0];
}
function selectedPlanNode(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode);
}
/** The actor itself is HERE. Selected plan nodes own subsequent orders;
 * a door tap brings up ONLY door actions. No redundant HERE/END buttons. */
function updateContext(){
  if(state.phase!=='planning'||replaying||looking||flashMode||firePlacement||
     !ui.briefingPanel.hidden||
     draggingNode||trace||
     !ui.orders.classList.contains('compact')||!ui.siteSettings.hidden){
    hideContextPalette();return;
  }
  const a=uid(selected);
  if(!a||a.health<=0){hideContextPalette();return;}
  const node=selectedPlanNode();
  const door=doorFocusId?focusedDoor(a,node):undefined;
  const current=plannedControl(state,selected,node?.id);
  const at=finalPoint(a);
  const nearMovable=state.coverState.some(o=>canRelocateCover(o)&&
    distance(at,{x:o.x,y:o.y})<Math.max(o.w,o.h)/2+43);
  const nearWindow=state.windows.some(w=>w.operable&&!w.shattered&&
    distance(at,{x:w.x,y:w.y})<54);
  const choices=contextActionChoices({
    door:!!door,node:!!node,flashRemaining:state.flashRemaining,
    nearMovable,nearWindow,
    posture:current.posture,pace:current.pace,
    firePolicy:node?.firePolicyState??a.firePolicy,
    reserve:a.reserve,magazine:a.magazine,
    doorOpen:!!door&&(door.openFraction??(door.open?1:0))>=.35,
    nodeKind:node?.kind,aimLabel:node?.aimLabel,
    nodeFirePolicy:node?.firePolicyState,
  });
  const paletteChoices=choices.filter(choice=>choice.group!=='state');
  // The four persistent toggles have their own stationary bar above the HUD.
  // Reconcile buttons in-place: avoid tearing down the menu when a toggle changes.
  const identity=(door?'door:'+door.id:node?'node:'+node.id:'here')+'/'+selected;
  const contextChanged=contextSignature!==identity;
  if(contextChanged){
    tetherBrightUntil=performance.now()+420;
    contextActionsSignature='';
    contextSignature=identity;
    ui.context.replaceChildren();
    const primary=document.createElement('div');primary.className='context-primary';
    const secondary=document.createElement('div');secondary.className='context-state';
    const destructive=document.createElement('div');destructive.className='context-danger';
    ui.context.append(primary,secondary,destructive);
  }
  const actionSignature=identity+'/'+paletteChoices.map(c=>
    c.id+':'+c.label+':'+c.group+':'+!!c.disabled+':'+!!c.pressed).join('|');
  if(contextActionsSignature!==actionSignature){
  contextActionsSignature=actionSignature;
  const buckets:Record<string,HTMLElement>={
    primary:ui.context.querySelector<HTMLElement>('.context-primary')!,
    state:ui.context.querySelector<HTMLElement>('.context-state')!,
    destructive:ui.context.querySelector<HTMLElement>('.context-danger')!
  };
  const wanted=new Set<string>();
  for(const choice of paletteChoices){
    wanted.add(choice.id);
    let button=ui.context.querySelector<HTMLButtonElement>(
      'button[data-action="'+choice.id+'"]');
    if(!button){
      button=document.createElement('button');
      button.type='button';button.dataset.action=choice.id;
    }
    const iconKey=tacticalIconForState(choice.id,choice.label);
    if(button.dataset.icon!==iconKey){
      button.querySelector('.ui-icon')?.remove();
      button.prepend(tacticalIcon(iconKey));
      button.dataset.icon=iconKey;
    }
    let label=button.querySelector<HTMLElement>('.command-label');
    if(!label){
      label=document.createElement('span');label.className='command-label';
      button.append(label);
    }
    if(label.textContent!==choice.label)label.textContent=choice.label;
    button.setAttribute('aria-label',choice.label);
    button.title=choice.title??choice.label;
    button.disabled=!!choice.disabled;
    if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
    else button.setAttribute('aria-pressed',String(choice.pressed));
    button.classList.toggle('danger',choice.group==='destructive');
    if(button.parentElement!==buckets[choice.group])
      buckets[choice.group].append(button);
  }
  for(const btn of ui.context.querySelectorAll<HTMLButtonElement>('button[data-action]')){
    if(!wanted.has(btn.dataset.action??''))btn.remove();
  }
  buckets.state.hidden=!buckets.state.childElementCount;
  buckets.destructive.hidden=!buckets.destructive.childElementCount;
  ui.context.classList.toggle('door-menu',!!door);
  }
  if(paletteExit){paletteExit.cancel();paletteExit=null;}
  ui.context.hidden=false;
  ui.context.style.pointerEvents='auto';
  if(contextChanged&&!reducedMotionMedia.matches)
    ui.context.animate([{opacity:.78,scale:.96},{opacity:1,scale:1}],
      {duration:160,easing:'cubic-bezier(.2,.8,.2,1)'});
  ui.context.dataset.door=door?.id??'';
  ui.context.setAttribute('aria-label',door?
    'Door actions':'Selected position actions and operator settings');
  // Keep the full operator bodies, selected route, and tap targets visible.
  // Don't inspect concealed enemies: context placement must not leak intel.
  const target=door?doorCenter(door):node?.p??a.p;
  const anchor=worldToScreen(target,door?15:node?8:24);
  const w=ui.context.offsetWidth,h=ui.context.offsetHeight;
  paletteWidth=w;paletteHeight=h;
  const header=document.querySelector<HTMLElement>('.top');
  const nav=document.querySelector<HTMLElement>('.bar');
  const minY=Math.max(8,(header?.getBoundingClientRect().bottom??62)+8);
  const hudTop=!ui.quickStates.hidden?
    ui.quickStates.getBoundingClientRect().top:
    (nav?.getBoundingClientRect().top??ui.play.getBoundingClientRect().top);
  const maxY=Math.max(minY+h,hudTop-10);
  const avoid:AvoidRect[]=[{x:anchor.x-38,y:anchor.y-38,
    w:76,h:76,weight:3}];
  for(const unit of team(state)){
    const feet=worldToScreen(unit.p,0),head=worldToScreen(unit.p,30);
    avoid.push({x:Math.min(feet.x,head.x)-29,
      y:Math.min(feet.y,head.y)-17,
      w:Math.abs(head.x-feet.x)+58,
      h:Math.abs(head.y-feet.y)+34,weight:3});
  }
  // Known visible contacts also deserve clear sightlines. Hidden enemies must
  // never enter the placement heuristic (that would leak fog-of-war intel).
  for(const hostile of enemies(state)){
    if(hostile.health<=0||!isSeen(state,hostile))continue;
    const p=worldToScreen(hostile.p,20);
    avoid.push({x:p.x-31,y:p.y-38,w:62,h:76,weight:4});
  }
  const paths:ScreenPath[]=[];
  // Avoid all friendly-authored routes, not only the selected unit's plan.
  // Teammates and their paths remain known even behind current fog.
  for(const friendly of team(state)){
    let previous=friendly.p;
    for(const waypoint of friendly.plan){
      if(waypoint.kind==='move'||waypoint.kind==='door'){
        paths.push({a:worldToScreen(previous,8),
          b:worldToScreen(waypoint.p,8)});
        previous=waypoint.p;
      }
      const p=worldToScreen(waypoint.p,8);
      avoid.push({x:p.x-19,y:p.y-19,w:38,h:38,
        weight:friendly.id===selected?2:1.3});
    }
  }
  for(const overlay of [ui.hint,ui.feed]){
    if(overlay.hidden||!overlay.getClientRects().length)continue;
    const r=overlay.getBoundingClientRect();
    avoid.push({x:r.left-7,y:r.top-7,w:r.width+14,h:r.height+14});
  }
  // Protect the next-tap region, not just the selected node itself.
  // The palette should choose unused screen space away from the editing lane.
  const activeEditing=performance.now()-lastAuthoringAt<1150;
  const radius=cssW<=600?(activeEditing?148:118):100;
  const actorPoint=worldToScreen(a.p,8);
  const lastPoint=worldToScreen(finalPoint(a),8);
  const editingZones=[
    {x:anchor.x-radius,y:anchor.y-radius,w:radius*2,h:radius*2},
    {x:lastPoint.x-90,y:lastPoint.y-90,w:180,h:180},
    {x:actorPoint.x-75,y:actorPoint.y-75,w:150,h:150},
  ];
  const vx=lastPoint.x-actorPoint.x,vy=lastPoint.y-actorPoint.y;
  const length=Math.hypot(vx,vy);
  const dir=length>35?{x:vx/length,y:vy/length}:{x:0,y:-1};
  const corridor={a:anchor,b:{
    x:anchor.x+dir.x*(activeEditing?245:190),
    y:anchor.y+dir.y*(activeEditing?245:190)}};
  const placement=placeContextMenu({
    anchor,width:w,height:h,viewportWidth:cssW,
    top:minY,bottom:maxY,avoid,paths,preferredSide:lastContextSide,
    authoring:editingZones,corridor,
    minClearance:cssW<=600?(activeEditing?142:112):100,
    preferredPosition:paletteMotion.active?
      {x:paletteMotion.targetX,y:paletteMotion.targetY}:null,
  });
  lastContextSide=placement.side;
  paletteMotion.set(placement.x,placement.y,anchor.x,anchor.y);
  // Keep the actual menu hit target in its visually interpolated position.
  // Geometry measurement uses offsetWidth/Height (unaffected by transforms).
}
// Pointer-held explanations do not also dispatch the underlying tactical order.
let contextHoldTimer:ReturnType<typeof setTimeout>|null=null;
let contextHeldAt=-Infinity;
const cancelContextHold=()=>{
  if(contextHoldTimer!==null){clearTimeout(contextHoldTimer);contextHoldTimer=null;}
};
ui.context.addEventListener('pointerdown',event=>{
  cancelContextHold();
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(!button||button.disabled)return;
  contextHoldTimer=setTimeout(()=>{
    contextHoldTimer=null;contextHeldAt=performance.now();
    showUiHelp(button.title||button.getAttribute('aria-label')||'',5500);
    updateHud();
  },450);
});
ui.context.addEventListener('pointerup',cancelContextHold);
ui.context.addEventListener('pointercancel',cancelContextHold);
ui.context.addEventListener('pointerleave',cancelContextHold);
const handleContextAction=(event:MouseEvent)=>{
  if(performance.now()-contextHeldAt<400){event.preventDefault();return;}
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(!button||state.phase!=='planning')return;
  const action=button.dataset.action;
  if(action)discoverAction(action,button.title);
  const a=uid(selected);
  if(!a)return;
  const beforeErrors=state.events.length;
  const node=selectedPlanNode();
  const door=doorFocusId?focusedDoor(a,node):undefined;
  const current=plannedControl(state,selected,node?.id);
  switch(action){
    case 'ctxFire':{
      const active=node?.firePolicyState??a.firePolicy;
      const policy=active==='engage'?'hold':
        active==='hold'?'return':'engage';
      setFirePolicy(state,selected,policy,node?.id);
      break;
    }
    case 'ctxFocus':
      firePlacement='focus';looking=false;flashMode=false;
      tacticalFeedback.emit('command',node?.p??a.p,'FOCUS');
      uiClickTone('command');updateHud();return;
    case 'ctxSuppress':
      firePlacement='suppress';looking=false;flashMode=false;
      tacticalFeedback.emit('command',node?.p??a.p,'SUPPRESS');
      uiClickTone('command');updateHud();return;
    case 'ctxFlash':
      if(state.flashRemaining>0){flashMode=true;flashDoorId=null;
        looking=false;firePlacement=null;}
      break;
    case 'ctxLook':
      tacticalFeedback.emit('command',node?.p??a.p,'LOOK');
      uiClickTone('command');armFacing('look');return;
    case 'ctxPie':
      tacticalFeedback.emit('command',node?.p??a.p,'PIE');
      uiClickTone('command');armFacing('pie');return;
    case 'ctxWait':{
      if(node?.kind==='wait')setWaitDuration(state,selected,node.id,.5);
      else planWaitAt(state,selected,.5,node?'end':'here',node?.id);
      break;
    }
    case 'ctxStance':{
      const value=current.posture==='stand'?'crouch':'stand';
      if(node)setNodeControl(state,selected,node.id,'postureState',value);
      else posture(state,selected);
      fogStamp=-1;break;
    }
    case 'ctxPace':{
      const value=current.pace==='walk'?'run':'walk';
      if(node)setNodeControl(state,selected,node.id,'paceState',value);
      else setStartPace(state,selected,value);
      break;
    }
    case 'ctxReload':
      if(!planReloadAt(state,selected,node?.id))
        state.events.push('CANNOT PLAN RELOAD');
      break;
    case 'ctxPush':
      if(!planNearbyInteraction(state,selected,'push'))
        state.events.push('NO PUSHABLE OBJECT IN REACH');
      break;
    case 'ctxWindow':{
      const at=finalPoint(a);
      const nearby=state.windows.filter(w=>w.operable&&!w.shattered&&
        distance(at,{x:w.x,y:w.y})<54)
        .sort((x,y)=>distance(at,{x:x.x,y:x.y})-
          distance(at,{x:y.x,y:y.y}))[0];
      if(!nearby||!planNearbyInteraction(state,selected,
        nearby.open?'close-window':'open-window'))
        state.events.push('NO OPERABLE WINDOW IN REACH');
      break;
    }
    case 'ctxDoorFlash':
      if(!door){state.events.push('SELECT A DOOR FIRST');break;}
      flashDoorId=door.id;flashMode=true;looking=false;
      doorFocusId=null;doorMenuDismissedId=door.id;break;
    case 'ctxDelete':
      if(node)deletePlanNode(state,selected,node.id);
      selectedNode=null;doorFocusId=null;break;
    case 'ctxOpen':
    case 'ctxClose':
    case 'ctxKick':
    case 'ctxHold':
      if(door&&!doorAtNode(state,selected,door.id,
        action==='ctxOpen'?'open':action==='ctxClose'?'close':
        action==='ctxKick'?'kick':'hold',
        node&&distance(node.p,doorCenter(door))<=43?node.id:undefined))
        state.events.push('DOOR NOT REACHABLE FROM THAT POINT');
      doorFocusId=null;doorMenuDismissedId=door?.id??null;break;
  }
  const failed=state.events.length>beforeErrors;
  uiClickTone(failed?'warning':'command');
  tacticalFeedback.emit(failed?'error':'command',
    door?doorCenter(door):node?.p??a.p,
    failed?'Blocked':button.querySelector('.command-label')?.textContent??'');
  updateHud();
};
ui.context.addEventListener('click',handleContextAction);
ui.quickStates.addEventListener('click',handleContextAction);
// World-first status: repetitive instructions are hidden; critical events persist.
let lastNoticeKey='',noticeBorn=0;
function updateUiNotice(node:HTMLElement,events:string[],phase:string){
  const latest=events.at(-1)??'';
  const key=events.length+'|'+latest+'|'+phase;
  if(key!==lastNoticeKey){lastNoticeKey=key;noticeBorn=performance.now();}
  const critical=/DOWN|BLOCKED|INVALID|FAILED|OUT OF RANGE|NO WALKABLE|CANNOT|LOST/i.test(latest);
  const show=!!latest&&(critical||performance.now()-noticeBorn<2600);
  node.hidden=!show;
  if(show)node.textContent=latest;
  node.classList.toggle('critical',critical&&show);
}
function updateQuickStates(){
  const actor=uid(selected);
  const shown=state.phase==='planning'&&!replaying&&!!actor&&actor.health>0;
  ui.quickStates.hidden=!shown;
  // Keep secondary sheets above the *whole* HUD, not just its bottom row.
  const height=Math.ceil(ui.tacticalHud.getBoundingClientRect().height);
  const value=height+'px';
  if(document.documentElement.style.getPropertyValue('--tactical-hud-height')!==value)
    document.documentElement.style.setProperty('--tactical-hud-height',value);
  if(!shown||!actor)return;
  const node=selectedPlanNode();
  const index=node?actor.plan.findIndex(n=>n.id===node.id)+1:0;
  ui.quickScope.textContent=node?'NODE '+index:'HERE';
  const current=plannedControl(state,selected,node?.id);
  const choices=contextActionChoices({
    door:false,node:!!node,flashRemaining:state.flashRemaining,
    posture:current.posture,pace:current.pace,
    firePolicy:node?.firePolicyState??actor.firePolicy,
    reserve:actor.reserve,magazine:actor.magazine
  }).filter(c=>c.group==='state');
  for(const choice of choices){
    const button=ui.quickStates.querySelector<HTMLButtonElement>(
      'button[data-action="'+choice.id+'"]');
    if(!button)continue;
    const iconKey=tacticalIconForState(choice.id,choice.label);
    if(button.dataset.icon!==iconKey){
      button.querySelector('.ui-icon')?.remove();
      button.prepend(tacticalIcon(iconKey));
      button.dataset.icon=iconKey;
    }
    const label=button.querySelector<HTMLElement>('.command-label');
    if(label&&label.textContent!==choice.label)label.textContent=choice.label;
    button.title=choice.title??choice.label;
    button.setAttribute('aria-label',(node?'Waypoint: ':'Operator: ')+
      choice.label+'. '+(choice.title??''));
    button.disabled=!!choice.disabled;
    if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
    else button.setAttribute('aria-pressed',String(choice.pressed));
  }
}
const blockedEpisode=new Map<string,string>();
function updateHud(){
  updateQuickStates();
  recordCompletedOperation();
  const brief=operationBriefing(state);
  ui.briefingTitle.textContent=brief.code+' / '+brief.name;
  ui.briefingBody.textContent=brief.objective+'\n\nSUCCESS: '+
    brief.condition+'\nEXTRACT: '+brief.extraction+'\n\nSITE: '+
    brief.building+' · '+brief.layout+'\nSQUAD: '+brief.squad+
    ' OPERATORS\n\nINTELLIGENCE: '+brief.notes+
    '\n\nROSTER: '+persistentRoster.members.map(m=>
      m.callsign+' ('+m.missions+' ops)').join(' · ');
  if(state.phase!=='planning'){
    ui.briefingPanel.hidden=true;operationsBoard.hidden=true;
  }
  operationsToggle.disabled=state.phase!=='planning'||replaying;
  ui.phase.textContent=replaying?'REPLAY':
    state.phase==='planning'?'PLANNING':
    state.phase==='running'?'EXECUTING':
    state.phase==='won'?'COMPLETE':'FAILED';
  ui.phase.classList.toggle('live',state.phase==='running');
  ui.phase.classList.toggle('done',state.phase==='won'||state.phase==='lost');
  const seconds=Math.floor(state.seconds);
  ui.clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
  const primaryMode=state.phase==='running'?'pause':
    state.phase==='planning'?'go':'reset';
  if(ui.play.dataset.mode!==primaryMode){
    const previousMode=ui.play.dataset.mode;
    ui.play.dataset.mode=primaryMode;
    const label=document.createElement('span');
    label.textContent=primaryMode==='go'?'GO':
      primaryMode==='pause'?'PAUSE':'RESET';
    label.className='go-label';
    ui.play.replaceChildren(tacticalIcon(primaryMode),label);
    ui.play.setAttribute('aria-label',primaryMode==='go'?'Execute plan':
      primaryMode==='pause'?'Pause execution':'Reset encounter');
    if(previousMode&&!reducedMotionMedia.matches){
      ui.play.animate([
        {transform:'scale(.93)',filter:'brightness(1.14)'},
        {transform:'scale(1.055)',filter:'brightness(1.25)',offset:.43},
        {transform:'scale(1)',filter:'brightness(1)'}
      ],{duration:295,easing:'cubic-bezier(.16,.85,.25,1)'});
      ui.phase.animate([
        {opacity:.65,transform:'translateY(3px)'},
        {opacity:1,transform:'translateY(-2px)',offset:.55},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:300,easing:'ease-out'});
    }
  }
  ui.play.classList.toggle('running',state.phase==='running');
  const active=uid(selected);
  if(navPanel){
    navPanel.textContent=team(state).map(a=>a.name+'  '+
      a.lastBlocker.toUpperCase()+
      '  blocked '+a.blockedTime.toFixed(2)+'s\n'+
      'nav '+a.nav.length+'  orders '+a.plan.length+
      '  ('+a.p.x.toFixed(0)+','+a.p.y.toFixed(0)+')').join('\n');
  }
  canvas.dataset.navBlock=active?.lastBlocker??'clear';
  // Read-only plan status for phone gesture regression tests.
  canvas.dataset.planNodes=String(active?.plan.length??0);
  canvas.dataset.selectedNode=selectedNode===null?'':String(selectedNode);
  ui.stance.textContent=active?.posture==='crouch'?'STAND':'CROUCH';
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  ui.variant.textContent='NEW SITE';
  ui.variant.disabled=campaignMode==='mission';
  ui.siteSize.disabled=campaignMode==='mission';
  ui.intelMode.disabled=campaignMode==='mission';
  ui.intelMode.textContent='INTEL · '+selectedIntelMode.replace('-', ' ').toUpperCase();
  ui.flash.textContent='FLASH ×'+state.flashRemaining;
  ui.cancelTarget.hidden=!(state.phase==='planning'&&
    (looking||flashMode||!!firePlacement));
  ui.loadout.textContent='WEAPON · '+(active?.weapon.toUpperCase()??'—');
  ui.flash.disabled=state.flashRemaining<=0||replaying;
  ui.back.disabled=!active?.plan.length;
  ui.undo.disabled=!(active?.history.undo.length);
  ui.redo.disabled=!(active?.history.redo.length);
  ui.debrief.hidden=replaying||(state.phase!=='won'&&state.phase!=='lost');
  ui.next.textContent=campaignMode==='mission'?'RETURN TO BASE':'NEXT ARRANGEMENT';
  ui.retry.disabled=campaignMode==='mission';
  if(!ui.debrief.hidden){
    const stats=debrief(state);
    ui.debriefTitle.textContent=state.phase==='won'?'OPERATION COMPLETE':'MISSION FAILED';
    ui.debriefStats.textContent=
      'OPERATION: '+brief.name.toUpperCase()+'\nGRADE: '+stats.grade+
      ' · SCORE '+stats.score+'\nTIME: '+stats.time+'s'+
      '\nOBJECTIVE: '+(stats.objective?'SECURED':'NOT COMPLETED')+
      '\nSURVIVORS: '+stats.survived+'/'+team(state).length+
      '\nSHOTS: '+stats.shots+' | HITS: '+stats.hits+
      ' | ACCURACY: '+stats.accuracy+'%'+
      '\nCASUALTIES: '+stats.casualties+' · PAUSES: '+stats.pauses+
      '\n'+stats.squad.map(o=>o.name+' '+(o.survived?
        o.injury?'WOUNDED':'ACTIVE':'DOWN')+' · '+o.fired+' RDS').join('\n')+
      '\nOPERATIONS LOGGED: '+operationHistory().length+
      '\n\nTACTICAL TIMELINE\n'+formatAfterAction(recorder.events,10);
  }
  for(const id of squadIds){
    const a=uid(id),button=ui[id];
    button.hidden=!a;
    button.classList.toggle('selected',id===selected);
    button.classList.toggle('down',!a||a.health<=0);
    button.title=a?WEAPONS[a.weapon].label+' • '+
      injuryOf(a.injuryStage).toUpperCase():'NO OPERATOR';
    button.classList.toggle('loading',!!a&&a.reload>0);
    button.style.setProperty('--reload-progress',
      ((a?.reload??0)>0?Math.round(100*(1-a!.reload/
        (WEAPONS[a!.weapon].reload*(a!.injuryStage===2?1.5:
          a!.injuryStage===1?1.1:1)))):0)+'%');
    ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'].textContent=
      a?String(a.magazine).padStart(2,'0')+' / '+a.reserve+
      (a.reload>0?' ↻':''):'--';
    button.setAttribute('aria-pressed',String(id===selected));
    ui[(id+'Hp') as 'rookHp'|'mossHp'|'ashHp'|'valeHp'].textContent=
      !a?'--':a.health<=0?'DOWN':
      a.injuryStage===2?'HEAVY':a.injuryStage===1?'HURT':'OK';
    // Compact visual condition, with full text retained for accessibility.
    const condition=!a?'missing':a.health<=0?'down':
      a.injuryStage===2?'heavy':a.injuryStage===1?'hurt':'healthy';
    const fill=condition==='down'?0:condition==='heavy'?34:
      condition==='hurt'?67:100;
    button.style.setProperty('--health-fill',fill+'%');
    button.style.setProperty('--health-color',
      condition==='heavy'?'#c77f68':condition==='hurt'?'#d0ad76':'#91b5a5');
    button.dataset.condition=condition;
    button.setAttribute('aria-label',a?
      a.name+', '+condition+', '+a.magazine+
      ' rounds loaded, '+a.reserve+' reserve'+(a.reload>0?', reloading':''):
      id+', unavailable');
  }
  document.querySelector('.ident strong')!.textContent=
    (state.site?.name??'CUTWOODS')+' / BREACH';
  document.querySelector('.ident small')!.textContent=state.site?
    (state.intel.mode==='floor-plan'?state.site.roomCount:'??')+
      ' ROOMS · '+team(state).length+' OPERATORS · SEED '+
      state.site.seed.toString(16).toUpperCase().padStart(8,'0'):
    'TWO ROOMS · TWO OPERATORS';
  const hasHelp=performance.now()<helpUntil;
  ui.hint.textContent=hasHelp?helpText:message();
  ui.hint.hidden=!(hasHelp||looking||flashMode||!!firePlacement);
  updateContext();
  updateUiNotice(ui.feed,state.events,state.phase);
  const visible=enemies(state).filter(e=>e.health>0&&isSeen(state,e)).length;
  ui.mission.textContent=(state.phase==='planning'?
      brief.code+' • ':'')+missionText(state)+
    (visible?' • '+visible+' CONTACT'+(visible===1?'':'S'):'');
}
function rect(x:number,y:number,w:number,h:number,color:string){
  draw.fillStyle=color;draw.fillRect(x,y,w,h);
}
function line(a:Pt,b:Pt,color:string,width:number){
  draw.beginPath();draw.moveTo(a.x,a.y);draw.lineTo(b.x,b.y);
  draw.lineWidth=width;draw.strokeStyle=color;draw.stroke();
}
function circle(x:number,y:number,r:number,color:string){
  draw.beginPath();draw.arc(x,y,r,0,2*Math.PI);draw.fillStyle=color;draw.fill();
}
function noise(x:number,y:number){const v=Math.sin(x*123.31+y*98.717)*43897.44;return v-Math.floor(v);}
function terrain(){
  rect(0,0,W,H,'#2c3733');
  // A deterministic, low-contrast base, not another terrain simulation.
  for(let y=6;y<H;y+=17)for(let x=6;x<W;x+=17){
    const n=noise(x,y);
    if(n>.56)rect(x+3*n,y+2*n,2+n*3,2,n>.85?'#435348':'#35453d');
  }
  if(state.site){
    const site=state.site;
    // Exterior access follows this actual generated entrance, not a
    // decorative road still pointing at the obsolete fixed station.
    const x=site.entrance.x,y=site.entrance.y;
    draw.fillStyle='#514e43';draw.beginPath();
    draw.moveTo(x-52,H);draw.lineTo(x+52,H);
    draw.lineTo(x+34,y-21);draw.lineTo(x-34,y-21);
    draw.closePath();draw.fill();
    for(const room of site.rooms){
      if(!roomKnown(state.intel,room.id))continue;
      const palette=['#666558','#526b66','#77705c','#58605a'];
      rect(room.x+2,room.y+2,room.w-4,room.h-4,
        room.kind==='hall'?'#4a5c55':palette[room.tone]);
      draw.strokeStyle='#b9b09b18';draw.lineWidth=.8;
      for(let a=room.x+15;a<room.x+room.w-10;a+=25)
        for(let b=room.y+15;b<room.y+room.h-10;b+=25)
          draw.strokeRect(a,b,25,25);
    }
    draw.strokeStyle='rgba(161,192,175,.06)';
    for(let a=0;a<=W;a+=GRID*2)
      line({x:a,y:0},{x:a,y:H},'rgba(161,192,175,.045)',.6);
    for(let b=0;b<=H;b+=GRID*2)
      line({x:0,y:b},{x:W,y:b},'rgba(161,192,175,.045)',.6);
    return;
  }
  // Dirt service road leading to the lower door.
  draw.fillStyle='#4a4840';draw.beginPath();
  draw.moveTo(230,H);draw.lineTo(400,H);
  draw.lineTo(352,534);draw.lineTo(271,534);draw.closePath();draw.fill();
  draw.strokeStyle='#585648';draw.lineWidth=9;draw.beginPath();
  draw.moveTo(268,H);draw.lineTo(294,536);
  draw.moveTo(363,H);draw.lineTo(324,536);draw.stroke();
  for(let y=540;y<H;y+=14)for(let x=230;x<400;x+=13){
    const n=noise(x*.7,y*.3);
    if(n>.6)circle(x+4*n,y+3*n,1.4,'#676251');
  }
  // Outside boundary and an overhead planning-grid.
  draw.strokeStyle='rgba(159,182,165,.08)';draw.lineWidth=1;
  for(let x=0;x<=W;x+=GRID*2)line({x,y:0},{x,y:H},'rgba(161,192,175,.055)',.6);
  for(let y=0;y<=H;y+=GRID*2)line({x:0,y},{x:W,y},'rgba(161,192,175,.055)',.6);
  rect(113,101,268,430,'#555247');
  rect(383,101,206,430,'#4d5753');
  // Floor wear, tiles and loose clutter — only enough for level recognition.
  for(let x=121;x<591;x+=24)for(let y=110;y<529;y+=24){
    draw.strokeStyle='#c5bca018';draw.lineWidth=1;
    draw.strokeRect(x,y,24,24);
    if(noise(x*.21,y*.17)>.8)rect(x+4,y+6,5,3,'#a49b7955');
  }
  // Entry threshold, inner doorway and exit-facing mat.
  rect(269,524,69,23,'#3e4b49');
  rect(374,298,16,54,'#374643');
  rect(278,549,51,10,'#707164');
  // Yard: sparse barrels, netting and access stairs.
  rect(175,570,65,23,'#515f55');
  rect(184,577,48,5,'#84917c');
  for(const [x,y] of [[170,653],[470,654],[543,701],[107,652]]){
    circle(x,y,10,'#4f5e57');circle(x,y,6,'#2c3b39');
  }
  // Quiet exterior rust / earth patches.
  for(const [x,y,r] of [[85,441,28],[558,548,33],[74,221,35],[525,694,24]]){
    draw.fillStyle='rgba(112,106,78,.15)';
    draw.beginPath();draw.ellipse(x,y,r,r*.52,.4,0,Math.PI*2);draw.fill();
  }
}
function furniture(){
  for(const [i,c] of COVER.entries()){
    if(coverPresentation(state,i,replaying&&replayOmniscient)==='unknown')continue;
    draw.fillStyle='#0f1b1c66';
    draw.fillRect(c.x-c.w/2+6,c.y-c.h/2+7,c.w,c.h);
    rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.low?'#81725b':'#485552');
    rect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8,c.low?'#60594b':'#394440');
    draw.strokeStyle='#a995777e';draw.lineWidth=2;
    draw.strokeRect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8);
    line({x:c.x-c.w/2+8,y:c.y},{x:c.x+c.w/2-8,y:c.y},'#9d907348',2);
  }
  if(state.site)return;
  // Furniture silhouettes reinforce sightline decisions.
  rect(170,140,35,22,'#51564c');rect(224,460,51,22,'#424b47');
  rect(438,303,32,38,'#505a52');rect(516,337,50,14,'#343f3e');
  circle(544,151,11,'#726d58');circle(544,151,7,'#494e46');
}
function wallShape(a:Pt,b:Pt){
  line({x:a.x+3,y:a.y+5},{x:b.x+3,y:b.y+5},'#0b181bd9',17);
  line(a,b,'#292f30',16);line(a,b,'#a39c86',7);
  line({x:a.x,y:a.y-2},{x:b.x,y:b.y-2},'#d5c9a962',1.4);
}
function architecture(){
  for(const [i,wall] of WALLS.entries())if(wallKnown(state.intel,i))
    wallShape(wall.a,wall.b);
  // Closed doors obscure sight and movement; opened doors have an arc.
  for(const door of state.doors){
    if(!doorKnown(state.intel,door.id))continue;
    const a=door.a,b=door.b,center=doorCenter(door);
    const visuallyOpen=liveVisibility(state,center)?
      (door.openFraction??(door.open?1:0)):
      (state.intel.doorMemory.get(door.id)??0);
    if(visuallyOpen<.14){
      line(a,b,'#1c2727',15);
      line(a,b,'#b5a17a',8);
      circle(a.x,a.y,3,'#ead0a0');circle(b.x,b.y,3,'#ead0a0');
      draw.save();draw.translate(center.x,center.y);
      draw.fillStyle='#e4d1a2';draw.font='bold 9px monospace';
      draw.textAlign='center';draw.fillText('Ⅱ',0,3);draw.restore();
    }else{
      // Remember only the last witnessed angle, never offscreen changes.
      const leaf=doorLeafSegment({...door,openFraction:visuallyOpen});
      line(leaf.a,leaf.b,'#c2b08a',7);
      circle(leaf.a.x,leaf.a.y,3,'#f0d8a9');
    }
  }
  const selectedDoor=state.doors.find(d=>
    d.id===doorFocusId&&doorKnown(state.intel,d.id));
  if(selectedDoor&&state.phase==='planning'){
    const hinge=selectedDoor.hinge==='b'?selectedDoor.b:selectedDoor.a;
    const swept=doorLeafSegment({...selectedDoor,openFraction:1});
    const current=doorLeafSegment(selectedDoor);
    draw.save();draw.globalAlpha=.36;draw.strokeStyle='#e7c995';
    draw.fillStyle='#d9b57b17';draw.setLineDash([5,5]);
    draw.beginPath();draw.moveTo(hinge.x,hinge.y);
    for(let i=0;i<=16;i++){
      const leaf=doorLeafSegment({...selectedDoor,openFraction:i/16});
      draw.lineTo(leaf.b.x,leaf.b.y);
    }
    draw.closePath();draw.fill();draw.stroke();draw.setLineDash([]);
    line(current.a,current.b,'#f4dba9',6);
    line(swept.a,swept.b,'#f4dba9',5);
    draw.restore();
  }
  // Narrow window markers (not navigable openings).
  if(state.site)return;
  for(const x of [211,501]){
    line({x,y:97},{x:x+52,y:97},'#8bb6af',4);
    line({x,y:94},{x:x+52,y:94},'#d4d5bb',2);
  }
}
function conical(a:TeamActor,radius=110){
  const a0=a.heading-.93,a1=a.heading+.93;
  draw.beginPath();draw.moveTo(a.p.x,a.p.y);
  draw.arc(a.p.x,a.p.y,radius,a0,a1);
  draw.closePath();
  draw.fillStyle=a.id===selected?'rgba(172,217,206,.075)':'rgba(178,199,168,.035)';
  draw.fill();
}
function paths(){
  for(const a of team(state)){
    if(a.health<=0)continue;
    const c=colorFor(a.id);
    const plan=a.plan;
    if(plan.length){
      draw.beginPath();draw.moveTo(a.p.x,a.p.y);
      let from=a.p;
      for(const node of plan){
        if(node.kind==='move'||node.kind==='door'){
          const course=displayRouteCache.get(from,node.p,state.intel,state.phase==='planning').points;
          for(const p of course)draw.lineTo(p.x,p.y);
          from=node.p;
        }else if(node.kind==='pie'&&node.arc?.length){
          for(const p of node.arc)draw.lineTo(p.x,p.y);
          from=node.p;
        }
      }
      draw.strokeStyle=c;draw.globalAlpha=a.id===selected?.88:.40;
      draw.lineWidth=a.id===selected?2.6:1.6;
      draw.setLineDash([8,4]);draw.stroke();draw.setLineDash([]);
      draw.globalAlpha=1;
    }
    for(let i=0;i<plan.length;i++){
      const n=plan[i],selectedNow=a.id===selected&&selectedNode===n.id;
      const point=selectedNow&&draggingNode&&n.kind!=='flash'?
        draggingNode:n.p;
      circle(point.x,point.y,selectedNow?10:7,
        selectedNow?'#ecd29f':n.kind==='move'?c:'#c8ae7f');
      circle(point.x,point.y,3,'#263836');
      draw.textAlign='center';draw.fillStyle='#111e20';
      draw.font='bold 10px monospace';
      draw.fillText(String(i+1),point.x,point.y+3.1);
      if(n.facing!==undefined){
        const end={x:point.x+Math.cos(n.facing)*40,
          y:point.y+Math.sin(n.facing)*40};
        line(point,end,c,2.1);circle(end.x,end.y,2.2,c);
      }
      if(n.aimMode==='track'&&n.aimPoint){
        line(point,n.aimPoint,c,1.8);
        circle(n.aimPoint.x,n.aimPoint.y,7,c);
        circle(n.aimPoint.x,n.aimPoint.y,3,'#203732');
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e8cba2';
        draw.fillText('PIE · TRACK',point.x+12,point.y-12);
      }else if(n.aimMode==='fixed'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#d5e8de';
        draw.fillText(n.aimLabel==='strafe'?'STRAFE · HOLD':'LOOK',
          point.x+12,point.y-12);
      }
      if(n.kind==='flash'&&n.aimPoint){
        const path=flashTrajectory(state,a,n);
        const landing=selectedNow&&draggingNode?draggingNode:n.aimPoint;
        const points=path?.points??[n.p,landing];
        draw.strokeStyle='#f3c67e';draw.lineWidth=2.5;
        draw.setLineDash([5,5]);draw.beginPath();
        draw.moveTo(points[0].x,points[0].y);
        for(const p of points.slice(1))draw.lineTo(p.x,p.y);
        draw.stroke();draw.setLineDash([]);
        draw.strokeStyle='#f0af55';draw.lineWidth=2;
        draw.beginPath();draw.arc(landing.x,landing.y,26,0,Math.PI*2);draw.stroke();
        circle(landing.x,landing.y,selectedNow?11:9,'#dca053');
        draw.fillStyle='#1d2624';draw.font='bold 12px monospace';
        draw.textAlign='center';draw.fillText('F',landing.x,landing.y+4);
      }
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#b8e7dd';
        draw.fillText('STRAFE',point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot&&n.arc?.length){
        draw.save();
        draw.strokeStyle=c;draw.lineWidth=3.2;
        draw.setLineDash([4,3]);draw.beginPath();
        const first=a.plan[i-1]?.p??a.p;
        draw.moveTo(first.x,first.y);
        for(const step of n.arc)draw.lineTo(step.x,step.y);
        draw.stroke();draw.setLineDash([]);
        line(point,n.pivot,'#d6b18b83',1.1);
        draw.fillStyle='#eacda0';draw.font='bold 10px monospace';
        draw.fillText(n.pieSide==='cw'?'PIE ↷':'PIE ↶',point.x+12,point.y-11);
        draw.restore();
      }
      if(n.kind==='door'||n.kind==='wait'||n.kind==='holdClear'||n.kind==='sync'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e7c797';
        draw.fillText(n.kind==='door'?(n.method??'open').toUpperCase():
          n.kind==='wait'||n.kind==='holdClear'?'◷ WAIT':n.kind.toUpperCase(),
          point.x+11,point.y-9);
      }
    }
  }
  if(trace&&trace.length>=1&&cursor){
    draw.beginPath();draw.moveTo(trace[0].x,trace[0].y);
    [...trace.slice(1),cursor].forEach(p=>draw.lineTo(p.x,p.y));
    draw.strokeStyle='#e4c998';draw.lineWidth=3;draw.stroke();
  }else if(cursor&&state.phase==='planning'){
    const a=uid(selected);
    if(a&&a.health>0&&cursor.x>=0&&cursor.x<W&&cursor.y>=0&&cursor.y<H){
      const start=a.plan.at(-1)?.p??a.p;
      draw.setLineDash([3,7]);line(start,cursor,
        looking?'#d8ad79':'rgba(193,219,213,.30)',1.4);
      draw.setLineDash([]);
    }
  }
}
function renderProjectedPlans(){
  if(!stage)return;
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.clearRect(0,0,cssW,cssH);
  for(const a of team(state)){
    if(a.health<=0)continue;
    const color=colorFor(a.id);
    let previous=a.p;
    for(const n of a.plan){
      const cachedRoute=n.kind==='move'||n.kind==='door'?
        displayRouteCache.get(previous,n.p,state.intel,state.phase==='planning'):null;
      const steps=n.kind==='pie'?n.arc??[]:cachedRoute?.points??[];
      if(steps.length){
        draw.beginPath();
        const start=worldToScreen(previous,4);
        draw.moveTo(start.x,start.y);
        for(const point of steps){
          const projected=worldToScreen(point,4);
          draw.lineTo(projected.x,projected.y);
        }
        draw.strokeStyle=color;
        draw.globalAlpha=a.id===selected?.94:.50;
        draw.lineWidth=n.kind==='pie'?3:2.4;
        const narrowOnly=n.kind==='move'&&!!cachedRoute?.narrowOnly;
        // Narrow routes use a finer dash without another overlay.
        draw.setLineDash(n.kind==='pie'?[3,3]:
          narrowOnly?[2,4]:[7,4]);
        draw.stroke();draw.setLineDash([]);draw.globalAlpha=1;
      }
      const selectedNow=a.id===selected&&selectedNode===n.id;
      const point=worldToScreen(selectedNow&&draggingNode&&n.kind!=='flash'?
        draggingNode:n.p,8);
      const invalidDrag=selectedNow&&draggingNode&&
        !intelPassable(draggingNode,state.intel,5.4);
      circle(point.x,point.y,selectedNow?11:7,
        invalidDrag?'#df8070':selectedNow?'#ecd29f':color);
      circle(point.x,point.y,3,'#233b39');
      draw.fillStyle='#142829';draw.font='bold 11px monospace';
      draw.textAlign='center';draw.fillText(String(a.plan.indexOf(n)+1),
        point.x,point.y+3);
      if(n.facing!==undefined){
        const aim=worldToScreen({x:n.p.x+Math.cos(n.facing)*38,
          y:n.p.y+Math.sin(n.facing)*38},8);
        line(point,aim,color,2);
        circle(aim.x,aim.y,3,color);
      }
      if(n.aimMode==='track'&&n.aimPoint){
        const target=worldToScreen(n.aimPoint,12);
        line(point,target,color,1.8);
        circle(target.x,target.y,8,color);
        circle(target.x,target.y,3,'#264039');
        draw.fillStyle='#f1d7a4';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText('PIE · TRACK',point.x+12,point.y-13);
      }else if(n.aimMode==='fixed'){
        draw.fillStyle='#d2eee4';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText(n.aimLabel==='strafe'?'STRAFE · HOLD':'LOOK',
          point.x+12,point.y-13);
      }
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.fillStyle='#e0f7e9';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText('STRAFE',point.x+13,point.y-12);
      }
      if(n.kind==='flash'&&n.aimPoint){
        const path=flashTrajectory(state,a,n);
        const landing=selectedNow&&draggingNode?draggingNode:n.aimPoint;
        const points=path?.points??[n.p,landing];
        draw.strokeStyle='#f0bd77';draw.lineWidth=2.2;
        draw.setLineDash([4,5]);draw.beginPath();
        const start=worldToScreen(points[0],7);draw.moveTo(start.x,start.y);
        for(const q of points.slice(1)){
          const project=worldToScreen(q,7);draw.lineTo(project.x,project.y);
        }
        draw.stroke();draw.setLineDash([]);
        const screen=worldToScreen(landing,7);
        draw.strokeStyle='#f1c17e';draw.beginPath();
        draw.arc(screen.x,screen.y,16,0,Math.PI*2);draw.stroke();
        circle(screen.x,screen.y,selectedNow?11:9,'#c88d4e');
        draw.fillStyle='#182b2c';draw.textAlign='center';
        draw.font='bold 11px monospace';draw.fillText('F',screen.x,screen.y+3);
      }
      if(n.kind==='door'){
        draw.fillStyle='#e2ca9f';draw.textAlign='left';
        draw.font='bold 10px monospace';
        const door=state.doors.find(d=>d.id===n.doorId);
        draw.fillText((n.method??'open').toUpperCase()+
          ((n.method??'open')==='open'?(door?.swing===1?' ↷':' ↶'):''),
          point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot){
        const pivot=worldToScreen(n.pivot,12);
        circle(pivot.x,pivot.y,7,'#e2b476');
        circle(pivot.x,pivot.y,3,'#24322f');
        line(point,pivot,'#e3b37c8a',1.5);
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e3bb87';
        draw.fillText('PIVOT '+Math.round(n.pieDegrees??54)+'°',
          pivot.x+10,pivot.y-12);
      }
      if(n.kind==='pie'&&n.arc?.length&&a.id===selected){
        const finish=worldToScreen(n.arc.at(-1)!,8);
        draw.strokeStyle='#f0d3a4';draw.lineWidth=1.8;
        draw.strokeRect(finish.x-8,finish.y-8,16,16);
      }
      if(n.kind==='wait'||n.kind==='holdClear'){
        draw.fillStyle='#e5c58e';draw.font='bold 12px monospace';
        draw.fillText('◷ WAIT',point.x+12,point.y-14);
      }
      if(n.postureState||n.paceState){
        draw.font='bold 10px monospace';draw.fillStyle='#a2d7c9';
        draw.fillText([n.postureState?.toUpperCase(),
          n.paceState?.toUpperCase()].filter(Boolean).join(' · '),
          point.x+12,point.y+18);
      }
      if(n.kind==='move'||n.kind==='door'||n.kind==='pie')previous=n.p;
    }
    const pawn=worldToScreen(a.p,32),ground=worldToScreen(a.p,1);
    const squadIndex=team(state).findIndex(member=>member.id===a.id);
    const labelSpread=state.site?[
      {x:-27,y:-17},{x:27,y:-17},
      {x:-27,y:-36},{x:27,y:-36},
    ][squadIndex]??{x:0,y:-9}:{x:0,y:-9};
    draw.textAlign='center';draw.font='bold 11px monospace';
    draw.fillStyle=color;
    if(a.id===selected||a.injuryStage>0||replayFollow&&
      replayFollowId===a.id)
      draw.fillText(a.name,pawn.x+labelSpread.x,pawn.y+labelSpread.y);
    if(a.id===selected){
      draw.strokeStyle='#e9d6b1';draw.lineWidth=2.1;
      draw.beginPath();draw.arc(ground.x,ground.y,14,0,Math.PI*2);draw.stroke();
    }
    if(a.suppression>.53){
      draw.font='bold 9px monospace';draw.fillStyle='#e5bc92';
      draw.fillText('SUPPRESSED',pawn.x,pawn.y-23);
    }
  }
  // Screen-space icons stay readable regardless of ortho pitch or zoom.
  for(const hostile of enemies(state)){
    if(!liveVisibility(state,hostile.p))continue;
    const ground=worldToScreen(hostile.p,1);
    if(hostile.health<=0){
      // The actual grounded body and restrained blood mark communicate DOWN.
      draw.fillStyle='rgba(125,48,43,.52)';draw.beginPath();
      draw.ellipse(ground.x,ground.y,11,6,0,0,Math.PI*2);draw.fill();
    }else{
      draw.strokeStyle='#e2a18b';draw.lineWidth=1.6;
      draw.beginPath();draw.arc(ground.x,ground.y,12,0,Math.PI*2);draw.stroke();
    }
  }
  for(const member of team(state)){
    const pawn=worldToScreen(member.p,33);
    if(member.health<=0){
      draw.fillStyle='rgba(129,54,48,.35)';draw.beginPath();
      draw.ellipse(pawn.x,pawn.y+11,9,4,0,0,2*Math.PI);draw.fill();
    }else if(member.health===1){
      draw.fillStyle='#e6a485';draw.fillRect(pawn.x-10,pawn.y+1,20,3);
    }
  }
  // Door shapes communicate door identity. Only show a selector when the
  // selected operator or its planned endpoint can actually interact.
  const active=uid(selected);
  for(const door of state.doors){
    const visibility=doorVisibility(state,door);
    if(!visibility.known||!active||active.health<=0)continue;
    const node=selectedPlanNode();
    const physicallyReachable=team(state).some(actor=>
      actor.health>0&&doorReachable(actor.p,door));
    const plannedReachable=!!node&&doorReachable(node.p,door);
    if(!physicallyReachable&&!plannedReachable)continue;
    const p=worldToScreen(doorCenter(door),12);
    const chosen=doorFocusId===door.id;
    draw.save();
    draw.strokeStyle=chosen?'#ffe08b':
      physicallyReachable?'#f5e8cd96':'#c3d5c06c';
    draw.lineWidth=chosen?2.4:1.2;
    if(!physicallyReachable)draw.setLineDash([2,3]);
    draw.beginPath();draw.arc(p.x,p.y,chosen?10:6,0,Math.PI*2);draw.stroke();
    draw.restore();
  }
  // Physical muzzle flashes, tracers and impacts are rendered exclusively
  // by Three.js in 3D modes so depth testing never draws them over actors.
  // Unknown enemies stay unrendered; only grounded last-known reports show.
  for(const hostile of enemies(state)){
    if(isSeen(state,hostile)||hostile.health<=0)continue;
    const memory=lastKnown(state,hostile.id);
    if(!memory||state.seconds-memory.at>25)continue;
    const where=worldToScreen(memory.p,12);
    draw.font='bold 17px monospace';draw.textAlign='center';
    draw.fillStyle='#e6bb9d';
    draw.fillText(memory.status==='heard'?'~':'?',where.x,where.y);
  }
  if(trace&&trace.length>1){
    draw.beginPath();
    const first=worldToScreen(trace[0],8);
    draw.moveTo(first.x,first.y);
    for(const point of trace.slice(1)){
      const screen=worldToScreen(point,8);
      draw.lineTo(screen.x,screen.y);
    }
    draw.strokeStyle='#f0cd96';draw.lineWidth=3;draw.stroke();
  }
  if(state.mission!=='clear'&&state.mission!=='done'){
    const target=worldToScreen(state.mission==='secure'?
      state.scenario.objective:state.scenario.extract,9);
    draw.strokeStyle='#e8d5a6';draw.lineWidth=2;
    draw.beginPath();draw.arc(target.x,target.y,17,0,2*Math.PI);draw.stroke();
    draw.fillStyle='#e8d5a6';draw.font='bold 10px monospace';
    draw.fillText(state.mission.toUpperCase(),target.x,target.y-23);
  }
}
function fog(){
  if(replaying&&replayOmniscient)return;
  if(fogStamp<0||state.seconds<fogStamp||
    state.seconds-fogStamp>.055){
    fogStamp=state.seconds;
    paintFogMask(fogContext!,state);
  }
  draw.drawImage(fogCanvas,0,0,W,H);
}
function missionMarkers(){
  if(state.rescue&&liveVisibility(state,state.rescue.p)){
    const p=state.rescue.p;
    draw.strokeStyle='#eed9ad';draw.lineWidth=2.2;
    draw.beginPath();draw.arc(p.x,p.y,13,0,Math.PI*2);draw.stroke();
    draw.fillStyle='#ebdfc0';draw.textAlign='center';
    draw.font='bold 10px monospace';draw.fillText('CIV',p.x,p.y-18);
  }
  const p=state.mission==='extract'?state.scenario.extract:state.scenario.objective;
  if(state.mission==='clear'||state.mission==='done'||
    !liveVisibility(state,p))return;
  draw.strokeStyle='#d8cc98';draw.lineWidth=2;
  draw.beginPath();draw.arc(p.x,p.y,33,0,Math.PI*2);draw.stroke();
  draw.fillStyle='#e1d1a2';draw.font='bold 12px monospace';
  draw.textAlign='center';
  draw.fillText(state.mission==='secure'?'SECURE':'EXTRACT',p.x,p.y-39);
}
function sprite(a:TeamActor){
  if(a.side==='red'&&!(replaying&&replayOmniscient)){
    const visible=a.health>0?isSeen(state,a):liveVisibility(state,a.p);
    if(!visible){
      const memory=lastKnown(state,a.id);
      if(memory&&a.health>0&&state.seconds-memory.at<25){
        draw.fillStyle=memory.status==='heard'?'#e6bb828e':'#d19d837e';
        draw.font='bold 16px monospace';draw.textAlign='center';
        draw.fillText(memory.status==='heard'?'~':'?',memory.p.x,memory.p.y);
        if(memory.status==='heard'){
          draw.strokeStyle='#c9af7c4b';draw.lineWidth=1;
          draw.beginPath();draw.arc(memory.p.x,memory.p.y,30,0,Math.PI*2);draw.stroke();
        }
      }
      return;
    }
  }
  const friendly=a.side==='blue',c=friendly?colorFor(a.id):'#d3917b';
  if(a.health<=0){
    draw.save();draw.translate(a.p.x,a.p.y);
    draw.rotate(a.heading);
    rect(-13,-4,29,8,'#574d49');rect(-3,-9,5,18,'#a46556');
    draw.restore();
    draw.fillStyle='#7e363092';draw.beginPath();
    draw.ellipse(a.p.x,a.p.y,13,6,a.heading,0,2*Math.PI);draw.fill();
    return;
  }
  if(friendly&&(a.id===selected)){
    draw.strokeStyle='#e8d6b1';draw.lineWidth=1.6;
    draw.beginPath();draw.arc(a.p.x,a.p.y,16,0,2*Math.PI);draw.stroke();
    conical(a);
  }
  const impactAge=state.seconds-a.lastHitAt;
  const flinch=impactAge>=0&&impactAge<.28?1-impactAge/.28:0;
  const firing=state.shots.some(shot=>shot.shooterId===a.id&&
    shot.age<.11&&shotVisibility(state,shot).flash);
  draw.save();
  draw.translate(a.p.x-flinch*2.3,a.p.y+flinch*1.7);
  draw.rotate(a.heading+flinch*.14+
    (a.injuryStage===2?.14:a.injuryStage===1?.04:0));
  circle(0,2,11,'#0d1b20af');circle(0,0,9.2,friendly?'#4b756f':'#794a43');
  // Body and alternating leg extension are driven by actual travel.
  const gait=Math.sin(state.seconds*15+Math.floor(a.p.x*.15))*
    Math.min(1,a.velocity/70)*(a.injuryStage===2?2.1:3.5);
  rect(-9,-7+gait,9,5,friendly?'#304842':'#4b3633');
  rect(-9,2-gait,9,5,friendly?'#304842':'#4b3633');
  rect(-7,-5,14,10,c);
  rect(-10,-4,5,8,friendly?'#45625d':'#563e39');
  circle(4,0,3.8,friendly?'#d3dac1':'#d0a58a');
  rect(firing?2:5,-2,
    a.weapon==='smg'?13:a.weapon==='rifle'?23:a.weapon==='shotgun'?20:18,
    a.weapon==='shotgun'?5:4,'#1a2527');
  rect(firing?17:20,-1,6,2,'#a2a9a1');
  draw.restore();
  if(friendly){
    draw.textAlign='center';draw.font='bold 10px monospace';
    draw.fillStyle=c;draw.fillText(a.name,a.p.x,a.p.y-21);
    if(a.suppression>.53){
      draw.fillStyle='#eac69d';draw.font='bold 9px monospace';
      draw.fillText('SUPP',a.p.x,a.p.y-32);
    }
    if(a.health===1){draw.fillStyle='#e7a886';
      draw.fillRect(a.p.x-8,a.p.y+13,16,2);}
  }else{
    draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
    draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
  }
}
function contacts(){
  if(replaying&&replayAnalysis)for(const a of enemies(state)){
    if(a.health<=0)continue;
    const start=viewMode==='plan2d'?a.p:worldToScreen(a.p,22);
    const focus=a.contact??a.watch;
    if(focus){
      const end=viewMode==='plan2d'?focus:worldToScreen(focus,22);
      draw.save();draw.strokeStyle='#e4ae78';draw.lineWidth=1.7;
      draw.setLineDash([5,4]);draw.beginPath();
      draw.moveTo(start.x,start.y);draw.lineTo(end.x,end.y);
      draw.stroke();draw.setLineDash([]);draw.restore();
    }
    if(a.defense){
      const p=viewMode==='plan2d'?a.defense:worldToScreen(a.defense,5);
      draw.strokeStyle='#d6b986';draw.lineWidth=2;
      draw.strokeRect(p.x-8,p.y-8,16,16);
    }
  }
  for(const m of state.dropped){
    rect(m.p.x-3,m.p.y-1,6,2,'#202e2d');
  }
  for(const g of state.grenades){
    circle(g.p.x,g.p.y,3,'#a7b4a0');
  }
  for(const b of state.flashBursts){
    draw.globalAlpha=Math.max(0,1-b.age/.7)*.85;
    circle(b.p.x,b.p.y,13+48*b.age,'#f6edcc');
    draw.globalAlpha=1;
  }
  for(const shot of state.shots){
    const visibility=replaying&&replayOmniscient?
      {trace:true,flash:true,impact:true}:shotVisibility(state,shot);
    const fade=contactFade(shot.age,.40);
    draw.globalAlpha=fade;
    if(visibility.trace&&shot.age<.23)
      line(shot.start,shot.end,
        shot.side==='blue'?'#f6db9d':'#f2a087',2.3);
    if(visibility.flash&&shot.age<.12)
      circle(shot.start.x,shot.start.y,4+fade*4,'#f4dbb0');
    if(visibility.impact){
      const color=shot.surface==='blood'?'#b46859':
        shot.surface==='metal'?'#f1cf91':
        shot.surface==='wood'?'#e9ba7e':'#dfc8a4';
      circle(shot.end.x,shot.end.y,shot.hit?5:3.7,color);
      if(shot.hit){
        draw.fillStyle='#efb19c';draw.font='bold 11px monospace';
        draw.textAlign='center';
        // Physical impacts carry the outcome without a floating DOWN label.
      }
    }
    draw.globalAlpha=1;
  }
}
function endMessage(){
  if(!replaying&&(state.phase==='won'||state.phase==='lost')){
    // The HTML debrief owns the readable text and restart buttons.
    draw.fillStyle='#101c1f88';draw.fillRect(0,0,W,H);
  }
}
// Blood and bullet decals are part of the floor, not HUD sprites.
// Render beneath architecture AND fog so marks cannot float over walls
// or leak into an unrevealed room.
function renderGroundMarks(){
  for(const mark of state.impactMarks){
    if(!(replaying&&replayOmniscient)&&!liveVisibility(state,mark.p))continue;
    draw.globalAlpha=Math.max(.18,.78-mark.age*.023);
    circle(mark.p.x,mark.p.y,mark.surface==='blood'?4:2.5,
      mark.surface==='blood'?'#914a44':
      mark.surface==='wood'?'#42332a':
      mark.surface==='stone'?'#363936':
      mark.surface==='metal'?'#262e30':'#4e4b40');
    draw.globalAlpha=1;
  }
 }
function render(){
  if(stage&&viewMode!=='plan2d'){
    renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  terrain();furniture();renderGroundMarks();architecture();fog();missionMarkers();
  paths();
  for(const a of state.operators)sprite(a);
  contacts();endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning'||replaying)return;
  if(firePlacement){
    const mode=firePlacement;
    const nodeId=selectedNode??undefined;
    if(mode==='focus'){
      const target=enemies(state).find(e=>e.health>0&&isSeen(state,e)&&
        distance(e.p,pt)<25);
      if(!target||!setFirePolicy(state,selected,'focus',
        nodeId,undefined,target.id)){
        state.events.push('FOCUS REQUIRES A VISIBLE ENEMY');
      }
    }else if(!setFirePolicy(state,selected,'suppress',nodeId,pt))
      state.events.push('INVALID SUPPRESSION POINT');
    firePlacement=null;updateHud();return;
  }
  if(flashMode){
    const id=state.nextId;
    if(!(flashDoorId?
      planDoorFlash(state,selected,flashDoorId,pt):
      planFlash(state,selected,pt)))
      state.events.push('FLASH TARGET BLOCKED / OUT OF RANGE');
    else selectedNode=flashDoorId?state.nextId-1:id;
    flashMode=false;flashDoorId=null;updateHud();return;
  }
  if(looking){
    const mode=lookMode==='pie'?'track':lookMode==='strafe'?'fixed':'free';
    if(!planAim(state,selected,mode,pt,selectedNode??undefined,
      lookMode,armedOrigin))
      state.events.push('SELECT A DIFFERENT AIM POINT');
    looking=false;updateHud();return;
  }
  const beforeRoute=uid(selected)?finalPoint(uid(selected)!):pt;
  lastAuthoringAt=performance.now();
  if(!planMove(state,selected,pt))
    state.events.push(!intelPassable(pt,state.intel)?
      'DESTINATION BLOCKED · CHOOSE NEARBY FLOOR':
      'NO WALKABLE ROUTE · CHECK DOOR OR PATH');
  else{
    selectedNode=uid(selected)?.plan.at(-1)?.id??null;
    tacticalFeedback.emit('route',pt,undefined,beforeRoute);
  }
  updateHud();
}
function isMissionTerminal(s:Session){return s.phase==='won'||s.phase==='lost';}
function clockText(t:number){
  const seconds=Math.floor(Math.max(0,t));
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
}
function applyReplayFrameAt(t:number){
  const frame=recorder.sample(t);
  if(!frame)return;
  replayPresentation=frame.presentation??null;
  applyReplayFrame(state,frame);
  // Scrubbed time can move backwards: invalidate cached fog/effect time.
  fogStamp=-1;
}
function seekReplay(t:number){
  replayTime=Math.max(0,Math.min(recorder.duration,t));
  applyReplayFrameAt(replayTime);updateReplayHud();
}
function updateReplayHud(){
  ui.replaySeek.value=String(recorder.duration?
    Math.round(1000*replayTime/recorder.duration):0);
  ui.replayClock.textContent=clockText(replayTime)+' / '+
    clockText(recorder.duration);
  const playbackIcon=replayPlaying?'pause':'go';
  if(ui.replayPlay.dataset.mode!==playbackIcon){
    ui.replayPlay.dataset.mode=playbackIcon;
    ui.replayPlay.replaceChildren(tacticalIcon(playbackIcon));
    ui.replayPlay.setAttribute('aria-label',replayPlaying?'Pause replay':'Play replay');
    ui.replayPlay.title=replayPlaying?'Pause replay':'Play replay';
  }
  ui.replaySpeed.textContent=replayRate+'×';
  ui.replaySight.textContent=replayOmniscient?'FULL VIEW':'TEAM SIGHT';
  ui.replayView.textContent=viewMode.toUpperCase();
  ui.replayFollow.textContent=replayFollow?'FOLLOW '+replayFollowId.toUpperCase():'FOLLOW';
  ui.replayAnalysis.textContent=replayAnalysis?'ANALYSIS ON':'ANALYSIS';
  const event=recorder.events.filter(e=>e.t<=replayTime+.14).at(-1);
  ui.replayEventText.textContent=event&&replayTime-event.t<4.5?
    clockText(event.t)+' · '+event.text:'';
}
function renderReplayEventMarkers(){
  ui.replayMarks.replaceChildren();
  const duration=recorder.duration;
  if(duration<=0)return;
  const friendlyIds=new Set(team(state).map(a=>a.id));
  let lastShot=-Infinity,count=0;
  for(const event of recorder.events){
    if(count>=85)break;
    if(event.kind==='shot'){
      if(event.t-lastShot<3)continue;
      lastShot=event.t;
    }
    const frame=recorder.at(event.t);
    const knownPoint=!!event.p&&!!frame&&(
      frame.seenGround.includes(Math.floor(event.p.x/40)+','+
        Math.floor(event.p.y/40))||
      frame.seenGround.includes('fine:'+Math.floor(event.p.x/20)+','+
        Math.floor(event.p.y/20)));
    if(!replayOmniscient&&!friendlyIds.has(event.actor??'')&&!knownPoint)
      continue;
    const marker=document.createElement('button');
    marker.type='button';
    marker.className='replay-mark replay-mark-'+event.kind;
    marker.style.left=(event.t/duration*100).toFixed(3)+'%';
    marker.title=clockText(event.t)+' · '+event.text;
    marker.setAttribute('aria-label',marker.title);
    marker.addEventListener('click',()=>{
      replayPlaying=false;seekReplay(event.t);
    });
    ui.replayMarks.append(marker);count++;
  }
}
function enterReplay(){
  if(replaying||recorder.frames.length<2)return;
  finishedSession=state;replaying=true;replayPlaying=true;replayTime=0;
  replayRate=1;replayOmniscient=false;looking=false;flashMode=false;
  replayFollow=false;replayAnalysis=false;replayFollowId='rook';
  ui.replayExtra.hidden=true;ui.replayMore.setAttribute('aria-expanded','false');
  state=newSession(finishedSession.variant,finishedSession.site?.seed,
    finishedSession.intel.mode,finishedSession.site?.scale??'standard');
  applyRosterIdentity(state,persistentRoster);
  stage?.applySite(state.site??null);
  document.body.classList.add('replaying');
  ui.replayPanel.hidden=false;
  renderReplayEventMarkers();seekReplay(0);updateHud();
}
function exitReplay(){
  if(!replaying)return;
  replaying=false;replayPlaying=false;replayPresentation=null;
  document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  if(finishedSession)state=finishedSession;
  finishedSession=null;fogStamp=-1;
  stage?.applySite(state.site??null);
  updateHud();
}
ui.watchReplay.addEventListener('click',enterReplay);
ui.replayPlay.addEventListener('click',()=>{
  if(replayTime>=recorder.duration)seekReplay(0);
  replayPlaying=!replayPlaying;updateReplayHud();
});
ui.replayBack.addEventListener('click',()=>seekReplay(replayTime-10));
ui.replayForward.addEventListener('click',()=>seekReplay(replayTime+10));
ui.replayMore.addEventListener('click',()=>{
  ui.replayExtra.hidden=!ui.replayExtra.hidden;
  ui.replayMore.setAttribute('aria-expanded',String(!ui.replayExtra.hidden));
});
ui.replaySpeed.addEventListener('click',()=>{
  replayRate=({0.5:1,1:2,2:4,4:0.5} as Record<number,number>)[replayRate]??1;
  updateReplayHud();
});
ui.replaySeek.addEventListener('input',()=>{
  replayPlaying=false;
  seekReplay(Number(ui.replaySeek.value)/1000*recorder.duration);
});
ui.replaySight.addEventListener('click',()=>{
  replayOmniscient=!replayOmniscient;fogStamp=-1;
  renderReplayEventMarkers();updateReplayHud();
});
ui.replayView.addEventListener('click',()=>{
  cameraMode(viewMode==='iso'?'top':viewMode==='top'?'plan2d':'iso');
  updateReplayHud();
});
const jumpReplayEvent=(forward:boolean)=>{
  const events=recorder.events.filter(e=>e.kind!=='shot');
  const item=forward?events.find(e=>e.t>replayTime+.15):
    events.slice().reverse().find(e=>e.t<replayTime-.15);
  if(item){replayPlaying=false;seekReplay(item.t);}
};
ui.replayPrevEvent.addEventListener('click',()=>jumpReplayEvent(false));
ui.replayNextEvent.addEventListener('click',()=>jumpReplayEvent(true));
ui.replayFollow.addEventListener('click',()=>{
  if(replayFollow){
    const i=squadIds.indexOf(replayFollowId as typeof squadIds[number]);
    if(i===squadIds.length-1)replayFollow=false;
    else replayFollowId=squadIds[i+1];
  }else replayFollow=true;
  updateReplayHud();
});
ui.replayAnalysis.addEventListener('click',()=>{
  replayAnalysis=!replayAnalysis;updateReplayHud();
});
ui.replayExit.addEventListener('click',exitReplay);
function reset(next=state.variant,siteSeed?:number,missionOverride?:Session['missionType']){
  replaying=false;replayPlaying=false;finishedSession=null;
  operationsBoard.hidden=true;
  flashMode=false;document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  state=newSession(next,legacyStudy?undefined:
    siteSeed??randomSiteSeed(),selectedIntelMode,requestedSiteScale,missionOverride);
  applyRosterIdentity(state,persistentRoster);
  applyCampaignSkills();
  flashDoorId=null;
  stage?.applySite(state.site??null);selected='rook';looking=false;
  selectedNode=null;doorFocusId=null;draggingNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotId=0;lastEventAudio='';
  lastFootstepSoundTime=0;
  recorder=new MissionRecorder();recorder.capture(state,true);
  tacticalFeedback.clear();layout();updateHud();
}
const campaignScreen=new CampaignScreen({
 newCampaign:()=>{
  if(campaign&&!window.confirm('Replace the current campaign with a new one?'))return;
  campaign=migrateLegacyRoster(newCampaign(randomSiteSeed()),persistentRoster);
  saveCampaign();showCampaignHome();
 },
 continueCampaign:()=>showCampaignHome(),
 quickPlay:()=>{campaignMode='quick';campaignScreen.hide();reset();},
 chooseContract:(id)=>{
  if(!campaign)return;
  const next=acceptContract(campaign,id);
  if(next===campaign)return;
  campaign=next;saveCampaign();deployCampaignContract();
 },
 resumeContract:()=>deployCampaignContract()
});
function showCampaignHome(){
 if(!campaign)return;
 campaignMode='home';campaignScreen.home(campaign);
}
function deployCampaignContract(){
 if(!campaign?.activeContractId)return;
 const job=campaign.contracts.find(k=>k.id===campaign!.activeContractId);
 if(!job)return;
 campaignMode='mission';
 selectedIntelMode=job.intel==='unknown'?'true-blind':
  job.intel==='scouted'?'exterior-known':'floor-plan';
 requestedSiteScale=job.scale;
 ui.siteSize.textContent='MAP SIZE · '+requestedSiteScale.toUpperCase();
 reset(0,job.seed,job.kind);
 campaignScreen.hide();
}
function returnAfterCampaignMission(){
 if(campaignMode==='mission'&&(state.phase==='won'||state.phase==='lost')){
  showCampaignHome();return true;
 }
 return false;
}
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.back.addEventListener('click',()=>{
  uiClickTone('select');
  // Build 076 accidentally removed this listener when slimming the HUD.
  if(backOne(state,selected)){
    selectedNode=null;doorFocusId=null;
  }
  updateHud();
});
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.ash.addEventListener('click',()=>selectUnit('ash'));
ui.vale.addEventListener('click',()=>selectUnit('vale'));
ui.clear.addEventListener('click',()=>{clearPlan(state,selected);selectedNode=null;updateHud();});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;updateHud();});
ui.wait.addEventListener('click',()=>{planWait(state,selected,.5);updateHud();});
ui.loadout.addEventListener('click',()=>{
  cycleWeapon(state,selected);updateHud();
});
ui.reload.addEventListener('click',()=>{
  if(state.phase==='planning')planReload(state,selected);
  else if(state.phase==='running')reloadNow(state,selected);
  updateHud();
});
ui.cancelTarget.addEventListener('click',cancelTargeting);
ui.flash.addEventListener('click',()=>{
  if(state.phase!=='planning')return;
  flashMode=!flashMode;flashDoorId=null;
  looking=false;ui.orders.classList.add('compact');
  updateHud();
});
ui.sync.addEventListener('click',()=>{planSync(state);updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);fogStamp=-1;updateHud();
});
ui.contact.addEventListener('click',()=>{toggleContactRule(state,selected);updateHud();});
ui.siteSize.textContent='MAP SIZE · '+requestedSiteScale.toUpperCase();
ui.siteSize.addEventListener('click',()=>{
  if(replaying)return;
  requestedSiteScale=requestedSiteScale==='standard'?'expanded':'standard';
  ui.siteSize.textContent='MAP SIZE · '+requestedSiteScale.toUpperCase();
  const url=new URL(location.href);
  if(requestedSiteScale==='standard')url.searchParams.delete('scale');
  else url.searchParams.set('scale',requestedSiteScale);
  history.replaceState(null,'',url.href);
  reset(state.variant,state.site?.seed);
});
ui.variant.addEventListener('click',()=>reset(state.variant+1));
ui.intelMode.addEventListener('click',()=>{
  if(replaying)return;
  const index=INTEL_MODES.indexOf(selectedIntelMode);
  selectedIntelMode=INTEL_MODES[(index+1)%INTEL_MODES.length];
  // Restart this exact building without preserving discoveries.
  reset(state.variant,state.site?.seed);
});
ui.retry.addEventListener('click',()=>{if(campaignMode!=='mission')reset();});
ui.next.addEventListener('click',()=>{if(!returnAfterCampaignMission())reset(state.variant+1);});
ui.play.addEventListener('click',()=>{
  unlockAudio();uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!returnAfterCampaignMission())reset();
  }else{looking=false;toggling(state);updateHud();}
});
ui.restart.addEventListener('click',()=>reset());
window.addEventListener('keydown',e=>{
  if(replaying){
    if(e.code==='Space'&&!e.repeat){e.preventDefault();replayPlaying=!replayPlaying;}
    if(e.code==='Escape')exitReplay();
    if(e.code==='ArrowLeft')seekReplay(replayTime-5);
    if(e.code==='ArrowRight')seekReplay(replayTime+5);
    return;
  }
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();unlockAudio();
    if(state.phase==='won'||state.phase==='lost')reset();
    else toggling(state);updateHud();
  }
  if(e.code==='Digit1')selectUnit('rook');
  if(e.code==='Digit2')selectUnit('moss');
  if(e.code==='Digit3')selectUnit('ash');
  if(e.code==='Digit4')selectUnit('vale');
  if(e.code==='KeyX'){clearPlan(state,selected);updateHud();}
  if(e.code==='KeyL')armFacing('look');
  if(e.code==='Backspace'&&!e.repeat){
    e.preventDefault();ui.back.click();
  }
  if(e.code==='Escape'){cancelTargeting();return;}
  if(e.code==='KeyF'&&!e.repeat)armFacing('strafe');
  if(e.code==='KeyB'&&!e.repeat)armFacing('pie');
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat)reset();
  if(e.code==='KeyV'&&!e.repeat)cameraMode(viewMode==='iso'?'top':'iso');
  if(e.code==='KeyQ'&&!e.repeat)turnCamera(-Math.PI/8);
  if(e.code==='KeyE'&&!e.repeat)turnCamera(Math.PI/8);
  if(e.code==='Digit0'&&!e.repeat)ui.cameraFit.click();
});
function pointerWorld(e:PointerEvent){return toWorld(e.clientX,e.clientY);}
const hitNode=(p:Pt):{id:number;index:number;owner:string}|null=>{
  const cursor=worldToScreen(p,7);
  const candidates:{id:number;index:number;owner:string;gap:number}[]=[];
  for(const unit of team(state))if(unit.health>0){
    for(let i=unit.plan.length-1;i>=0;i--){
      const n=unit.plan[i];
      for(const point of [n.p,...(n.kind==='flash'&&n.aimPoint?[n.aimPoint]:[])]){
        const marker=worldToScreen(point,point===n.p?8:6);
        const gap=distance(marker,cursor);
        if(gap<27)candidates.push({id:n.id,index:i,owner:unit.id,gap});
      }
    }
  }
  candidates.sort((a,b)=>a.gap-b.gap||
    Number(b.owner===selected)-Number(a.owner===selected));
  return candidates[0]??null;
};
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  // Explicit camera interaction does NOT select units or place orders.
  // Touch defaults to direct orbit on empty ground after a drag threshold.
  // Desktop retains RMB orbit, MMB/Shift pan; plain clicks still plan.
  const cameraModeInput=e.button===1||e.shiftKey||
    (viewMode!=='plan2d'&&e.button===2);
  if(cameraModeInput){
    const orbit=viewMode!=='plan2d'&&e.button===2;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:false,nodeId:null,
      mode:orbit?'cameraOrbit':'cameraPan',moved:false});
  }else{
    const contextual=looking||flashMode||!!firePlacement;
    // A selected route can pass near a teammate. Its line remains tappable
    // unless the finger is directly over the teammate's physical icon.
    // Previously the oversized soldier hitbox stole mid-route insert taps.
    const selectedActor=uid(selected);
    const overSelectedLine=!contextual&&state.phase==='planning'&&
      !!selectedActor&&!!routeLineHit(selectedActor.p,selectedActor.plan,
        {x:e.clientX,y:e.clientY},p=>worldToScreen(p,4),14);
    const hit=contextual?undefined:team(state).find(a=>{
      if(a.health<=0)return false;
      const direct=overSelectedLine&&a.id!==selected;
      if(viewMode==='plan2d'||!stage)
        return distance(a.p,pt)<(direct?12:22);
      return distance(worldToScreen(a.p,24),
        {x:e.clientX,y:e.clientY})<(direct?15:25);
    });
    // Tapping the operator always selects HERE, even if a waypoint
    // happens to overlap its icon.
    const node=state.phase==='planning'&&!contextual&&!hit?hitNode(pt):null;
    if(node){
      lastAuthoringAt=performance.now();
      if(node.owner!==selected)selectUnit(node.owner);
      selectedNode=node.id;doorFocusId=null;
    }else if(hit)selectUnit(hit.id);
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:!!hit&&!node,
      nodeId:node?.id??null,
      mode:node?'node':'undecided',moved:false});
  }
  if(activePointers.size>=2){
    // Cancel any tentative route gesture when a second finger arrives.
    // The remaining finger is never retroactively treated as a map tap.
    for(const pointer of activePointers.values())pointer.mode='cameraMulti';
    const pts=[...activePointers.values()];
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    trace=null;draggingNode=null;
  }
});
canvas.addEventListener('pointermove',e=>{
  const p=activePointers.get(e.pointerId);
  cursor=pointerWorld(e);
  if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>9)p.moved=true;
  if(activePointers.size===2){
    const pts=[...activePointers.values()];
    const gap=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    if(stage&&viewMode!=='plan2d'){
      if(panMid)stage.panBetween(panMid.x,panMid.y,mid.x,mid.y);
      if(pinchDistance>8)stage.zoomAt(gap/pinchDistance,mid.x,mid.y);
      // Two fingers have ONLY pan/pinch behavior: never rotate accidentally.
    }else{
      if(panMid){panX+=mid.x-panMid.x;panY+=mid.y-panMid.y;}
      if(pinchDistance>8)zoom=clamp(zoom*gap/pinchDistance,.65,4.8);
      layout();
    }
    pinchDistance=gap;panMid=mid;return;
  }
  if(p.mode==='cameraOrbit'&&stage&&viewMode!=='plan2d'){
    stage.orbit(dx,dy);
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage.view.mode));
    return;
  }
  if(p.mode==='cameraPan'){
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
    return;
  }
  if(p.mode==='cameraMulti')return;
  // On touch a drag starting in empty space or the map ground orbits.
  // Tapping that same spot still creates a waypoint; dragging from a
  // selected operator or node keeps its deliberate tactical editing semantics.
  if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
     viewMode!=='plan2d'&&stage){
    p.mode='cameraOrbit';
    stage.orbit(dx,dy);
    return;
  }
  if(p.mode==='node'&&p.moved&&p.nodeId!==null){
    draggingNode=cursor;return;
  }
  if(state.phase==='planning'&&p.wasUnit&&p.moved){
    p.mode='route';
    if(!trace)trace=[{...uid(selected)!.p}];
    if(distance(trace.at(-1)!,cursor)>8)trace.push({...cursor});
  }else if(p.moved&&e.pointerType==='mouse'&&(e.buttons&4)){
    panX+=dx;panY+=dy;layout();
  }
});
/** Insert precisely where the player tapped the existing routed line.
 * The original plan before and after the inserted node stays intact. */
function insertAtRouteLine(screen:Pt):boolean{
  const actor=uid(selected);
  if(!actor||state.phase!=='planning')return false;
  const hit=routeLineHit(actor.p,actor.plan,screen,
    point=>worldToScreen(point,4),14);
  if(!hit){canvas.dataset.lastRouteTap='miss:'+actor.plan.length+'/'+selected;return false;}
  canvas.dataset.lastRouteTap='route:'+hit.index;
  const id=state.nextId;
  if(!insertPlanNode(state,selected,hit.index,hit.point)){
    canvas.dataset.lastRouteTap='blocked:'+hit.index;
    state.events.push('CANNOT INSERT WAYPOINT HERE');
    return true; // This was a route tap, not a new destination order.
  }
  canvas.dataset.lastRouteTap='inserted:'+hit.index;
  lastAuthoringAt=performance.now();
  tacticalFeedback.emit('node',hit.point);
  selectedNode=id;doorFocusId=null;contextSignature='';
  return true;
}
function releasePointer(e:PointerEvent,cancelled=false){
  const p=activePointers.get(e.pointerId);if(!p)return;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  if(!cancelled&&state.phase==='planning'&&!replaying&&activePointers.size===1){
    if(p.mode==='node'&&p.nodeId!==null){
      if(p.moved){
        const moving=uid(selected)?.plan.find(node=>node.id===p.nodeId);
        const moved=moving?.kind==='flash'?
          moveFlashTarget(state,selected,p.nodeId,pt):
          movePlanNode(state,selected,p.nodeId,pt);
        if(!moved){
          const chosen=uid(selected)?.plan.find(n=>n.id===p.nodeId);
          const origin=uid(selected)?.p??pt;
          state.events.push(orderFailureText(origin,pt,{
            canStand:at=>intelPassable(at,state.intel),
            routeTo:(a,b)=>routeWithIntel(state.intel,a,b),
            remainingPlanValid:chosen?.kind==='move'?false:undefined
          }));
        }
      }
      selectedNode=p.nodeId;doorFocusId=null;
      const chosen=uid(selected)?.plan.find(n=>n.id===p.nodeId);
      if(chosen)tacticalFeedback.emit('node',chosen.p);
    }else if(p.mode==='route'&&trace&&
      distance(trace[0],pt)>16){
      const points=[...trace,pt];
      if(!planMoveStroke(state,selected,points.slice(1)))
        state.events.push('NO WALKABLE STROKE');
      else selectedNode=uid(selected)?.plan.filter(n=>n.kind==='move').at(-1)?.id??null;
      doorFocusId=null;
    }else if(!p.moved&&!p.wasUnit&&pt.x>=0&&pt.y>=0&&
      pt.x<=W&&pt.y<=H){
      const selectedActor=uid(selected);
      // Out-of-reach door geometry must NOT steal a ground tap intended
      // to author a waypoint beside the door. Once the planned endpoint
      // is within reach, the physical door becomes selectable.
      const door=state.doors.find(d=>doorKnown(state.intel,d.id)&&
        (state.intel.doorMemory.get(d.id)??0)<.72&&!!selectedActor&&
        [selectedActor.p,finalPoint(selectedActor)].some(p=>
          doorReachable(p,d))&&
        (distance(worldToScreen(doorCenter(d),10),
          {x:e.clientX,y:e.clientY})<24||
         distance(worldToScreen(doorCenter(d),38),
          {x:e.clientX,y:e.clientY})<25));
      if(door&&!looking&&!flashMode&&!firePlacement){
        doorFocusId=door.id;selectedNode=null;
        doorMenuDismissedId=null;
        tacticalFeedback.emit('select',doorCenter(door));
      }else if(!looking&&!flashMode&&!firePlacement&&insertAtRouteLine({x:e.clientX,y:e.clientY})){
        // Insert-and-select: contextual LOOK/PIE/STRAFE/DELETE are immediately
        // available on the newly authored waypoint.
      }else{
        doorFocusId=null;useSelectedGround(pt);
      }
    }
  }
  trace=null;draggingNode=null;activePointers.delete(e.pointerId);
  if(activePointers.size<2){panMid=null;pinchDistance=0;}
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
window.addEventListener('blur',()=>{activePointers.clear();trace=null;
  panMid=null;pinchDistance=0;});
window.addEventListener('resize',layout);
ui.viewIso.addEventListener('click',()=>cameraMode('iso'));
ui.viewTop.addEventListener('click',()=>cameraMode('top'));
ui.view2d.addEventListener('click',()=>cameraMode('plan2d'));
ui.cameraFit.addEventListener('click',()=>{
  if(stage&&viewMode!=='plan2d')stage.resetCamera();
  else{zoom=1;panX=0;panY=0;layout();}
  updateContext();
});
ui.briefingToggle.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  ui.siteSettings.hidden=true;
  ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  ui.briefingPanel.hidden=false;
  ui.briefingToggle.setAttribute('aria-expanded','true');
  updateContext();
});
ui.briefingClose.addEventListener('click',()=>{
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
  updateContext();
});
ui.uiSoundToggle.textContent=uiSoundEnabled?'UI SOUND ON':'UI SOUND OFF';
ui.uiSoundToggle.setAttribute('aria-pressed',String(uiSoundEnabled));
ui.uiSoundToggle.addEventListener('click',()=>{
  uiSoundEnabled=!uiSoundEnabled;
  ui.uiSoundToggle.textContent=uiSoundEnabled?'UI SOUND ON':'UI SOUND OFF';
  ui.uiSoundToggle.setAttribute('aria-pressed',String(uiSoundEnabled));
  try{localStorage.setItem('fieldwork3d.ui.sound',uiSoundEnabled?'on':'off');}
  catch{/* Optional setting persistence. */}
  if(uiSoundEnabled)uiClickTone('select');
});
ui.uiHelp.addEventListener('click',()=>{
  ui.siteSettings.hidden=true;
  ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  showUiHelp('Tap operator = HERE · Tap a route line = add waypoint · Tap node or door = context actions · Hold an action for a description.',8500);
  updateHud();
});
ui.siteSettingsToggle.addEventListener('click',()=>{
  ui.siteSettings.hidden=!ui.siteSettings.hidden;
  ui.siteSettingsToggle.setAttribute('aria-expanded',String(!ui.siteSettings.hidden));
  updateContext();
});
ui.moreOrders.addEventListener('click',()=>{
  const expanded=ui.orders.classList.toggle('compact')===false;
  if(!expanded){
    ui.siteSettings.hidden=true;
    ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  }
  ui.moreOrders.setAttribute('aria-pressed',String(expanded));
  ui.moreOrders.replaceChildren(tacticalIcon('moreOrders'));
  ui.moreOrders.setAttribute('aria-label',expanded?'Close tools':'More tactical tools');
  ui.moreOrders.title=expanded?'Close tactical tools':'More tactical tools';
  // Never render two command overlays on top of each other.
  updateContext();
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
  fitZoom(z*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
},{passive:false});
// Opt-in developer overlay: add ?perf=1 to measure render and simulation
// without polling DOM/layout or allocating objects in the normal game loop.
const perfOverlay=new URLSearchParams(location.search).has('perf')?
  document.createElement('div'):null;
if(perfOverlay){
  perfOverlay.style.cssText='position:fixed;top:4px;right:4px;z-index:9999;'+
    'background:#102021e8;color:#d5ebd8;font:11px monospace;padding:6px;'+
    'pointer-events:none;white-space:pre;max-width:50vw';
  document.body.append(perfOverlay);
}
const frameMeter=perfOverlay?new FrameMeter():null;
function tick(now:number){
  const perfStart=perfOverlay?performance.now():0;
  const frameGap=Math.max(0,now-last);
  const dt=Math.min(.08,frameGap/1000);last=now;
  let simSteps=0;
  const simPhaseCosts=perfOverlay?new Map<string,number>():null;
  if(!replaying&&state.phase==='running'){
    const budget=fixedStepBudget(accum,dt);
    accum=budget.remaining;
    for(let i=0;i<budget.steps;i++){
      previousRenderActors=renderSnapshot(state.operators);
      stepSession(state,1/60,simPhaseCosts?
        (name,ms)=>simPhaseCosts.set(name,
          (simPhaseCosts.get(name)??0)+ms):undefined);
      simSteps++;
      recorder.capture(state,isMissionTerminal(state));
    }
  }else{accum=0;previousRenderActors=null;}
  if(replaying&&replayFollow&&stage&&viewMode!=='plan2d'){
    const a=team(state).find(x=>x.id===replayFollowId);
    if(a){
      stage.view.focus={...a.p};
      stage.updateCamera(dt);
    }
  }
  if(replaying&&replayPlaying){
    replayTime=Math.min(recorder.duration,replayTime+dt*replayRate);
    applyReplayFrameAt(replayTime);
    if(replayTime>=recorder.duration)replayPlaying=false;
  }
  // 079: shot IDs are monotonic, unlike the short-lived shot array length.
  // A new shot can arrive on exactly the tick an old shot expires.
  const fresh=state.shots.filter(shot=>shot.id>lastSoundShotId);
  if(audio&&!replaying)for(const shot of fresh.slice(-3)){
    const firingActor=state.operators.find(a=>a.id===shot.shooterId);
    const weapon=firingActor?.weapon??'carbine';
    const listener=uid(selected)?.p;
    const level=listener?heardIntensity(shot.start,listener,
      WEAPONS[weapon].noise,state.doors,WALLS):1;
    if(level<.01)continue; // Outside acoustic range is genuinely quiet.
    const pan=listener?(shot.start.x-listener.x)/210:0;
    playTone(weapon==='shotgun'?82:weapon==='rifle'?112:
      weapon==='smg'?177:135,weapon==='shotgun'?.19:.095,
      true,level,pan);
    if(shot.hit)playTone(shot.down?75:225,shot.down ? .25 : .10,
      shot.down,level,pan);
  }
  if(fresh.length)lastSoundShotId=fresh.at(-1)!.id;
  // One restrained boot thud per recorded physical touchdown; never an
  // independent timed walking loop, and never an audio burst on resume.
  if(!replaying&&state.phase==='running'){
    const from=Math.max(lastFootstepSoundTime,state.seconds-.16);
    if(audio?.state==='running'){
      const ids=team(state).map(a=>a.id);
      for(const touch of recorder.motion.touchdownsBetween(
        from,state.seconds,ids).slice(-5)){
        const listener=uid(selected)?.p;
        const level=listener?heardIntensity(touch.position,listener,
          36,state.doors,WALLS):.24;
        if(level<.025)continue;
        const pan=listener?(touch.position.x-listener.x)/210:0;
        playTone(touch.foot===0?62:67,.055,true,level*.12,pan);
      }
    }
  }
  lastFootstepSoundTime=state.seconds;
  const event=state.events.at(-1)??'';
  if(event!==lastEventAudio&&(event.includes('OPENED')||event.includes('CLOSING')))
    playTone(160,.16);
  if(event!==lastEventAudio&&event.includes('KICK RESISTED'))
    playTone(115,.15,true);
  if(event!==lastEventAudio&&event.includes('FORCED OPEN'))
    playTone(80,.24,true);
  if(event!==lastEventAudio&&event.includes('KICKED'))
    playTone(90,.25,true);
  if(event!==lastEventAudio&&event.includes('FLASH DETONATED'))
    playTone(1350,.65,true);
  if(event!==lastEventAudio&&event.includes('RELOADED'))
    playTone(280,.09);
  if(event!==lastEventAudio&&event.includes('FLASH OUT'))
    playTone(420,.07);
  if(event!==lastEventAudio&&event.includes('SURRENDERED'))
    playTone(210,.22);
  lastEventAudio=event;
  if(now-hudAt>120){updateHud();if(replaying)updateReplayHud();hudAt=now;}
  const perfRenderStart=perfOverlay?performance.now():0;
  if(stage&&viewMode!=='plan2d')
    stage.update(state,selected,dt,doorFocusId,
      replaying&&replayOmniscient,replaying?replayPresentation:null,
      !replaying&&state.phase==='running'&&previousRenderActors?
        {previous:previousRenderActors,alpha:Math.min(1,accum*60)}:null,
      // Pausing the encounter must NOT switch to render-local footsteps.
      !replaying?recorder.motion.presentation(Math.max(0,
        state.phase==='running'?
          state.seconds-(1-Math.min(1,accum*60))/60:
          state.seconds),state.operators.map(a=>a.id)):null);
  const overlayBegin=perfOverlay?performance.now():0;
  render();
  // One local, intelligible pulse per distinct blocked episode.
  for(const actor of team(state)){
    const old=blockedEpisode.get(actor.id);
    if(actor.blockedTime<.3||actor.lastBlocker==='clear'){
      blockedEpisode.delete(actor.id);continue;
    }
    if(actor.blockedTime>=.95&&(old!==actor.lastBlocker)){
      blockedEpisode.set(actor.id,actor.lastBlocker);
      if(!replaying)tacticalFeedback.emit('error',actor.p,
        actor.lastBlocker==='furniture'?'OBSTRUCTED':actor.lastBlocker);
    }
  }
  if(feedbackDraw){
    feedbackDraw.setTransform(dpr,0,0,dpr,0,0);
    feedbackDraw.clearRect(0,0,cssW,cssH);
    const origin=selectedPlanNode()?.p??uid(selected)?.p;
    const preview=state.phase==='planning'&&looking&&cursor&&origin?
      {origin,direction:cursor,pie:lookMode==='pie'}:undefined;
    tacticalFeedback.draw(feedbackDraw,p=>worldToScreen(p,7),
      performance.now(),preview);
  }
  updateContext();advanceContextPalette(dt);
  if(frameMeter&&perfOverlay){
    const end=performance.now(),stats=stage?.performanceStats();
    frameMeter.add({frame:end-perfStart,cadence:frameGap,sim:perfRenderStart-perfStart,
      scene:overlayBegin-perfRenderStart,overlay:end-overlayBegin,
      steps:simSteps,draws:stats?.calls??0,triangles:stats?.triangles??0});
    const m=frameMeter.summary();
    if(Math.floor(now/750)!==Math.floor((now-dt*1000)/750))
      perfOverlay.textContent='JS '+m.p50.toFixed(1)+'ms · P95 '+
        m.p95.toFixed(1)+' · MAX '+m.worst.toFixed(1)+
        '\\nRAF GAP P50 '+m.rafP50.toFixed(1)+'ms · P95 '+
        m.rafP95.toFixed(1)+'ms'+
        '\\nSIM '+m.simulation.toFixed(1)+'ms / '+m.steps.toFixed(1)+
        ' ticks · SCENE '+m.scene.toFixed(1)+'ms'+
        '\\nOVERLAY '+m.overlay.toFixed(1)+'ms · DRAWS '+
        m.draws.toFixed(0)+' · TRI '+m.triangles.toFixed(0)+
        (simPhaseCosts&&simPhaseCosts.size?'\\nHOT SIM '+
          [...simPhaseCosts].sort((a,b)=>b[1]-a[1]).slice(0,2)
            .map(([name,ms])=>name+' '+ms.toFixed(1)+'ms').join(' / '):'');
  }
  if(awarenessPanel&&Math.floor(now/500)!==
      Math.floor((now-dt*1000)/500)){
    const inspected=state.operators.find(a=>a.id===awarenessParam)??uid(selected);
    awarenessPanel.textContent=inspected?awarenessDebugLine(inspected):
      'No selected actor';
  }
  requestAnimationFrame(tick);
}
layout();cameraMode(viewMode);updateHud();
if(campaignMode==='menu')campaignScreen.entry(!!campaign);
requestAnimationFrame(tick);
