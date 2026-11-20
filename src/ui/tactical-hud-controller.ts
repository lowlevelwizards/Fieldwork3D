/** Tactical HUD presentation, guidance, LOOK/WATCH arming and feedback.
 * Takes authored orders and player-visible data as input; game modules remain
 * the only authority for command feasibility and execution.
 */
import {currentSiteIdentity} from './current-site-identity.ts';
import {writeDomText,writeDomAttribute,writeDomStyle} from './tactical-dom-reconciliation.ts';
import {createTacticalHudHeightSync} from './tactical-hud-height.ts';
import {compactSiteTitle} from './site-title.ts';
import {renderMissionDebrief} from './breach-mission-debrief.ts';
import {debriefPrimaryActionLabel} from './fieldwork-vocabulary.ts';
import {tacticalIcon} from './tactical-icons.ts';
import type {createBreachUiElements} from './breach-ui-elements.ts';
import type {CampaignMode} from '../breach-app-mode.ts';
import type {CampaignState} from '../campaign-state.ts';
import type {DispatchIncidentContext} from '../dispatch-incident-context.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel,rangeTrialLabel,type RangeTrial} from '../equipment-training-diagnostics.ts';
import {lightControlState} from '../equipment-weapon-light-ui.ts';
import {nvgControlState,nvgOperational} from '../equipment-night-vision.ts';
import type {ViewMode} from '../breach-3d.ts';
import {doorCenter,type Door,type Pt} from '../breach-core.ts';
import {dispatchTacticalContextCommand} from '../breach-tactical-context-command.ts';
import type {createBreachAudioController} from '../breach-audio-controller.ts';
import type {DisplayRouteCache} from '../breach-route-cache.ts';
import type {createBreachReplayAnalysisController} from './breach-replay-analysis-controller.ts';
import type {createBreachReplayTimelineController} from './breach-replay-timeline-controller.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
import {backOne,clearPlan,undoPlan,redoPlan,planWait,toggleWeaponLight,toggleNvg,equipWeaponChoice,
  planMedicalTreatment,planRecoverMedical,planReload,reloadNow,planSync,
  posture,toggleContactRule} from '../breach-game.ts';
import {captureRangeTrial} from '../equipment-training-diagnostics.ts';
import {confirmFieldworkAction} from './fieldwork-controls.ts';
import {contextActionChoices} from './context-actions.ts';
import {plannedSecondaryHand} from '../secondary-switching.ts';
import {selectAccessibleSecondaryMagazine} from '../secondary-timed-reload.ts';
import {tacticalActiveAmmo} from '../tactical-active-ammo.ts';
import {TacticalFeedback,type FeedbackPoint} from './tactical-feedback.ts';
import {ContextualTeaching,resolveHudPresentation,type HudUrgency,type HudPhase}
  from './contextual-teaching.ts';
import {recoveryAdviceFor} from './recovery-guidance.ts';
import {team,isSeen,missionText,operationBriefing,type Session,type TeamActor} from '../breach-game.ts';
import {injuryOf,WEAPONS} from '../breach-combat.ts';
import {magazineAlert} from '../arsenal/live-magazine-capacity.ts';
import {executionStatus} from '../breach-execution-state.ts';
import {compactExecutionStatus} from './tactical-hud-density.ts';
import {tacticalUiActionAvailability} from './tactical-command-affordances.ts';
import {ExecutionNoticeFeed,locateNoticeOrder} from './execution-feedback.ts';
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
 fieldLightButton:HTMLButtonElement|null;nvgButton:HTMLButtonElement|null;
 medicalButton:HTMLButtonElement|null;
 dragButton:HTMLButtonElement|null;carryButton:HTMLButtonElement|null;
 retrieveButton:HTMLButtonElement|null;navPanel:HTMLOutputElement|null;
 canvas:HTMLCanvasElement;auditRouteMode:boolean;viewMode:ViewMode;
 cssW:number;cssH:number;worldToScreen:(p:Pt,height?:number)=>Pt;
 displayRouteCache:DisplayRouteCache;
 reducedMotion:boolean;weaponChooser:HTMLElement;hideWeaponChooser:()=>void;
 favoriteActive:boolean;recorder:MissionRecorder;campaign:CampaignState|null;
 incident?:DispatchIncidentContext|null;operationsLogged:number;
};

/** UI-only weapon choice overlay; legality stays in equipWeaponChoice. */
export type TacticalWeaponChooserPorts={
 ui:ReturnType<typeof createBreachUiElements>;
 weaponChooser:HTMLElement;getSession:()=>Session;getSelected:()=>string;
 getMode:()=>CampaignMode;isReplaying:()=>boolean;
 collapse:()=>void;refreshHud:()=>void;
};
export type TacticalToolbarPorts={
 ui:ReturnType<typeof createBreachUiElements>;
 readonly state:Session;readonly selected:string;readonly replaying:boolean;
 selectedNode:number|null;selectedActiveWatch:boolean;doorFocusId:string|null;
 readonly weaponChooser:HTMLElement;
 audio:ReturnType<typeof createBreachAudioController>;
 showWeaponChooser:()=>void;hideWeaponChooser:()=>void;
 selectUnit:(id:string)=>void;cancelTargeting:()=>void;
 showUiHelp:(text:string,duration?:number)=>void;updateHud:()=>void;
 medicalCandidate:()=>TeamActor|null;casualtyCandidate:()=>TeamActor|null;
 invalidateFog:()=>void;
 setRangeTrial:(trial:RangeTrial|null)=>void;
 resetMission:()=>void;restartRange:()=>void;
};
export type TacticalToolbarButtons={
 light:HTMLButtonElement;nvg:HTMLButtonElement;medical:HTMLButtonElement;
 drag:HTMLButtonElement;carry:HTMLButtonElement;recover:HTMLButtonElement;
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
 isPhotoModeActive?:()=>boolean;
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
  const hudHeight=createTacticalHudHeightSync();
  // The tactical DOM is persistent between routine HUD updates. Keep the
  // mounted element while it is connected; re-resolve after screen remounts.
  // Missing optional controls are retried, never permanently cached as null.
  const mounted=<T extends Element>(selector:string,current:T|null):T|null=>
    current?.isConnected?current:document.querySelector<T>(selector);
  let rangeExit:HTMLButtonElement|null=null;
  let rangeRepeat:HTMLButtonElement|null=null;
  let siteHeader:HTMLElement|null=null;
  let siteSubheading:HTMLElement|null=null;
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
    if(document.body.dataset.hudPhase!==phase)document.body.dataset.hudPhase=phase;
    if(document.body.dataset.hudUrgency!==urgency)document.body.dataset.hudUrgency=urgency;
    const hintKind=hasHelp?'help':targetArmed?'target':'coach';
    if(input.hint.dataset.hintKind!==hintKind)input.hint.dataset.hintKind=hintKind;
    writeDomText(input.hint,hasHelp?helpText:targetArmed?message(input):
      presentation.showCoaching?(tip?.text??''):message(input));
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
    const owner=shown?actor!.id:'';
    if(quickStates.dataset.owner!==owner)quickStates.dataset.owner=owner;
    hudHeight.sync(input.tacticalHud);
    if(!shown||!actor)return;
    const index=node?actor.plan.findIndex(n=>n.id===node.id)+1:0;
    const validWaypoint=!!node&&index>0;
    const watchSelected=!validWaypoint&&input.selectedActiveWatch&&
      input.watchTargetPresent;
    // The WATCH marker selects a target to move/delete, but the state buttons
    // still act on the operator HERE; they must not pretend to edit the marker.
    const scope=validWaypoint?'WAYPOINT '+String(index).padStart(2,'0'):
      watchSelected?'HERE · WATCH SELECTED':'HERE';
    const scopeTarget=validWaypoint?
      actor.name+' at waypoint '+index:
      actor.name+' at current position';
    writeDomAttribute(quickStates,'data-scope-kind',
      validWaypoint?'waypoint':watchSelected?'watch':'operator');
    const quickScope=input.scopeElement;
    // Scope is provided by the existing HUD mount; no duplicate DOM.
    if(quickScope){
      const queue=actor.plan.length;
      writeDomText(quickScope,actor.name.toUpperCase()+' · '+scope+
        (queue?' · '+queue+' QUEUED':' · NO ORDERS')+
        (actor.aimInstruction?.mode==='track'&&actor.pace!=='run'?
          ' · WATCH ACTIVE':''));
      quickScope.title='These settings apply to '+scopeTarget+
        (watchSelected?'; the selected WATCH marker is edited on the map':'');
    }
    writeDomAttribute(quickStates,'aria-label',
      'Commands for '+scopeTarget+(watchSelected?'; WATCH marker selected':''));
    const current=input.plannedControl(validWaypoint?node?.id:undefined);
    const choices=contextActionChoices({
      door:false,node:!!node,flashRemaining:state.flashRemaining,
      posture:current.posture,pace:current.pace,
      firePolicy:node?.firePolicyState??actor.firePolicy,
      reserve:actor.reserve,magazine:actor.magazine,
      secondaryIssued:!!actor.equipment?.secondary?.weapon,
      secondaryHand:plannedSecondaryHand(actor.secondarySwitch,actor.plan,node?.id),
      secondaryReloadAvailable:!!actor.equipment?.secondary?.weapon&&
        !!selectAccessibleSecondaryMagazine(actor.equipment.secondary)
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
      const nextTitle=choice.title??choice.label;
      if(button.title!==nextTitle)button.title=nextTitle;
      input.installHelp(button);
      writeDomAttribute(button,'aria-label',
        scopeTarget+': '+choice.label+'. '+(choice.title??''));
      button.disabled=!!choice.disabled;
      if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
      else writeDomAttribute(button,'aria-pressed',String(choice.pressed));
    }
  }
  function renderTargetMode(config:{
    cancelTarget:HTMLElement;hint:HTMLElement;
    phase:Session['phase'];replaying:boolean;
  }):void{
    const target=config.phase!=='planning'||config.replaying?'':targeting.label;
    config.cancelTarget.hidden=!target;
    if(target){
      writeDomText(config.cancelTarget,'✕ CANCEL '+target);
      writeDomAttribute(config.cancelTarget,'aria-label','Cancel '+target+' targeting');
    }
    if(config.hint.dataset.targetMode!==target)config.hint.dataset.targetMode=target;
  }
  function renderPhase(config:{
    phase:Session['phase'];started:boolean;replaying:boolean;seconds:number;
    queuedOrders:number;
    phaseNode:HTMLElement;clock:HTMLElement;play:HTMLButtonElement;
    reducedMotion:boolean;
    icon:(key:string)=>SVGSVGElement;
  }):void{
    writeDomText(config.phaseNode,config.replaying?'REPLAY':
      config.phase==='planning'?(config.started?'PAUSED':'PLANNING'):
      config.phase==='running'?'EXECUTING':
      config.phase==='won'?'COMPLETE':'FAILED');
    config.phaseNode.classList.toggle('live',config.phase==='running');
    config.phaseNode.classList.toggle('done',
      config.phase==='won'||config.phase==='lost');
    const seconds=Math.floor(config.seconds);
    writeDomText(config.clock,String(Math.floor(seconds/60)).padStart(2,'0')+':'+
      String(seconds%60).padStart(2,'0'));
    const mode=config.phase==='running'?'pause':
      config.phase==='planning'?'go':'reset';
    if(config.play.dataset.mode!==mode){
      const previous=config.play.dataset.mode;
      config.play.dataset.mode=mode;
      const label=document.createElement('span');
      label.textContent=mode==='go'?'GO':mode==='pause'?'PAUSE':'RESET';
      label.className='go-label';
      config.play.replaceChildren(config.icon(mode),label);
      // The detailed, live action label is reconciled outside this branch
      // because orders change even while the button stays in GO mode.
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
    const executionAction=mode==='go'?
      (config.queuedOrders?
        'Execute plan · '+config.queuedOrders+' queued '+
          (config.queuedOrders===1?'order':'orders')+' on available operators':
        'Execute plan · no orders queued'):
      mode==='pause'?'Pause execution':'Reset encounter';
    writeDomAttribute(config.play,'aria-label',executionAction);
    writeDomAttribute(config.play,'title',executionAction);
    if(config.play.dataset.queuedOrders!==String(config.queuedOrders))
      config.play.dataset.queuedOrders=String(config.queuedOrders);
  }
  const noticeFeed=new ExecutionNoticeFeed();
  function resetNotices():void{noticeFeed.reset();}
  function renderNotice(node:HTMLElement,events:string[],phase:string,
    replaying:boolean,executionEvents:readonly import('../breach-execution-events.ts').ExecutionEvent[]):void{
    const notice=noticeFeed.update(events,phase,performance.now(),executionEvents);
    node.hidden=!notice||replaying;
    if(!notice||replaying){
      node.removeAttribute('data-notice-key');
      node.removeAttribute('data-issue-actor');
      node.removeAttribute('data-issue-order');
      node.style.pointerEvents='';
      return;
    }
    if(notice.actorId&&notice.severity==='warning'){
      node.dataset.issueActor=notice.actorId;
      node.dataset.issueOrder=String(notice.orderId??'');
      node.style.pointerEvents='auto';
    }else{
      node.removeAttribute('data-issue-actor');
      node.removeAttribute('data-issue-order');
      node.style.pointerEvents='';
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
      if(notice.actorId&&notice.severity==='warning'){
        const locate=document.createElement('button');
        locate.type='button';locate.dataset.locateIssue='';
        locate.className='fw-notice-locate';
        locate.textContent='LOCATE ORDER';
        locate.setAttribute('aria-label','Locate blocked operator and order');
        locate.style.cssText='display:block;min-height:36px;margin-top:5px;'+
          'padding:5px 10px;border:1px solid currentColor;border-radius:5px;'+
          'background:transparent;color:inherit;font:inherit;cursor:pointer';
        body.append(locate);
      }
      node.replaceChildren(label,body);
      node.dataset.noticeKey=key;
    }
    const locateButton=node.querySelector<HTMLButtonElement>('[data-locate-issue]');
    if(locateButton){
      const canEdit=phase==='planning'&&
        notice.orderId!==null&&notice.orderId!==undefined;
      writeDomText(locateButton,canEdit?'LOCATE ORDER':'LOCATE OPERATOR');
      writeDomAttribute(locateButton,'aria-label',canEdit?
        'Locate blocked waypoint for editing':
        'Locate affected operator; pause before editing a blocked order');
    }
    node.dataset.severity=notice.severity;
    node.classList.toggle('critical',notice.severity==='danger');
  }
  function renderOperatorCard(input:{
    state:Session;replaying:boolean;selected:string;id:string;
    actor:TeamActor|undefined;peers:TeamActor[];button:HTMLButtonElement;
    ammo:HTMLElement;hp:HTMLElement;
    paintAccent:(element:HTMLElement,id:string)=>void;
  }):void{
    const {state,replaying,selected,id,button,ammo,hp}=input;
    const a=input.actor;
    // Read-only authoring status: the count belongs to the actual operator
    // plan, never a predicted or reconstructed navigation route.
    const queued=a?.plan.length??0;
    if(button.dataset.planCount!==String(queued))
      button.dataset.planCount=String(queued);
    input.paintAccent(button,id);
    button.hidden=!a;
    const title=button.querySelector('strong');
    if(title&&a)writeDomText(title,a.name);
    button.classList.toggle('selected',id===selected);
    button.classList.toggle('down',!a||a.health<=0);
    const ammunition=a?tacticalActiveAmmo(a):null;
    const capacity=ammunition?.capacity??0;
    const shownLoaded=ammunition?.loaded??0;
    const shownSpare=ammunition?.reserve??0;
    const reloading=ammunition?.reloading??false;
    const buttonTitle=a?ammunition!.label+' • '+
      injuryOf(a.injuryStage).toUpperCase():'NO OPERATOR';
    if(button.title!==buttonTitle)button.title=buttonTitle;
    button.classList.toggle('loading',reloading);
    writeDomStyle(button,'--reload-progress',
      Math.round((ammunition?.reloadProgress??0)*100)+'%');
    const alert=a?magazineAlert(shownLoaded,capacity):'normal';
    if(ammo.dataset.ammo!==alert)ammo.dataset.ammo=alert;
    writeDomText(ammo,a?(ammunition?.hand==='secondary'?'9MM ':'')+
      String(shownLoaded).padStart(2,'0')+' / '+shownSpare+
      (reloading?' ↻':''):'--');
    ammo.title=ammunition?(ammunition.hand==='secondary'?
      'SECONDARY · ':'PRIMARY · ')+shownLoaded+' / '+capacity+
      ' loaded · '+shownSpare+' reserve rounds'+
      (ammunition.hand==='secondary'?' · '+ammunition.spareMagazines+
        ' carried magazines':''):'';
    writeDomAttribute(button,'aria-pressed',String(id===selected));
    writeDomText(hp,!a?'--':a.health<=0?'DOWN':
      a.injuryStage===2?'HEAVY':a.injuryStage===1?'HURT':'OK');
    const condition=!a?'missing':a.health<=0?'down':
      a.injuryStage===2?'heavy':a.injuryStage===1?'hurt':'healthy';
    const fill=condition==='down'?0:condition==='heavy'?34:
      condition==='hurt'?67:100;
    writeDomStyle(button,'--health-fill',fill+'%');
    writeDomStyle(button,'--health-color',
      condition==='heavy'?'#c77f68':condition==='hurt'?'#d0ad76':'#91b5a5');
    if(button.dataset.condition!==condition)button.dataset.condition=condition;
    let stateLine=button.querySelector<HTMLElement>('.unit-execution');
    if(!stateLine){
      stateLine=document.createElement('span');
      stateLine.className='unit-execution';button.append(stateLine);
    }
    const execution=a?executionStatus(a,{
      phase:state.phase==='planning'&&state.started?'running':state.phase,
      doors:state.doors,peers:input.peers
    }):null;
    const status=compactExecutionStatus(execution,{
      selected:id===selected,
      phase:state.phase==='running'?'execution':
        state.phase==='planning'?'planning':
        replaying?'replay':'debrief',
      down:!a||a.health<=0
    });
    stateLine.hidden=!status.visible;
    writeDomText(stateLine,status.label);
    const executionKind=execution?.kind??'idle';
    if(stateLine.dataset.kind!==executionKind)stateLine.dataset.kind=executionKind;
    if(stateLine.dataset.priority!==status.priority)stateLine.dataset.priority=status.priority;
    if(button.dataset.executionVisible!==String(status.visible))
      button.dataset.executionVisible=String(status.visible);
    stateLine.title=execution?.waitingFor?
      status.detail+' · WAITING FOR '+execution.waitingFor.toUpperCase():
      status.detail;
    if(execution?.progress!==undefined){
      stateLine.dataset.progress='true';
      writeDomStyle(stateLine,'--execution-progress',
        Math.round(execution.progress*100)+'%');
    }else{
      stateLine.removeAttribute('data-progress');
      stateLine.style.removeProperty('--execution-progress');
    }
    writeDomAttribute(button,'aria-label',a?
      a.name+', '+condition+', '+
      (ammunition?.hand==='secondary'?'Glock 9 millimeter':'primary')+
      ', '+shownLoaded+' of '+capacity+
      ' rounds loaded, '+shownSpare+' reserve'+(reloading?', reloading':'')+
      '. '+queued+' queued '+(queued===1?'order':'orders')+
      '. '+(execution?.label??'IDLE')+'. '+(execution?.detail??''):
      id+', unavailable');
  }
  function renderSession(input:TacticalSessionPresentation):void{
    const {state,mode,replaying,selected,selectedNode,selectedActiveWatch,ui,
      siteIdentityOutput,rangeTelemetry,lastRangeTrial,medicalCandidate,casualty,
      paletteTether,paintOperatorAccent,colorFor,fieldLightButton,nvgButton,
      medicalButton,dragButton,carryButton,retrieveButton,navPanel,
      canvas,auditRouteMode,viewMode,cssW,cssH,worldToScreen,displayRouteCache,
      reducedMotion,weaponChooser,hideWeaponChooser,favoriteActive,
      recorder,campaign,incident,operationsLogged}=input;
    // One read-only squad snapshot per HUD reconciliation, never a second
    // simulation or movement authority.
    const friendly=team(state);

  ui.quickPlaySetup.hidden=mode!=='quick'||replaying;
  const identity=currentSiteIdentity(state.site,mode==='quick');
  if(siteIdentityOutput.textContent!==identity.text)
    siteIdentityOutput.textContent=identity.text;
  if(identity.seed!==null&&siteIdentityOutput.dataset.siteSeed!==identity.seed)
    siteIdentityOutput.dataset.siteSeed=identity.seed;
  else if(identity.seed===null&&siteIdentityOutput.dataset.siteSeed!==undefined)
    delete siteIdentityOutput.dataset.siteSeed;
  const telemetry=activeRangeDiagnostic(state,selected);
  rangeTelemetry.hidden=!telemetry;
  if(telemetry){
   const line=rangeDiagnosticLabel(telemetry)+
    (lastRangeTrial?'\n'+rangeTrialLabel(lastRangeTrial):'');
   if(rangeTelemetry.textContent!==line)rangeTelemetry.textContent=line;
  }
  rangeExit=mounted('[data-equipment-range-exit]',rangeExit);
  if(rangeExit)rangeExit.hidden=!state.site?.training;
  rangeRepeat=mounted('[data-range-repeat]',rangeRepeat);
  if(rangeRepeat)rangeRepeat.hidden=!state.site?.training;
  paintOperatorAccent(ui.quickStates,selected);
  paintOperatorAccent(ui.context,selected);
  paintOperatorAccent(paletteTether,selected);
  if(medicalButton){
   const patient=medicalCandidate();
   medicalButton.disabled=!patient||state.phase!=='planning'||replaying;
   writeDomText(medicalButton,patient?'TREAT · '+patient.name.toUpperCase():
    'TREAT · NO SUITABLE SUPPLIES');
   writeDomAttribute(medicalButton,'aria-label',patient?
    'Plan medical stabilization for '+patient.name:'No treatable wound with available supplies');
  }
  for(const [button,mode] of [
   [dragButton,'DRAG'],[carryButton,'CARRY'],[retrieveButton,'RECOVER']
  ] as const){
   if(!button)continue;
   button.hidden=!casualty;
   button.disabled=!casualty||state.phase!=='planning'||replaying;
   writeDomText(button,casualty?mode+' · '+casualty.name.toUpperCase():mode);
  }
  if(fieldLightButton){
   const selectedActor=friendly.find(a=>a.id===selected);
   const light=lightControlState(selectedActor,state.phase,replaying);
   fieldLightButton.hidden=!light.fitted;
   if(fieldLightButton.textContent!==light.shortText)
     fieldLightButton.textContent=light.shortText;
   fieldLightButton.title=light.aria+' · F';
   writeDomAttribute(fieldLightButton,'aria-label',light.aria);
   writeDomAttribute(fieldLightButton,'aria-pressed',String(light.pressed));
   fieldLightButton.disabled=light.disabled;
   const lightBorder=light.pressed?colorFor(selected):'';
   if(fieldLightButton.style.borderColor!==lightBorder)
     fieldLightButton.style.borderColor=lightBorder;
  }
  if(nvgButton){
   const selectedActor=friendly.find(a=>a.id===selected);
   const nvg=nvgControlState(selectedActor,state.phase,replaying);
   nvgButton.hidden=!nvg.fitted;
   writeDomText(nvgButton,nvg.text);
   nvgButton.disabled=nvg.disabled;
   writeDomAttribute(nvgButton,'aria-label',nvg.aria);
   writeDomAttribute(nvgButton,'aria-pressed',String(nvg.pressed));
   nvgButton.title=nvg.aria+' · N';
  }
  // Filter only the two world canvases, not controls, labels or game data.
  // The green treatment never generates sight/fog evidence.
  document.body.classList.toggle('nvg-selected-view',
   !replaying&&nvgOperational(friendly.find(a=>a.id===selected)));
  const brief=operationBriefing(state);
  renderPhase({
    phase:state.phase,started:state.started,replaying,seconds:state.seconds,
    queuedOrders:friendly.reduce((sum,actor)=>
      sum+(actor.health>0?actor.plan.length:0),0),
    phaseNode:ui.phase,clock:ui.clock,play:ui.play,
    reducedMotion:reducedMotion,icon:tacticalIcon
  });
  const active=friendly.find(o=>o.id===selected);
  if(navPanel){
    writeDomText(navPanel,friendly.map(a=>a.name+'  '+
      a.lastBlocker.toUpperCase()+
      '  blocked '+a.blockedTime.toFixed(2)+'s\n'+
      'nav '+a.nav.length+'  orders '+a.plan.length+
      '  ('+a.p.x.toFixed(0)+','+a.p.y.toFixed(0)+')').join('\n'));
  }
  const navBlock=active?.lastBlocker??'clear';
  if(canvas.dataset.navBlock!==navBlock)canvas.dataset.navBlock=navBlock;
  // Read-only plan status for phone gesture regression tests.
  const planNodes=String(active?.plan.length??0);
  if(canvas.dataset.planNodes!==planNodes)canvas.dataset.planNodes=planNodes;
  const selectedNodeText=selectedNode===null?'':String(selectedNode);
  if(canvas.dataset.selectedNode!==selectedNodeText)
    canvas.dataset.selectedNode=selectedNodeText;
  // Explicit browser audit mode exposes ONLY already-authored friendly routes.
  // Use the actual rendered polyline, rather than guessing a touch coordinate
  // from an old screenshot or hardcoded map bounds.
  if(auditRouteMode&&active&&viewMode==='plan2d'){
    const candidates:{x:number;y:number;clearance:number}[]=[];
    let from=active.p;
    const markers=[...friendly.map(unit=>worldToScreen(unit.p,8)),
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
  writeDomAttribute(ui.stance,'aria-pressed',String(active?.posture==='crouch'));
  writeDomAttribute(ui.contact,'aria-pressed',String(active?.haltOnContact));
  const flashLabel='FLASH ×'+state.flashRemaining;
  if(ui.flash.textContent!==flashLabel)
    ui.flash.replaceChildren(tacticalIcon('flash'),document.createTextNode(flashLabel));
  renderTargetMode({
    cancelTarget:ui.cancelTarget,hint:ui.hint,
    phase:state.phase,replaying
  });
  writeDomText(ui.loadout,'WEAPON · '+(active?.weapon.toUpperCase()??'—'));

  ui.loadout.disabled=mode==='mission'||state.phase!=='planning'||replaying;
  if(ui.loadout.disabled&&!weaponChooser.hidden)hideWeaponChooser();
  const availability=tacticalUiActionAvailability({
    phase:state.phase,replaying,actorHealth:active?.health??null,
    planCount:active?.plan.length??0,
    undoCount:active?.history.undo.length??0,
    redoCount:active?.history.redo.length??0,
    flashRemaining:state.flashRemaining,
    targetingArmed:targeting.isArmed,activeWatchSelected:selectedActiveWatch
  });
  ui.flash.disabled=!availability.flash;
  ui.back.disabled=!availability.back;
  ui.clear.disabled=!availability.clear;
  ui.clear.title='Clear this operator\'s route (Undo restores it)';
  ui.undo.disabled=!availability.undo;
  ui.redo.disabled=!availability.redo;
  ui.wait.disabled=!availability.wait;
  ui.sync.disabled=!availability.sync;
  ui.debrief.hidden=replaying||mode==='training'||mode==='menu'||mode==='home'||
    (state.phase!=='won'&&state.phase!=='lost');
  ui.favoriteMission.disabled=!state.site;
  writeDomText(ui.favoriteMission,favoriteActive?
    '★ MISSION FAVORITED':'☆ FAVORITE MISSION');
  writeDomText(ui.next,debriefPrimaryActionLabel(mode));
  ui.retry.disabled=mode==='mission';
  if(!ui.debrief.hidden)renderMissionDebrief({
    ui,state,brief,recorder,campaign,campaignMode:mode,
    incident,operationsLogged:operationsLogged
  });
  for(const id of ['rook','moss','ash','vale'] as const){
    renderOperatorCard({
      state,replaying,selected,id,actor:friendly.find(o=>o.id===id),peers:friendly,
      button:ui[id],
      ammo:ui[(id+'Ammo') as 'rookAmmo'|'mossAmmo'|'ashAmmo'|'valeAmmo'],
      hp:ui[(id+'Hp') as 'rookHp'|'mossHp'|'ashHp'|'valeHp'],
      paintAccent:paintOperatorAccent
    });
  }
  // Show the site as a place, not as a raw procedural generation dump.
  siteHeader=mounted('.ident strong',siteHeader);
  siteSubheading=mounted('.ident small',siteSubheading);
  if(siteHeader)writeDomText(siteHeader,compactSiteTitle(state.site));
  if(siteSubheading)writeDomText(siteSubheading,state.site?
    friendly.length+' OPERATORS · '+
    (state.intel.mode==='floor-plan'?state.site.roomCount:'?')+' KNOWN ROOMS':
    'TACTICAL TRAINING');
  if(siteHeader){
    const siteTitle=state.site?.name??'Cutwoods';
    if(siteHeader.title!==siteTitle)siteHeader.title=siteTitle;
  }
  renderNotice(ui.feed,state.events,state.phase,replaying,state.executionEvents);
  renderGuidance({
    replaying,phase:state.phase,selectedNode,selectedActiveWatch,
    feed:ui.feed,hint:ui.hint
  });
  let visible=0;
  for(const e of state.operators)
    if(e.side==='red'&&e.health>0&&isSeen(state,e))visible++;
  writeDomText(ui.mission,(state.phase==='planning'?
      brief.code+' • ':'')+missionText(state)+
    (visible?' • '+visible+' CONTACT'+(visible===1?'':'S'):''));

  }

let weaponChooserBound=false;
function bindWeaponChooser(port:TacticalWeaponChooserPorts){
 if(weaponChooserBound)throw Error('Weapon chooser already bound');
 weaponChooserBound=true;
 const chooser=port.weaponChooser;
 function hide():void{
  chooser.hidden=true;
  port.ui.loadout.setAttribute('aria-expanded','false');
 }
 function show():void{
  const state=port.getSession(),selected=port.getSelected();
  const current=team(state).find(a=>a.id===selected);
  if(!current||port.getMode()==='mission'||state.phase!=='planning'||port.isReplaying())return;
  port.collapse();
  chooser.replaceChildren();
  const label=document.createElement('div');
  label.className='fw-weapon-chooser-title';
  label.textContent='CHOOSE WEAPON · '+current.name;
  chooser.append(label);
  for(const id of ['carbine','smg','rifle','shotgun'] as const){
   const btn=document.createElement('button');
   btn.type='button';btn.className='fw-button';
   btn.textContent=WEAPONS[id].label;
   btn.setAttribute('aria-pressed',String(id===current.weapon));
   btn.addEventListener('click',()=>{
    // Apply to the live session only; never use stale capture after restart.
    if(equipWeaponChoice(port.getSession(),port.getSelected(),id)){
     hide();port.refreshHud();
    }
   });
   chooser.append(btn);
  }
  const cancel=document.createElement('button');
  cancel.type='button';cancel.className='fw-button fw-weapon-dismiss';
  cancel.textContent='CLOSE';
  cancel.addEventListener('click',hide);
  chooser.append(cancel);
  chooser.hidden=false;
  port.ui.loadout.setAttribute('aria-expanded','true');
 }
 chooser.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();hide();port.ui.loadout.focus();}
 });
 return {hide,show};
}
  let toolbarButtons:TacticalToolbarButtons|null=null;
  function bindToolbar(port:TacticalToolbarPorts):TacticalToolbarButtons{
   if(toolbarButtons)return toolbarButtons;
   const available=()=>{
     const actor=team(port.state).find(a=>a.id===port.selected);
     return tacticalUiActionAvailability({
       phase:port.state.phase,replaying:port.replaying,
       actorHealth:actor?.health??null,
       planCount:actor?.plan.length??0,
       undoCount:actor?.history.undo.length??0,
       redoCount:actor?.history.redo.length??0,
       flashRemaining:port.state.flashRemaining,
       targetingArmed:targeting.isArmed,
       activeWatchSelected:port.selectedActiveWatch
     });
   };
   let fieldLightButton:HTMLButtonElement|null=null;
   let nvgButton:HTMLButtonElement|null=null;
   let medicalButton:HTMLButtonElement|null=null;
   let dragButton:HTMLButtonElement|null=null;
   let carryButton:HTMLButtonElement|null=null;
   let retrieveButton:HTMLButtonElement|null=null;
// Locate a blocked order without changing its authored content.
port.ui.feed.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>(
  'button[data-locate-issue]');
 if(!button||port.replaying||port.ui.feed.hidden)return;
 const actorId=port.ui.feed.dataset.issueActor;
 const raw=port.ui.feed.dataset.issueOrder;
 const located=locateNoticeOrder({
  actorId,orderId:raw?Number(raw):null
 },team(port.state));
 if(!located)return;
 port.selectUnit(located.actorId);
 const canEdit=port.state.phase==='planning';
 port.selectedNode=canEdit?located.orderId:null;
 port.showUiHelp(!canEdit?
  'OPERATOR LOCATED · PAUSE BEFORE EDITING BLOCKED ORDERS':
  located.orderId!==null?
    'BLOCKED ORDER SELECTED · EDIT OR REPLACE WAYPOINT':
    'OPERATOR LOCATED · FAILED ORDER MAY ALREADY BE CANCELLED',3200);
 port.updateHud();
});
port.ui.rook.addEventListener('click',()=>port.selectUnit('rook'));
port.ui.back.addEventListener('click',()=>{
  if(!available().back)return;
  port.audio.uiClickTone('select');
  // BACK must always escape an unfinished targeting gesture first.
  // It cannot accidentally remove an unrelated prior waypoint.
  if(targeting.isArmed){port.cancelTargeting();return;}
  if(port.selectedActiveWatch){
    port.selectedActiveWatch=false;port.updateHud();return;
  }
  // Build 076 accidentally removed this listener when slimming the HUD.
  if(backOne(port.state,port.selected)){
    port.selectedNode=null;port.doorFocusId=null;
  }
  port.updateHud();
});
port.ui.moss.addEventListener('click',()=>port.selectUnit('moss'));
port.ui.ash.addEventListener('click',()=>port.selectUnit('ash'));
port.ui.vale.addEventListener('click',()=>port.selectUnit('vale'));
port.ui.clear.addEventListener('click',async()=>{
 if(!available().clear)return;
 const session=port.state,targetId=port.selected;
 const operator=team(session).find(a=>a.id===targetId);
 const count=operator?.plan.length??0;
 if(count===0)return;
 if(count>=3&&!await confirmFieldworkAction({
   title:'Clear '+(operator?.name??'operator')+' route?',
   message:count+' queued orders will be cleared. Undo can restore the route.',
   confirmLabel:'CLEAR ROUTE',danger:true
 }))return;
 if(session!==port.state||targetId!==port.selected||!available().clear)return;
 if(clearPlan(port.state,targetId)){
   port.selectedNode=null;
   port.showUiHelp('ROUTE CLEARED · UNDO TO RESTORE',3000);
   port.audio.playOrderCue('ui.cancel');port.updateHud();
 }
});
port.ui.undo.addEventListener('click',()=>{
  if(!available().undo)return;
  if(undoPlan(port.state,port.selected)){
    port.selectedNode=null;port.audio.playOrderCue('orders.undo');
  }
  port.updateHud();
});
port.ui.redo.addEventListener('click',()=>{
  if(!available().redo)return;
  if(redoPlan(port.state,port.selected)){
    port.selectedNode=null;port.audio.playOrderCue('orders.redo');
  }
  port.updateHud();
});
port.ui.wait.addEventListener('click',()=>{
  if(!available().wait)return;
  if(planWait(port.state,port.selected,1))
    port.audio.playOrderCue('orders.wait');
  port.updateHud();
});
fieldLightButton=document.createElement('button');
fieldLightButton.type='button';fieldLightButton.className='field-light-control';
fieldLightButton.textContent='LIGHT OFF';
fieldLightButton.hidden=true;
fieldLightButton.setAttribute('aria-label','Toggle selected operator weapon light');
fieldLightButton.addEventListener('click',()=>{
 if(port.replaying)return;
 if(toggleWeaponLight(port.state,port.selected))
  port.audio.playOrderCue('equipment.flashlight_click');
 port.updateHud();
});
// Keep fitted-light controls beside the selected squad, accessible in GO
// and on touch without opening the unrelated mission settings dialog.
const tacticalBar=port.ui.tacticalHud.querySelector<HTMLElement>('.bar');
const actionCluster=tacticalBar?.querySelector('.actions');
if(actionCluster)actionCluster.before(fieldLightButton);
else tacticalBar?.append(fieldLightButton);
nvgButton=document.createElement('button');
nvgButton.type='button';nvgButton.className='field-nvg-control';
nvgButton.hidden=true;nvgButton.textContent='NVG UP';
nvgButton.setAttribute('aria-label','Toggle selected operator night vision');
nvgButton.addEventListener('click',()=>{
 if(port.replaying)return;
 if(toggleNvg(port.state,port.selected))
  port.audio.playOrderCue('equipment.flashlight_click');
 port.updateHud();
});
if(actionCluster)actionCluster.before(nvgButton);
else tacticalBar?.append(nvgButton);
const leaveRangeButton=document.createElement('button');
leaveRangeButton.type='button';leaveRangeButton.textContent='LEAVE TEST RANGE';
leaveRangeButton.dataset.equipmentRangeExit='';
leaveRangeButton.addEventListener('click',()=>{
 if(port.state.site?.training){port.setRangeTrial(null);port.resetMission();port.updateHud();}
});
port.ui.siteSettings.append(leaveRangeButton);
const rangeRepeat=document.createElement('button');
rangeRepeat.type='button';rangeRepeat.textContent='RESTART RANGE TRIAL';
rangeRepeat.dataset.rangeRepeat='';
rangeRepeat.addEventListener('click',()=>{
 if(!port.state.site?.training)return;
 port.setRangeTrial(captureRangeTrial(port.state,port.selected));
 port.restartRange();
 port.updateHud();
});
port.ui.siteSettings.append(rangeRepeat);
medicalButton=document.createElement('button');
medicalButton.type='button';
medicalButton.className=port.ui.loadout.className;
medicalButton.textContent='TREAT';
medicalButton.setAttribute('aria-label','Plan medical stabilization');
medicalButton.addEventListener('click',()=>{
 if(port.replaying||port.state.phase!=='planning')return;
 const patient=port.medicalCandidate();
 if(patient)planMedicalTreatment(port.state,port.selected,patient.id);
 port.updateHud();
});
port.ui.loadout.insertAdjacentElement('afterend',medicalButton);
function casualtyActionButton(label:string,action:(target:TeamActor)=>void){
 const button=document.createElement('button');button.type='button';
 button.className=port.ui.loadout.className;button.textContent=label;
 button.hidden=true;
 button.addEventListener('click',()=>{
  if(port.state.phase!=='planning'||port.replaying)return;
  const patient=port.casualtyCandidate();
  if(patient)action(patient);
  port.updateHud();
 });
 medicalButton!.insertAdjacentElement('afterend',button);
 return button;
}
dragButton=casualtyActionButton('DRAG',target=>{
 targeting.armEvac(target.id,'drag');
 port.showUiHelp('TAP DESTINATION FOR CASUALTY DRAG',5500);
});
carryButton=casualtyActionButton('CARRY',target=>{
 targeting.armEvac(target.id,'carry');
 port.showUiHelp('TAP DESTINATION FOR CASUALTY CARRY',5500);
});
retrieveButton=casualtyActionButton('RECOVER',target=>{
 if(!planRecoverMedical(port.state,port.selected,target.id))
  port.showUiHelp('NO ACCESSIBLE MEDICAL SUPPLY OR ROUTE');
});
port.ui.loadout.setAttribute('aria-haspopup','true');
port.ui.loadout.setAttribute('aria-expanded','false');
port.ui.loadout.addEventListener('click',()=>{
 if(port.weaponChooser.hidden)port.showWeaponChooser();
 else port.hideWeaponChooser();
});
port.ui.reload.addEventListener('click',()=>{
  if(port.state.phase==='planning')planReload(port.state,port.selected);
  else if(port.state.phase==='running'&&!reloadNow(port.state,port.selected)){
    const actor=team(port.state).find(x=>x.id===port.selected);
    if((actor?.secondarySwitch?.fraction??0)>0)
      port.showUiHelp('PAUSE TO QUEUE A PISTOL RELOAD',3200);
  }
  port.updateHud();
});
port.ui.cancelTarget.addEventListener('click',port.cancelTargeting);
port.ui.flash.addEventListener('click',()=>{
  if(!available().flash)return;
  targeting.toggleFlash();
  port.updateHud();
});
port.ui.sync.addEventListener('click',()=>{
  if(!available().sync)return;
  if(planSync(port.state))port.audio.playOrderCue('orders.sync');
  port.updateHud();
});
port.ui.stance.addEventListener('click',()=>{
  posture(port.state,port.selected);port.audio.playOrderCue('orders.stance');port.invalidateFog();port.updateHud();
});
port.ui.contact.addEventListener('click',()=>{toggleContactRule(port.state,port.selected);port.updateHud();});

   toolbarButtons={light:fieldLightButton!,nvg:nvgButton!,
     medical:medicalButton!,drag:dragButton!,
     carry:carryButton!,recover:retrieveButton!};
   return toolbarButtons;
  }
  let contextActionsBound=false;
  function bindContextActions(config:TacticalContextActionPorts):void{
    if(contextActionsBound)return;
    contextActionsBound=true;
    const handleContextAction=(event:MouseEvent)=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-action]');
      if(!button||button.disabled||config.state.phase!=='planning'||
         config.replaying||!config.actor||config.actor.health<=0)return;
      // A delayed click must still belong to the currently displayed actor.
      const surface=config.ui.context.contains(button)?
        config.ui.context:config.ui.quickStates.contains(button)?
          config.ui.quickStates:null;
      if(!surface||surface.hidden||surface.dataset.owner!==config.selected)return;
      // The current actor may be unchanged while a waypoint or door
      // selection moves underneath an old floating-menu button.
      const node=config.node;
      const door=config.doorFocusId?config.focusedDoor():undefined;
      if(surface===config.ui.context){
        const currentScope=(door?'door:'+door.id:node?'node:'+node.id:
          config.selectedActiveWatch?'active-watch':'here')+'/'+config.selected;
        if(surface.dataset.scopeKey!==currentScope)return;
      }
      const action=button.dataset.action;
      if(action)discoverAction(action,button.title);
      const a=config.actor;
      if(!a)return;
      const result=dispatchTacticalContextCommand({
        state:config.state,selected:config.selected,actor:a,node,door,action:action??'',
        selectedActiveWatch:config.selectedActiveWatch,
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
        // The command API's boolean is authoritative; an event-log append
        // is not evidence that a command failed or succeeded.
        completeAction(door?doorCenter(door):node?.p??a.p,
          result.outcome==='rejected'?
            result.failureReason??'ACTION BLOCKED':null,
          button.querySelector('.command-label')?.textContent??'',
          isFailure=>config.audio.uiClickTone(isFailure?'warning':'command'));
        config.updateHud();return;
      }
      switch(action){
        case 'ctxSuppress':
          targeting.armSuppress();
          feedback.emit('armed',node?.p??a.p,'SUPPRESS READY');
          config.audio.uiClickTone('select');config.updateHud();return;
        case 'ctxFlash':
          if(config.state.flashRemaining<=0){
            completeAction(node?.p??a.p,'NO FLASH GRENADES REMAINING','FLASH',
              isFailure=>config.audio.uiClickTone(isFailure?'warning':'command'));
          }else{
            const armed=targeting.toggleFlash();
            feedback.emit(armed?'armed':'cancel',node?.p??a.p,
              armed?'FLASH TARGET':'CANCELLED');
            config.audio.uiClickTone('select');
          }
          config.updateHud();return;
        case 'ctxLook':
          config.armFacing('look');
          if(targeting.isFacing)feedback.emit('armed',
            node?.p??a.p,'TAP A DIRECTION');
          config.audio.uiClickTone('select');return;
        case 'ctxDoor':{
          const available=config.focusedDoor();
          if(!available){
            config.state.events.push('NO KNOWN DOOR IN REACH');
            completeAction(node?.p??a.p,'NO KNOWN DOOR IN REACH','DOOR',
              isFailure=>config.audio.uiClickTone(isFailure?'warning':'command'));
            config.updateHud();return;
          }
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
          if(!door){
            config.state.events.push('SELECT A DOOR FIRST');
            completeAction(a.p,'SELECT A DOOR FIRST','FLASH',
              isFailure=>config.audio.uiClickTone(isFailure?'warning':'command'));
          }else{
            targeting.armDoorFlash(door.id);
            feedback.emit('armed',doorCenter(door),'FLASH THROUGH DOOR');
            config.doorFocusId=null;config.doorMenuDismissedId=door.id;
            config.audio.uiClickTone('select');
          }
          config.updateHud();return;
        default:
          // Unrecognized actions are not confirmation-worthy commands.
          return;
      }
    };
    config.ui.context.addEventListener('click',handleContextAction);
    config.ui.quickStates.addEventListener('click',handleContextAction);
  }
  let shortcutsBound=false;
  function bindShortcuts(config:TacticalShortcutPorts):void{
   if(shortcutsBound)return;
   shortcutsBound=true;
   window.addEventListener('keydown',e=>{
     if(config.isPhotoModeActive?.())return;
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
     if(e.code==='KeyN'&&!e.repeat&&!e.ctrlKey&&!e.metaKey){
       const nvg=config.ui.tacticalHud.querySelector<HTMLButtonElement>(
         '.field-nvg-control');
       if(nvg&&!nvg.hidden&&!nvg.disabled){e.preventDefault();nvg.click();}
     }
     if(e.code==='KeyF'&&!e.repeat&&!e.ctrlKey&&!e.metaKey){
       const light=config.ui.tacticalHud.querySelector<HTMLButtonElement>(
         '.field-light-control');
       if(light&&!light.hidden&&!light.disabled){
         e.preventDefault();light.click();
       }
     }
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
    renderTargetMode,renderPhase,renderOperatorCard,renderNotice,renderSession,bindShortcuts,bindContextActions,bindToolbar,bindWeaponChooser,resetNotices};
}
