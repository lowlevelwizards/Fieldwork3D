/** Tactical HUD presentation, guidance, LOOK/WATCH arming and feedback.
 * Takes authored orders and player-visible data as input; game modules remain
 * the only authority for command feasibility and execution.
 */
import {contextActionChoices} from './context-actions.ts';
import {TacticalFeedback,type FeedbackPoint} from './tactical-feedback.ts';
import {ContextualTeaching,resolveHudPresentation,type HudUrgency,type HudPhase}
  from './contextual-teaching.ts';
import {recoveryAdviceFor} from './recovery-guidance.ts';
import type {Session,TeamActor} from '../breach-game.ts';

export type FacingMode='look'|'watch';
export type TacticalGuidanceInput={
  replaying:boolean;phase:Session['phase'];flashMode:boolean;pushMode:boolean;
  selectedNode:number|null;selectedActiveWatch:boolean;
  firePlacement:boolean;evacMode:boolean;
  feed:HTMLElement;hint:HTMLElement;
};
export function createTacticalHudController(){
  const feedback=new TacticalFeedback();
  const facing={
    looking:false,lookMode:'look' as FacingMode,
    armedOrigin:'end' as 'here'|'end'
  };
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
  function toggleFacing(mode:FacingMode,selectedNode:number|null):boolean{
    facing.looking=!facing.looking||facing.lookMode!==mode;
    facing.lookMode=mode;
    facing.armedOrigin=selectedNode===null?'here':'end';
    return facing.looking;
  }
  function message(input:Pick<TacticalGuidanceInput,
    'replaying'|'phase'|'flashMode'|'pushMode'|'selectedActiveWatch'|'selectedNode'>){
    if(input.replaying)return 'MISSION FILM · ORBIT, PAN, ZOOM AND SCRUB FREELY';
    if(input.flashMode)return 'FLASH: tap a target, or CANCEL to back out.';
    if(input.pushMode)return 'PUSH: tap or drag a direction away from the selected object (±80°). CANCEL to exit.';
    if(input.phase==='planning'){
      if(facing.looking)return facing.lookMode==='watch'?
        'WATCH ARMED · TAP A POINT · CANCEL/BACK TO EXIT. Replaces prior WATCH; RUN or interactions end tracking.':
        'LOOK ARMED · TAP ANY DIRECTION · CANCEL/BACK TO EXIT. Replaces prior WATCH.';
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
    const targeting=facing.looking||input.flashMode||
      input.firePlacement||input.evacMode;
    const phase:HudPhase=input.replaying?'replay':
      input.phase==='planning'?(targeting?'targeting':'planning'):
      input.phase==='running'?'execution':'debrief';
    const severity=input.feed.hidden?'normal':input.feed.dataset.severity;
    const urgency:HudUrgency=severity==='warning'||severity==='contact'||
      severity==='danger'?severity:'normal';
    const presentation=resolveHudPresentation({
      phase,urgency,explicitHelp:hasHelp,coaching:!!tip,targetPrompt:targeting
    });
    document.body.dataset.hudPhase=phase;
    document.body.dataset.hudUrgency=urgency;
    input.hint.dataset.hintKind=hasHelp?'help':targeting?'target':'coach';
    input.hint.textContent=hasHelp?helpText:targeting?message(input):
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
    phase:Session['phase'];replaying:boolean;flashMode:boolean;
    firePlacement:string|null;
  }):void{
    const target=config.phase!=='planning'||config.replaying?'':facing.looking?
      facing.lookMode.toUpperCase():config.flashMode?'FLASH':
      config.firePlacement?config.firePlacement.toUpperCase():'';
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
  return {feedback,facing,showHelp,teach,discoverAction,toggleFacing,
    message,renderGuidance,renderQuickStates,rejectAttempt,completeAction,
    renderTargetMode,renderPhase};
}
