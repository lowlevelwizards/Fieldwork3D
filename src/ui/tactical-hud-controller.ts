/** Tactical HUD presentation, guidance, LOOK/WATCH arming and feedback.
 * Takes authored orders and player-visible data as input; game modules remain
 * the only authority for command feasibility and execution.
 */
import {currentSiteIdentity} from './current-site-identity.ts';
import {compactSiteTitle} from './site-title.ts';
import {renderMissionDebrief} from './breach-mission-debrief.ts';
import {debriefPrimaryActionLabel} from './fieldwork-vocabulary.ts';
import {tacticalIcon} from './tactical-icons.ts';
import type {createBreachUiElements} from './breach-ui-elements.ts';
import type {CampaignMode} from '../breach-app-mode.ts';
import type {CampaignState} from '../campaign-state.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel,rangeTrialLabel,type RangeTrial} from '../equipment-training-diagnostics.ts';
import {lightControlState} from '../equipment-weapon-light-ui.ts';
import type {ViewMode} from '../breach-3d.ts';
import {doorCenter,type Door,type Pt} from '../breach-core.ts';
import {dispatchTacticalContextCommand} from '../breach-tactical-context-command.ts';
import type {createBreachAudioController} from '../breach-audio-controller.ts';
import type {DisplayRouteCache} from '../breach-route-cache.ts';
import type {createBreachReplayAnalysisController} from './breach-replay-analysis-controller.ts';
import type {createBreachReplayTimelineController} from './breach-replay-timeline-controller.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
import {contextActionChoices} from './context-actions.ts';
import {TacticalFeedback,type FeedbackPoint} from './tactical-feedback.ts';
import {ContextualTeaching,resolveHudPresentation,type HudUrgency,type HudPhase}
  from './contextual-teaching.ts';
import {recoveryAdviceFor} from './recovery-guidance.ts';
import {team,enemies,isSeen,missionText,operationBriefing,type Session,type TeamActor} from '../breach-game.ts';
import {injuryOf,WEAPONS} from '../breach-combat.ts';
import {liveMagazineCapacity,magazineAlert}
  from '../arsenal/live-magazine-capacity.ts';
import {executionStatus} from '../breach-execution-state.ts';
import {compactExecutionStatus} from './tactical-hud-density.ts';
import {ExecutionNoticeFeed} from './execution-feedback.ts';
import {createTacticalInteractionState,
 type TacticalInteractionState} from '../breach-tactical-interaction-state.ts';

/** A6: read-only HUD presentation snapshot. No command or navigation authority. */
export type TacticalSessionPresentation={
 state:Session;mode:CampaignMode;replaying:boolean;selected:string;
 selectedNode:number|null;selectedActiveWatch:boolean;
 ui:ReturnType<typeof createBreachUiElements>;
 siteIdentityOutput:HTMLOutputElement;rangeTelemetry:HTMLElement;
 lastRangeTrial:RangeTrial|null;
 medicalCandidate:()=>TeamActor|null;casualty:TeamActor|null;
 paletteTether:HTMLElement;paintOperatorAccent:(node:HTMLElement,id:string)=>void;
 colorFor:(id:string)=>string;
 fieldLightButton:HTMLButtonElement|null;medicalButton:HTMLButtonElement|null;
 dragButton:HTMLButtonElement|null;carryButton:HTMLButtonElement|null;
 retrieveButton:HTMLButtonElement|null;navPanel:HTMLOutputElement|null;
 canvas:HTMLCanvasElement;auditRouteMode:boolean;viewMode:ViewMode;
 cssW:number;cssH:number;worldToScreen:(p:Pt,height?:number)=>Pt;
 displayRouteCache:DisplayRouteCache;
 reducedMotion:boolean;weaponChooser:HTMLElement;hideWeaponChooser:()=>void;
 favoriteActive:boolean;recorder:MissionRecorder;campaign:CampaignState|null;
 operationsLogged:number;
};
export type TacticalContextActionPorts={
 ui:ReturnType<typeof createBreachUiElements>;
 readonly state:Session;readonly selected:string;readonly replaying:boolean;
 readonly actor:TeamActor|null;readonly node:TeamActor['plan'][number]|undefined;
 selectedNode:number|null;selectedActiveWatch:boolean;
 doorFocusId:string|null;doorMenuDismissedId:string|null;
 focusedDoor:()=>Door|undefined;medicalCandidate:(at:Pt)=>TeamActor|null;
 audio:ReturnType<typeof createBreachAudioController>;
 invalidateFog:()=>void;updateHud:()=>void;
 armFacing:(mode:'look'|'watch')=>void;
 showUiHelp:(text:string,duration?:number)=>void;
};
export type TacticalShortcutPorts={
 ui:ReturnType<typeof createBreachUiElements>;
 getMode:()=>CampaignMode;isQuickConfiguring:()=>boolean;
 isReplaying:()=>boolean;
 replayAnalysisUi:ReturnType<typeof createBreachReplayAnalysisController>;
 replayTimeline:ReturnType<typeof createBreachReplayTimelineController>;
 replayPlayback:ReplayPlaybackController;
 exitReplay:()=>void;seekReplay:(time:number)=>void;
 selectUnit:(id:string)=>void;armFacing:(mode:'look'|'watch')=>void;
 weaponChooser:HTMLElement;hideWeaponChooser:()=>void;
 operationsBoard:HTMLElement;cancelTargeting:()=>void;
 onExecute:()=>void;onUndoRedo:(redo:boolean)=>void;
 getViewMode:()=>ViewMode;cameraMode:(mode:ViewMode)=>void;
 turnCamera:(shift:number)=>void;
};
export type TacticalGuidanceInput={
  replaying:boolean;phase:Session['phase'];
  selectedNode:number|null;selectedActiveWatch:boolean;
  feed:HTMLElement;hint:HTMLElement;
};
export function createTacticalHudController(
 targeting:TacticalInteractionState=createTacticalInteractionState()){
  const feedback=new TacticalFeedback();
  const teaching=new ContextualTeaching(
    key=>{try{return localStorage.getItem('fieldwork3d.ui.teach.v2.'+key)==='1';}
      catch{return false;}},
    key=>{try{localStorage.setItem('fieldwork3d.ui.teach.v2.'+key,'1');}
      catch{/* Temporary lessons work without storage. */}}
  );
  teaching.offer('planning-start',
    'Tap the floor to draw a route. Select a waypoint to LOOK, WATCH or WAIT.',
    performance.now(),6200);
  let helpText='',helpUntil=0;
  function showHelp(text:string,duration=4200):void{
    if(!text)return;
    helpText=text;helpUntil=performance.now()+duration;
  }
  function teach(key:string,text:string,duration=4200):void{
    teaching.offer(key,text,performance.now(),duration);
  }
  function discoverAction(action:string,description:string):void{
    teach('action-'+action,description,3600);
  }
  function toggleFacing(mode:'look'|'watch',selectedNode:number|null):boolean{
    return targeting.toggleFacing(mode,selectedNode);
  }
  function message(input:Pick<TacticalGuidanceInput,
    'replaying'|'phase'|'selectedActiveWatch'|'selectedNode'>){
    if(input.replaying)return 'MISSION FILM · ORBIT, PAN, ZOOM AND SCRUB FREELY';
    if(input.phase==='planning'){
      switch(targeting.mode.kind){
        case 'flash':return 'FLASH: tap a target, or CANCEL to back out.';
        case 'push':return 'PUSH: tap or drag a direction away from the selected object (±80°). CANCEL to exit.';
        case 'suppress':return 'SUPPRESS ARMED · TAP A POINT TO PLACE FIRE POLICY · CANCEL/BACK TO EXIT.';
        case 'evac':return targeting.mode.transport==='drag'?
          'DRAG ARMED · TAP A REACHABLE DESTINATION · CANCEL/BACK TO EXIT.':
          'CARRY ARMED · TAP A REACHABLE DESTINATION · CANCEL/BACK TO EXIT.';
        case 'watch':return 'WATCH ARMED · TAP A POINT · CANCEL/BACK TO EXIT. Replaces prior WATCH; RUN or interactions end tracking.';
        case 'look':return 'LOOK ARMED · TAP ANY DIRECTION · CANCEL/BACK TO EXIT. Replaces prior WATCH.';
      }
      if(input.selectedActiveWatch)
        return 'WATCH TARGET · DRAG THE RING TO RETARGET · DELETE WATCH TO RELEASE.';
      if(input.selectedNode!==null)
        return 'Waypoint: LOOK changes direction · WATCH tracks a point · choose another to replace · UNDO reverses it.';
      return 'Tap a route line to insert a waypoint · tap a node to edit or delete.';
    }
    if(input.phase==='running')return 'Executing. Pause to change your plan.';
    return input.phase==='won'?'Station secured. Review your report.':
      'Team lost. Review the debrief and try another approach.';
  }
  function renderGuidance(input:TacticalGuidanceInput):void{
    const now=performance.now(),hasHelp=now<helpUntil;
    const tip=teaching.current(now);
    const targetArmed=targeting.isArmed;
    const phase:HudPhase=input.replaying?'replay':
      input.phase==='planning'?(targetArmed?'targeting':'planning'):
      input.phase==='running'?'execution':'debrief';
    const severity=input.feed.hidden?'normal':input.feed.dataset.severity;
    const urgency:HudUrgency=severity==='warning'||severity==='contact'||
      severity==='danger'?severity:'normal';
    const presentation=resolveHudPresentation({
      phase,urgency,explicitHelp:hasHelp,coaching:!!tip,targetPrompt:targetArmed
    });
    document.body.dataset.hudPhase=phase;
    document.body.dataset.hudUrgency=urgency;
    input.hint.dataset.hintKind=hasHelp?'help':targetArmed?'target':'coach';
    input.hint.textContent=hasHelp?helpText:targetArmed?message(input):
      presentation.showCoaching?(tip?.text??''):message(input);
    input.hint.hidden=!presentation.showGuidance;
  }
  /** Feedback from game *results*, not a second validation pipeline. */
  function rejectAttempt(point:FeedbackPoint,reason:string,
    warn:()=>void):void{
    feedback.emit('error',point,recoveryAdviceFor(reason)?.marker??'INVALID');
    warn();
  }
  function completeAction(point:FeedbackPoint,failedReason:string|null,
    caption:string,warnOrConfirm:(failed:boolean)=>void):void{
    const failed=failedReason!==null;
    warnOrConfirm(failed);
    feedback.emit(failed?'error':'command',point,
      failed?(recoveryAdviceFor(failedReason)?.marker??'BLOCKED'):caption);
  }
  function renderQuickStates(input:{
    quickStates:HTMLElement;tacticalHud:HTMLElement;
    scopeElement:HTMLElement;plannedControl:(nodeId?:number)=>{posture:'stand'|'crouch';pace:'walk'|'run'};
    state:Session;replaying:boolean;actor:TeamActor|null;
    node:TeamActor['plan'][number]|undefined;
    selectedActiveWatch:boolean;watchTargetPresent:boolean;
    iconFor:(id:string,label:string)=>string;
    icon:(key:string)=>SVGSVGElement;
    installHelp:(button:HTMLButtonElement)=>void;
  }):void{
    const {state,actor,node,quickStates}=input;
    const shown=state.phase==='planning'&&!input.replaying&&
      !!actor&&actor.health>0;
    quickStates.hidden=!shown;
    const height=Math.ceil(input.tacticalHud.getBoundingClientRect().height);
    const value=height+'px';
    if(document.documentElement.style.getPropertyValue('--tactical-hud-height')!==value)
      document.documentElement.style.setProperty('--tactical-hud-height',value);
    if(!shown||!actor)return;
    const index=node?actor.plan.findIndex(n=>n.id===node.id)+1:0;
    const scope=node?'WAYPOINT '+String(index).padStart(2,'0'):
      input.selectedActiveWatch&&input.watchTargetPresent?
        'WATCH TARGET':'OPERATOR / HERE';
    const quickScope=input.scopeElement;
    // Scope is provided by the existing HUD mount; no duplicate DOM.
    if(quickScope){
      quickScope.textContent=actor.name.toUpperCase()+' · '+scope+
        (actor.aimInstruction?.mode==='track'&&actor.pace!=='run'?
          ' · WATCH ACTIVE':'');
      quickScope.title=node?
        'Commands apply when '+actor.name+' reaches waypoint '+index:
        input.selectedActiveWatch&&input.watchTargetPresent?
          'The active WATCH point can be dragged or deleted from its marker':
          'Commands apply to '+actor.name+' at their current position';
    }
    quickStates.setAttribute('aria-label',actor.name+' · '+scope+' commands');
    const current=input.plannedControl(node?.id);
    const choices=contextActionChoices({
      door:false,node:!!node,flashRemaining:state.flashRemaining,
      posture:current.posture,pace:current.pace,
      firePolicy:node?.firePolicyState??actor.firePolicy,
      reserve:actor.reserve,magazine:actor.magazine
    }).filter(choice=>choice.group==='state');
    for(const choice of choices){
      const button=quickStates.querySelector<HTMLButtonElement>(
        'button[data-action="'+choice.id+'"]');
      if(!button)continue;
      const icon=input.iconFor(choice.id,choice.label);
      if(button.dataset.icon!==icon){
        button.querySelector('.ui-icon')?.remove();
        button.prepend(input.icon(icon));button.dataset.icon=icon;
      }
      const label=button.querySelector<HTMLElement>('.command-label');
      if(label&&label.textContent!==choice.label)label.textContent=choice.label;
      button.title=choice.title??choice.label;
      input.installHelp(button);
      button.setAttribute('aria-label',(node?'Waypoint: ':'Operator: ')+
        choice.label+'. '+(choice.title??''));
      button.disabled=!!choice.disabled;
      if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
      else button.setAttribute('aria-pressed',String(choice.pressed));
    }
  }
  function renderTargetMode(config:{
    cancelTarget:HTMLElement;hint:HTMLElement;
    phase:Session['phase'];replaying:boolean;
  }):void{
    const target=config.phase!=='planning'||config.replaying?'':targeting.label;
    config.cancelTarget.hidden=!target;
    if(target){
      config.cancelTarget.textContent='✕ CANCEL '+target;
      config.cancelTarget.setAttribute('aria-label','Cancel '+target+' targeting');
    }
    config.hint.dataset.targetMode=target;
  }
  function renderPhase(config:{
    phase:Session['phase'];started:boolean;replaying:boolean;seconds:number;
    phaseNode:HTMLElement;clock:HTMLElement;play:HTMLButtonElement;
    reducedMotion:boolean;
    icon:(key:string)=>SVGSVGElement;
  }):void{
    config.phaseNode.textContent=config.replaying?'REPLAY':
      config.phase==='planning'?(config.started?'PAUSED':'PLANNING'):
      config.phase==='running'?'EXECUTING':
      config.phase==='won'?'COMPLETE':'FAILED';
    config.phaseNode.classList.toggle('live',config.phase==='running');
    config.phaseNode.classList.toggle('done',
      config.phase==='won'||config.phase==='lost');
    const seconds=Math.floor(config.seconds);
    config.clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+
      String(seconds%60).padStart(2,'0');
    const mode=config.phase==='running'?'pause':
      config.phase==='planning'?'go':'reset';
    if(config.play.dataset.mode!==mode){
      const previous=config.play.dataset.mode;
      config.play.dataset.mode=mode;
      const label=document.createElement('span');
      label.textContent=mode==='go'?'GO':mode==='pause'?'PAUSE':'RESET';
      label.className='go-label';
      config.play.replaceChildren(config.icon(mode),label);
      config.play.setAttribute('aria-label',mode==='go'?'Execute plan':
        mode==='pause'?'Pause execution':'Reset encounter');
      if(previous&&!config.reducedMotion){
        config.play.animate([
          {transform:'scale(.93)',filter:'brightness(1.14)'},
          {transform:'scale(1.055)',filter:'brightness(1.25)',offset:.43},
          {transform:'scale(1)',filter:'brightness(1)'}
        ],{duration:295,easing:'cubic-bezier(.16,.85,.25,1)'});
        config.phaseNode.animate([
          {opacity:.65,transform:'translateY(3px)'},
          {opacity:1,transform:'translateY(-2px)',offset:.55},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:300,easing:'ease-out'});
      }
    }
    config.play.classList.toggle('running',config.phase==='running');
  }
  const noticeFeed=new ExecutionNoticeFeed();
  function resetNotices():void{noticeFeed.reset();}
  function renderNotice(node:HTMLElement,events:string[],phase:string,
    replaying:boolean):void{
    const notice=noticeFeed.update(events,phase,performance.now());
    node.hidden=!notice||replaying;
    if(!notice||replaying){
      node.removeAttribute('data-notice-key');
      return;
    }
    const key=notice.born+'|'+notice.label+'|'+notice.text;
    if(node.dataset.noticeKey!==key){
      const label=document.createElement('strong');
      label.className='fw-notice-label';label.textContent=notice.label;
      const body=document.createElement('span');
      body.className='fw-notice-body';
      const description=document.createElement('span');
      description.className='fw-notice-content';
      description.textContent=notice.text;body.append(description);
      if(notice.recovery){
        const next=document.createElement('span');
        next.className='fw-notice-recovery';next.textContent=notice.recovery;
        body.append(next);
      }
      node.replaceChildren(label,body);
      node.dataset.noticeKey=key;
    }
    node.dataset.severity=notice.severity;
    node.classList.toggle('critical',notice.severity==='danger');
  }
  function renderOperatorCard(input:{
    state:Session;replaying:boolean;selected:string;id:string;
    actor:TeamActor|undefined;button:HTMLButtonElement;
    ammo:HTMLElement;hp:HTMLElement;
    paintAccent:(element:HTMLElement,id:string)=>void;
  }):void{
    const {state,replaying,selected,id,button,ammo,hp}=input;
    const a=input.actor;
    input.paintAccent(button,id);
    button.hidden=!a;
    const title=button.querySelector('strong');
    if(title&&a)title.textContent=a.name;
    button.classList.toggle('selected',id===selected);
    button.classList.toggle('down',!a||a.health<=0);
    button.title=a?WEAPONS[a.weapon].label+' • '+
      injuryOf(a.injuryStage).toUpperCase():'NO OPERATOR';
    button.classList.toggle('loading',!!a&&a.reload>0);
    button.style.setProperty('--reload-progress',
      ((a?.reload??0)>0?Math.round(100*(1-a!.reload/
        (WEAPONS[a!.weapon].reload*(a!.injuryStage===2?1.5:
          a!.injuryStage===1?1.1:1)))):0)+'%');
    const capacity=a?liveMagazineCapacity(a.weapon,a.weaponConfiguration):0;
    const alert=a?magazineAlert(a.magazine,capacity):'normal';
    ammo.dataset.ammo=alert;
    ammo.textContent=a?String(a.magazine).padStart(2,'0')+' / '+a.reserve+
      (a.reload>0?' ↻':''):'--';
    ammo.title=a?`${a.magazine} / ${capacity} loaded · ${a.reserve} reserve rounds`:'';
    button.setAttribute('aria-pressed',String(id===selected));
    hp.textContent=!a?'--':a.health<=0?'DOWN':
      a.injuryStage===2?'HEAVY':a.injuryStage===1?'HURT':'OK';
    const condition=!a?'missing':a.health<=0?'down':
      a.injuryStage===2?'heavy':a.injuryStage===1?'hurt':'healthy';
    const fill=condition==='down'?0:condition==='heavy'?34:
      condition==='hurt'?67:100;
    button.style.setProperty('--health-fill',fill+'%');
    button.style.setProperty('--health-color',
      condition==='heavy'?'#c77f68':condition==='hurt'?'#d0ad76':'#91b5a5');
    button.dataset.condition=condition;
    let stateLine=button.querySelector<HTMLElement>('.unit-execution');
    if(!stateLine){
      stateLine=document.createElement('span');
      stateLine.className='unit-execution';button.append(stateLine);
    }
    const execution=a?executionStatus(a,{
      phase:state.phase==='planning'&&state.started?'running':state.phase,
      doors:state.doors,peers:team(state)
    }):null;
    const status=compactExecutionStatus(execution,{
      selected:id===selected,
      phase:state.phase==='running'?'execution':
        state.phase==='planning'?'planning':
        replaying?'replay':'debrief',
      down:!a||a.health<=0
    });
    stateLine.hidden=!status.visible;
    stateLine.textContent=status.label;
    stateLine.dataset.kind=execution?.kind??'idle';
    stateLine.dataset.priority=status.priority;
    button.dataset.executionVisible=String(status.visible);
    stateLine.title=status.detail;
    if(execution?.progress!==undefined){
      stateLine.dataset.progress='true';
      stateLine.style.setProperty('--execution-progress',
        Math.round(execution.progress*100)+'%');
    }else{
      stateLine.removeAttribute('data-progress');
      stateLine.style.removeProperty('--execution-progress');
    }
    button.setAttribute('aria-label',a?
      a.name+', '+condition+', '+a.magazine+' of '+capacity+
      ' rounds loaded, '+a.reserve+' reserve'+(a.reload>0?', reloading':'')+
      '. '+(execution?.label??'IDLE')+'. '+(execution?.detail??''):
      id+', unavailable');
  }
  function renderSession(input:TacticalSessionPresentation):void{
    const {state,mode,replaying,selected,selectedNode,selectedActiveWatch,ui,
      siteIdentityOutput,rangeTelemetry,lastRangeTrial,medicalCandidate,casualty,
      paletteTether,paintOperatorAccent,colorFor,fieldLightButton,
      medicalButton,dragButton,carryButton,retrieveButton,navPanel,
      canvas,auditRouteMode,viewMode,cssW,cssH,worldToScreen,displayRouteCache,
      reducedMotion,weaponChooser,hideWeaponChooser,favoriteActive,
      recorder,campaign,operationsLogged}=input;

  ui.quickPlaySetup.hidden=mode!=='quick'||replaying;
  const identity=currentSiteIdentity(state.site,mode==='quick');
  if(siteIdentityOutput.textContent!==identity.text)
    siteIdentityOutput.textContent=identity.text;
  if(identity.seed!==null)siteIdentityOutput.dataset.siteSeed=identity.seed;
  else delete siteIdentityOutput.dataset.siteSeed;
  const telemetry=activeRangeDiagnostic(state,selected);
  rangeTelemetry.hidden=!telemetry;
  if(telemetry){
   const line=rangeDiagnosticLabel(telemetry)+
    (lastRangeTrial?'\n'+rangeTrialLabel(lastRangeTrial):'');
   if(rangeTelemetry.textContent!==line)rangeTelemetry.textContent=line;
  }
  const leaveRange=document.querySelector<HTMLButtonElement>(
   '[data-equipment-range-exit]');
  if(leaveRange)leaveRange.hidden=!state.site?.training;
  const repeat=document.querySelector<HTMLButtonElement>('[data-range-repeat]');
  if(repeat)repeat.hidden=!state.site?.training;
  paintOperatorAccent(ui.quickStates,selected);
  paintOperatorAccent(ui.context,selected);
  paintOperatorAccent(paletteTether,selected);
  if(medicalButton){
   const patient=medicalCandidate();
   medicalButton.disabled=!patient||state.phase!=='planning'||replaying;
   medicalButton.textContent=patient?'TREAT · '+patient.name.toUpperCase():
    'TREAT · NO SUITABLE SUPPLIES';
   medicalButton.setAttribute('aria-label',patient?
    'Plan medical stabilization for '+patient.name:'No treatable wound with available supplies');
  }
  for(const [button,mode] of [
   [dragButton,'DRAG'],[carryButton,'CARRY'],[retrieveButton,'RECOVER']
  ] as const){
   if(!button)continue;
   button.hidden=!casualty;
   button.disabled=!casualty||state.phase!=='planning'||replaying;
   button.textContent=casualty?mode+' · '+casualty.name.toUpperCase():mode;
  }
  if(fieldLightButton){
   const selectedActor=team(state).find(a=>a.id===selected);
   const light=lightControlState(selectedActor,state.phase,replaying);
   if(fieldLightButton.textContent!==light.text)fieldLightButton.textContent=light.text;
   fieldLightButton.setAttribute('aria-label',light.aria);
   fieldLightButton.setAttribute('aria-pressed',String(light.pressed));
   fieldLightButton.disabled=light.disabled;
   fieldLightButton.style.borderColor=light.pressed?colorFor(selected):'';
  }
  const brief=operationBriefing(state);
  renderPhase({
    phase:state.phase,started:state.started,replaying,seconds:state.seconds,
    phaseNode:ui.phase,clock:ui.clock,play:ui.play,
    reducedMotion:reducedMotion,icon:tacticalIcon
  });
  const active=team(state).find(o=>o.id===selected);
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
  // Explicit browser audit mode exposes ONLY already-authored friendly routes.
  // Use the actual rendered polyline, rather than guessing a touch coordinate
  // from an old screenshot or hardcoded map bounds.
  if(auditRouteMode&&active&&viewMode==='plan2d'){
    const candidates:{x:number;y:number;clearance:number}[]=[];
    let from=active.p;
    const markers=[...team(state).map(unit=>worldToScreen(unit.p,8)),
      ...active.plan.map(n=>worldToScreen(n.p,8))];
    for(const node of active.plan){
      if(node.kind!=='move'&&node.kind!=='door')continue;
      const steps=displayRouteCache.get(from,node.p,state.intel,true).points;
      let previous=from;
      for(const point of steps){
        for(const t of [.2,.35,.5,.65,.8]){
          const world={x:previous.x+(point.x-previous.x)*t,
            y:previous.y+(point.y-previous.y)*t};
          const p=worldToScreen(world,4);
          if(p.x<12||p.x>cssW-12||p.y<72||p.y>cssH-120)continue;
          const clearance=markers.length?Math.min(...markers.map(q=>Math.hypot(p.x-q.x,p.y-q.y))):99;
          if(clearance>=34)candidates.push({x:p.x,y:p.y,clearance});
        }
        previous=point;
      }
      from=node.p;
    }
    candidates.sort((a,b)=>b.clearance-a.clearance);
    canvas.dataset.auditRoutePoints=JSON.stringify(candidates.slice(0,40));
  }
  const stanceLabel=active?.posture==='crouch'?'STAND':'CROUCH';
  if(ui.stance.textContent!==stanceLabel)
    ui.stance.replaceChildren(tacticalIcon(stanceLabel==='STAND'?'stand':'crouch'),
      document.createTextNode(stanceLabel));
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  const flashLabel='FLASH ×'+state.flashRemaining;
  if(ui.flash.textContent!==flashLabel)
    ui.flash.replaceChildren(tacticalIcon('flash'),document.createTextNode(flashLabel));
  renderTargetMode({
    cancelTarget:ui.cancelTarget,hint:ui.hint,
    phase:state.phase,replaying
  });
  ui.loadout.textContent='WEAPON · '+(active?.weapon.toUpperCase()??'—');
  ui.loadout.disabled=mode==='mission'||state.phase!=='planning'||replaying;
  if(ui.loadout.disabled&&!weaponChooser.hidden)hideWeaponChooser();
  ui.flash.disabled=state.flashRemaining<=0||replaying;
  ui.back.disabled=!targeting.isArmed&&!selectedActiveWatch&&!active?.plan.length;
  ui.clear.disabled=!active?.plan.length||state.phase!=='planning'||replaying;
  ui.clear.title='Clear this operator\'s route (Undo restores it)';
  ui.undo.disabled=!(active?.history.undo.length);
  ui.redo.disabled=!(active?.history.redo.length);
  ui.debrief.hidden=replaying||mode==='menu'||mode==='home'||
    (state.phase!=='won'&&state.phase!=='lost');
  ui.favoriteMission.disabled=!state.site;
  ui.favoriteMission.textContent=favoriteActive?
    '★ MISSION FAVORITED':'☆ FAVORITE MISSION';
  ui.next.textContent=debriefPrimaryActionLabel(mode);
  ui.retry.disabled=mode==='mission';
  if(!ui.debrief.hidden)renderMissionDebrief({
    ui,state,brief,recorder,campaign,campaignMode:mode,
    operationsLogged:operationsLogged
  });
  for(const id of ['rook','moss','ash','vale'] as const){
    renderOperatorCard({
      state,replaying,selected,id,actor:team(state).find(o=>o.id===id),
      button:ui[id],
      ammo:ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'],
      hp:ui[(id+'Hp') as 'rookHp'|'mossHp'|'ashHp'|'valeHp'],
      paintAccent:paintOperatorAccent
    });
  }
  // Show the site as a place, not as a raw procedural generation dump.
  const siteHeader=document.querySelector<HTMLElement>('.ident strong');
  const siteSubheading=document.querySelector<HTMLElement>('.ident small');
  if(siteHeader)siteHeader.textContent=compactSiteTitle(state.site);
  if(siteSubheading)siteSubheading.textContent=state.site?
    team(state).length+' OPERATORS · '+
    (state.intel.mode==='floor-plan'?state.site.roomCount:'?')+' KNOWN ROOMS':
    'TACTICAL TRAINING';
  if(siteHeader)siteHeader.title=state.site?.name??'Cutwoods';
  renderNotice(ui.feed,state.events,state.phase,replaying);
  renderGuidance({
    replaying,phase:state.phase,selectedNode,selectedActiveWatch,
    feed:ui.feed,hint:ui.hint
  });
  const visible=enemies(state).filter(e=>e.health>0&&isSeen(state,e)).length;
  ui.mission.textContent=(state.phase==='planning'?
      brief.code+' • ':'')+missionText(state)+
    (visible?' • '+visible+' CONTACT'+(visible===1?'':'S'):'');

  }
  let contextActionsBound=false;
  function bindContextActions(config:TacticalContextActionPorts):void{
    if(contextActionsBound)return;
    contextActionsBound=true;
    const handleContextAction=(event:MouseEvent)=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-action]');
      if(!button||config.state.phase!=='planning'||config.replaying)return;
      const action=button.dataset.action;
      if(action)discoverAction(action,button.title);
      const a=config.actor;
      if(!a)return;
      const beforeErrors=config.state.events.length;
      const node=config.node;
      const door=config.doorFocusId?config.focusedDoor():undefined;
      const result=dispatchTacticalContextCommand({
        config.state,config.selected,actor:a,node,door,action:action??'',
        config.selectedActiveWatch,
        medicalCandidate:config.medicalCandidate
      });
      if(result.handled){
        if(result.clearSelection){
          config.selectedNode=null;config.selectedActiveWatch=false;
        }
        if(result.clearDoorFocus)config.doorFocusId=null;
        if(result.dismissDoorId!==undefined)
          config.doorMenuDismissedId=result.dismissDoorId;
        if(result.invalidateFog)config.invalidateFog();
        if(result.skipFeedback){config.updateHud();return;}
      }else switch(action){
        case 'ctxSuppress':
          targeting.armSuppress();
          feedback.emit('armed',node?.p??a.p,'SUPPRESS READY');
          config.audio.uiClickTone('select');config.updateHud();return;
        case 'ctxFlash':
          if(config.state.flashRemaining>0)targeting.toggleFlash();
          break;
        case 'ctxLook':
          config.armFacing('look');
          if(targeting.isFacing)feedback.emit('armed',
            node?.p??a.p,'TAP A DIRECTION');
          config.audio.uiClickTone('select');return;
        case 'ctxDoor':{
          const available=config.focusedDoor();
          if(!available){config.state.events.push('NO KNOWN DOOR IN REACH');break;}
          config.doorFocusId=available.id;config.doorMenuDismissedId=null;
          config.audio.uiClickTone('select');config.updateHud();return;
        }
        case 'ctxWatch':
          config.armFacing('watch');
          if(targeting.isFacing)feedback.emit('armed',
            node?.p??a.p,'TAP WATCH TARGET');
          config.audio.uiClickTone('select');return;
        case 'ctxPush':
          targeting.armPush();
          feedback.emit('armed',node?.p??a.p,'PUSH DIRECTION');
          config.showUiHelp('TAP OR DRAG AWAY FROM THE OBJECT TO CHOOSE PUSH DIRECTION',3600);
          config.audio.uiClickTone('select');config.updateHud();return;
        case 'ctxDoorFlash':
          if(!door){config.state.events.push('SELECT A DOOR FIRST');break;}
          targeting.armDoorFlash(door.id);
          config.doorFocusId=null;config.doorMenuDismissedId=door.id;break;
      }
      const failed=config.state.events.length>beforeErrors;
      completeAction(
        door?doorCenter(door):node?.p??a.p,
        failed?config.state.events.at(-1)??'ACTION BLOCKED':null,
        button.querySelector('.command-label')?.textContent??'',
        isFailure=>config.audio.uiClickTone(isFailure?'warning':'command'));
      config.updateHud();
    };
    config.ui.context.addEventListener('click',handleContextAction);
    config.ui.quickStates.addEventListener('click',handleContextAction);
  }
  let shortcutsBound=false;
  function bindShortcuts(config:TacticalShortcutPorts):void{
   if(shortcutsBound)return;
   shortcutsBound=true;
   window.addEventListener('keydown',e=>{
     // Global game shortcuts must never fire while the player edits a name,
     // operates a dialog, or navigates Campaign / the front menu.
     if(e.isComposing||e.altKey||config.getMode()==='menu'||config.getMode()==='home')return;
     if(document.querySelector('.fw-confirm-backdrop')||config.isQuickConfiguring())return;
     const target=e.target;
     // Escape is handled before the usual input guard so a focused replay
     // range/button can dismiss its panel; native select popups keep Escape.
     if(config.isReplaying()&&e.code==='Escape'&&
        !(target instanceof HTMLSelectElement)&&
        !(target instanceof HTMLElement&&target.closest(
          '[role="dialog"],[role="alertdialog"],textarea,[contenteditable="true"]'))){
       e.preventDefault();
       if(!config.ui.replayClusterMenu.hidden)config.replayAnalysisUi.closeReplayCluster();
       else if(config.replayAnalysisUi.replayToolTab!==null)config.replayAnalysisUi.closeReplaySurface();
       else config.exitReplay();
       return;
     }
     if(target instanceof HTMLElement&&
       (target.isContentEditable||target.closest(
         'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]'
       )))return;
     if(config.isReplaying()){
       if(e.code==='Space'&&!e.repeat&&!(
         target instanceof HTMLElement&&target.closest('button,[role="button"]'))){
         e.preventDefault();config.replayTimeline.togglePlay();
       }
       if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&!(
         target instanceof HTMLElement&&target.closest('button,summary,[role="button"]'))){
         e.preventDefault();
         const direction:-1|1=e.code==='ArrowLeft'?-1:1;
         if(e.ctrlKey||e.metaKey)config.replayAnalysisUi.jumpEvent(direction>0);
         else if(e.shiftKey){config.replayPlayback.pause();config.seekReplay(config.replayPlayback.time+direction);}
         else config.replayTimeline.step('frame',direction);
       }
       return;
     }
     if(e.code==='Space'&&!e.repeat){
       e.preventDefault();config.onExecute();
     }
     if(e.code==='Digit1')config.selectUnit('rook');
     if(e.code==='Digit2')config.selectUnit('moss');
     if(e.code==='Digit3')config.selectUnit('ash');
     if(e.code==='Digit4')config.selectUnit('vale');
     if(e.code==='KeyX'&&!e.repeat){
       e.preventDefault();
       // Keyboard and touch must use the exact same guarded clear-plan workflow.
       config.ui.clear.click();
     }
     if(e.code==='KeyL')config.armFacing('look');
     if(e.code==='Backspace'&&!e.repeat){
       e.preventDefault();config.ui.back.click();
     }
     if(e.code==='Escape'){
       e.preventDefault();
       if(!config.weaponChooser.hidden)config.hideWeaponChooser();
       else if(!config.operationsBoard.hidden)config.operationsBoard.hidden=true;
       else if(!config.ui.briefingPanel.hidden){
         config.ui.briefingClose.click();
       }else if(!config.ui.siteSettings.hidden){
         config.ui.siteSettingsToggle.click();
       }else config.cancelTargeting();
       return;
     }
     if(e.code==='KeyW'&&!e.repeat)config.armFacing('watch');
     if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
       e.preventDefault();
       config.onUndoRedo(e.shiftKey);
     }
     if(e.code==='KeyR'&&!e.repeat&&config.getMode()!=='mission'){
       e.preventDefault();
       config.ui.restart.click();
     }
     if(e.code==='KeyV'&&!e.repeat)config.cameraMode(config.getViewMode()==='iso'?'top':'iso');
     if(e.code==='KeyQ'&&!e.repeat)config.turnCamera(-Math.PI/8);
     if(e.code==='KeyE'&&!e.repeat)config.turnCamera(Math.PI/8);
     if(e.code==='Digit0'&&!e.repeat)config.ui.cameraFit.click();
   });
  }
  return {feedback,get facing(){return targeting.facing;},
    showHelp,teach,discoverAction,toggleFacing,
    message,renderGuidance,renderQuickStates,rejectAttempt,completeAction,
    renderTargetMode,renderPhase,renderOperatorCard,renderNotice,renderSession,bindShortcuts,bindContextActions,resetNotices};
}
