import {hardCoveringBlocksPaneContact} from './breach-window-covering-physical.ts';
import {isCoveringAction} from './breach-window-covering-interaction.ts';
import {planWindowCovering} from './breach-game.ts';
import {assessTacticalAction} from './breach-action-assessment.ts';
import {captureVitalStatus} from './breach-capture-vitals.ts';
/** Authoritative contextual command mutations, independent of button DOM.
 * Input gestures and target-mode arming remain in the application; gameplay
 * legality remains delegated to breach-game, not revalidated here.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,plannedControl,finalPoint,
 setFirePolicy,planCivilianInteraction,planCivilianRelease,planSuspectChallenge,planSuspectRestraint,planSearchSuspect,planSecureDroppedFirearm,planSuspectEscort,
 inSight,team,enemies,
 planCasualtyPickup,planCaptureTransportRelease,planWaitAt,setWaitDuration,setNodeControl,
 posture,setStartPace,planReloadAt,planSwitchWeaponAt,planMedicalTreatment,
 planNearbyInteraction,planSitePowerControl,removeActiveWatch,deletePlanNode,
 doorAtNode,planEntryTool,planStackTeam,planSquadEntry,canEdit,
 liveVisibility,resumeInterruptedDoorPlan,
 resumeInterruptedSquadEntry} from './breach-game.ts';
import type {EntryTool} from './breach-entry-tools.ts';
import {SUSPECT_CHALLENGE_RANGE,SUSPECT_ESCORT_VOICE_RANGE}
 from './breach-suspect-compliance.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {nearestContextCivilian} from './breach-civilian-context-selection.ts';
import {PERSON_CONTACT_REACH} from './breach-person-contact-standpoint.ts';
import {medicalTreatmentChoices} from './breach-medical-target-choices.ts';
import {plannedSecondaryHand} from './secondary-switching.ts';
import {selectedDoorStackFormation,cycleDoorStackFormation}
 from './breach-stack-formation-selection.ts';

export type ContextCommandResult={
 handled:boolean;outcome?:'accepted'|'rejected';failureReason?:string;
 clearDoorFocus?:boolean;dismissDoorId?:string|null;
 clearSelection?:boolean;invalidateFog?:boolean;
 /** Arms player-directed route placement; it does not silently extract. */
 armTransport?:{patientId:string;mode:'drag'|'carry'};
};
import {projectedTransportPatient,transportContextAllowed} from './breach-transport-controls.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function dispatchTacticalContextCommand(input:{
 state:Session;selected:string;actor:TeamActor;
 node:TeamActor['plan'][number]|undefined;door:Door|undefined;
 selectedActiveWatch:boolean;action:string;personFocusId?:string|null;
 medicalCandidate:(at:Pt)=>TeamActor|null
}):ContextCommandResult{
 const {state,selected,actor:a,node,door,action}=input;
 const focusedEnemies=enemies(state).filter(e=>!input.personFocusId||e.id===input.personFocusId);
 const focusedCivilians=state.civilians.filter(c=>!input.personFocusId||c.id===input.personFocusId);
 const current=plannedControl(state,selected,node?.id);
 // Command rules remain authoritative. Keep the old event-log messages, but
 // never infer acceptance from whether another system happened to log text.
 const finish=(accepted:boolean,failureReason:string,
   options:Partial<ContextCommandResult>={}):ContextCommandResult=>{
   if(!accepted)state.events.push(failureReason);
   return {handled:true,outcome:accepted?'accepted':'rejected',
     ...(!accepted?{failureReason}:{}),...options};
 };
 if(projectedTransportPatient(a.carryingId,a.plan)&&!transportContextAllowed(action))
   return finish(false,'HANDS OCCUPIED · SET DOWN CASUALTY FIRST');
 if(action.startsWith('ctxTreat:')){
  const patientId=action.slice('ctxTreat:'.length);
  const at=node?.p??finalPoint(a);
  const permitted=medicalTreatmentChoices(state,a,at)
    .some(patient=>patient.id===patientId&&patient.canTreat);
  return finish(permitted&&planMedicalTreatment(state,selected,patientId,node?.id),
    'PATIENT STABLE, UNREACHABLE, OR TREATMENT SUPPLIES UNAVAILABLE');
 }
 if(action.startsWith('ctxCovering:')){
  const [,method,...id]=action.split(':');
  return finish(isCoveringAction(method)&&planWindowCovering(state,selected,id.join(':'),method,node?.id),
    'COVERING LOCKED, UNKNOWN OR OUT OF REACH');
 }
 if(action.startsWith('ctxPower:')){
  const parts=action.split(':');
  const on=parts[1]==='on';
  const off=parts[1]==='off';
  const controlId=parts.slice(2).join(':');
  return finish((on||off)&&
    planSitePowerControl(state,selected,controlId,on,node?.id),
    'POWER CONTROL NOT REACHABLE OR ALREADY SET');
 }
 if(door&&action.startsWith('ctxTool-')){
  const method=action.slice('ctxTool-'.length) as EntryTool;
  const nearNode=node&&distance(node.p,doorCenter(door))<=43;
  return finish(planEntryTool(state,selected,door.id,method,
    nearNode?node.id:undefined),
    'EQUIPPED TOOL CANNOT OPERATE THIS DOOR',
    {clearDoorFocus:true,dismissDoorId:door.id});
 }
 switch(action){
  case 'ctxFormationCycle':
   return finish(!!door&&canEdit(state)&&
     !!cycleDoorStackFormation(state,door.id),
     'CHOOSE A KNOWN DOOR WHILE PLANNING');
  case 'ctxStackTeam':
   return finish(!!door&&planStackTeam(state,door.id,
     selectedDoorStackFormation(state,door?.id??'')),
     'NO PHYSICALLY REACHABLE STACK POSITIONS');
  case 'ctxSquadEntry':
   return finish(!!door&&planSquadEntry(state,door.id,
     selectedDoorStackFormation(state,door?.id??'')),
     'SQUAD ENTRY BLOCKED · CHECK DOOR AND TEAM ROUTES');
  case 'ctxResumeEntry':
   return finish(resumeInterruptedDoorPlan(state,selected),
     'ENTRY STILL BLOCKED · RESOLVE DOOR BEFORE RESUMING');
  case 'ctxResumeSquad':
   return finish(resumeInterruptedSquadEntry(state,selected),
     'SQUAD ENTRY STILL BLOCKED · CHECK EACH OPERATOR');
  case 'ctxFire':{
   const active=node?.firePolicyState??a.firePolicy;
   const policy=active==='engage'?'hold':
     active==='hold'?'return':'engage';
   return finish(setFirePolicy(state,selected,policy,node?.id),
     'FIRE POLICY NOT AVAILABLE');
  }
  case 'ctxChallengeSuspect':{
   const from=finalPoint(a);
   const target=focusedEnemies.filter(e=>e.health>0&&
      !e.surrendered&&distance(from,e.p)<SUSPECT_CHALLENGE_RANGE&&
      assessTacticalAction({
        action:'challenge-suspect',phase:'selection',
        actorAvailable:true,targetAvailable:true,domainEligible:true,
        requireObserved:true,
        observed:team(state).some(observer=>inSight(observer,e,state)),
        distance:distance(from,e.p),maximumRange:SUSPECT_CHALLENGE_RANGE,
        unobstructed:sweptBodyClear(from,e.p,state.doors,1.5,
          sessionWorldGeometry(state))
      }).allowed)
     .sort((x,y)=>distance(from,x.p)-distance(from,y.p))[0];
   return finish(!!target&&planSuspectChallenge(state,selected,target.id),
     'SUSPECT CHALLENGE NOT AVAILABLE');
  }
  case 'ctxRestrainSuspect':{
   const at=finalPoint(a);
   const target=focusedEnemies.filter(e=>e.health>0&&e.surrendered&&
     !e.restrained&&assessTacticalAction({
       action:'restrain-suspect',phase:'selection',
       actorAvailable:true,targetAvailable:true,domainEligible:true,
       requireObserved:true,observed:liveVisibility(state,e.p),
       distance:distance(at,e.p),maximumRange:PERSON_CONTACT_REACH,
       unobstructed:sweptBodyClear(at,e.p,state.doors,1.5,
         sessionWorldGeometry(state))
     }).allowed)
     .sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0];
   return finish(!!target&&planSuspectRestraint(state,selected,target.id),
     'COMPLIANT SUSPECT NOT IN PHYSICAL REACH');
  }
  case 'ctxSearchSuspect':{
   const at=finalPoint(a);
   const target=focusedEnemies.filter(e=>e.health>0&&e.surrendered&&
     e.restrained===true&&!e.suspectSearched&&
     assessTacticalAction({
       action:'search-suspect',phase:'selection',
       actorAvailable:true,targetAvailable:true,domainEligible:true,
       requireObserved:true,observed:liveVisibility(state,e.p),
       distance:distance(at,e.p),maximumRange:34,
       unobstructed:sweptBodyClear(at,e.p,state.doors,1.5,
         sessionWorldGeometry(state))
     }).allowed)
     .sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0];
   return finish(!!target&&planSearchSuspect(state,selected,target.id),
     'RESTRAINED SUSPECT NOT REACHABLE');
  }
  case 'ctxSecureFirearm':{
   const at=finalPoint(a);
   const item=state.droppedFirearms.filter(w=>w.status==='loose'&&
     assessTacticalAction({
       action:'secure-firearm',phase:'selection',
       actorAvailable:true,targetAvailable:true,domainEligible:true,
       requireObserved:true,observed:liveVisibility(state,w.p),
       distance:distance(at,w.p),maximumRange:58,
       unobstructed:sweptBodyClear(at,w.p,state.doors,1.5,
         sessionWorldGeometry(state))
     }).allowed)
     .sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0];
   return finish(!!item&&planSecureDroppedFirearm(state,selected,item.id),
     'LOOSE FIREARM NOT REACHABLE');
  }
  case 'ctxEscortSuspect':
  case 'ctxStopEscortSuspect':{
   const at=finalPoint(a),stopping=action==='ctxStopEscortSuspect';
   const candidate=focusedEnemies.filter(e=>e.health>0&&
     e.surrendered&&
     (stopping?!!e.escortLeaderId:e.escortLeaderId!==a.id)&&
     assessTacticalAction({
       action:stopping?'stop-escorting-suspect':'escort-suspect',
       phase:'selection',
       actorAvailable:true,targetAvailable:true,domainEligible:true,
       requireObserved:!stopping,
       observed:stopping||liveVisibility(state,e.p),
       distance:distance(at,e.p),maximumRange:SUSPECT_ESCORT_VOICE_RANGE,
       unobstructed:sweptBodyClear(at,e.p,state.doors,1.5,
         sessionWorldGeometry(state))
     }).allowed)
     .sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0];
   return finish(!!candidate&&planSuspectEscort(state,selected,
     candidate.id,stopping?'stop':'escort'),
     'SURRENDERED SUSPECT OUT OF SPEAKING RANGE');
  }
  case 'ctxSecureCivilian':
  case 'ctxFollowCivilian':
  case 'ctxStopFollowingCivilian':
  case 'ctxRestrainCivilian':{
   const mode=action==='ctxSecureCivilian'?'secure':
     action==='ctxFollowCivilian'?'follow':
     action==='ctxStopFollowingCivilian'?'stop-following':'restrain';
   const civ=nearestContextCivilian(focusedCivilians,finalPoint(a),
     mode,state.mission,p=>liveVisibility(state,p),
     (from,to)=>sweptBodyClear(from,to,state.doors,
       mode==='follow'||mode==='stop-following'?1.5:5.5,
       sessionWorldGeometry(state)));
   return finish(!!civ&&planCivilianInteraction(state,selected,civ.id,mode),
     'CIVILIAN INTERACTION NOT REACHABLE');
  }
  case 'ctxReleaseCivilian':
   return finish(planCivilianRelease(state,selected),
     'NO CIVILIAN TRANSPORT TO RELEASE');
  case 'ctxReleaseCapture':
    return finish(planCaptureTransportRelease(state,selected),
      'NO INCAPACITATED CAPTURE TARGET IN TRANSPORT');
   case 'ctxDragCapture':
  case 'ctxCarryCapture':{
   const at=finalPoint(a);
   const prisoner=state.operators.filter(e=>e!==a&&
      (!input.personFocusId||e.id===input.personFocusId)&&
      e.health<=0&&captureVitalStatus(e)!=='deceased'&&!e.carriedById&&
      distance(at,e.p)<34&&(e.side===a.side||liveVisibility(state,e.p))&&
      sweptBodyClear(at,e.p,state.doors,5.5,sessionWorldGeometry(state)))
      .sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0];
   return finish(!!prisoner&&planCasualtyPickup(state,selected,prisoner.id,
      action==='ctxCarryCapture'?'carry':'drag'),'CASUALTY NOT IN PHYSICAL REACH');

  }
  case 'ctxDragCivilian':
  case 'ctxCarryCivilian':{
   const civ=focusedCivilians.filter(c=>c.health<=0&&
    (!c.carriedById||c.carriedById===a.id)&&
    liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0];
   return finish(!!civ&&planCasualtyPickup(state,selected,civ.id,
     action==='ctxCarryCivilian'?'carry':'drag'),
     'CIVILIAN TRANSPORT ROUTE NOT AVAILABLE');
  }
  case 'ctxWait':
   return finish(node?.kind==='wait'?
     setWaitDuration(state,selected,node.id,1):
     planWaitAt(state,selected,1,node?'end':'here',node?.id),
     'WAIT ORDER NOT AVAILABLE');
  case 'ctxStance':{
   const value=current.posture==='stand'?'crouch':'stand';
   return finish(node?
     setNodeControl(state,selected,node.id,'postureState',value):
     posture(state,selected),'STANCE CHANGE NOT AVAILABLE',
     {invalidateFog:true});
  }
  case 'ctxPace':{
   const value=current.pace==='walk'?'run':'walk';
   return finish(node?
     setNodeControl(state,selected,node.id,'paceState',value):
     setStartPace(state,selected,value),'PACE CHANGE NOT AVAILABLE');
  }
  case 'ctxSwitchWeapon':{
   const active=plannedSecondaryHand(a.secondarySwitch,a.plan,node?.id);
   const next=active==='primary'?'secondary':'primary';
   return finish(planSwitchWeaponAt(state,selected,next,node?.id),
     next==='secondary'?'NO ISSUED PISTOL TO DRAW':'HOLSTER ORDER UNAVAILABLE');
  }
  case 'ctxReload':
   return finish(planReloadAt(state,selected,node?.id),
     'CANNOT PLAN RELOAD');
  case 'ctxTreat':{
   const patient=input.medicalCandidate(node?.p??finalPoint(a));
   return finish(!!patient&&
     planMedicalTreatment(state,selected,patient.id,node?.id),
     'NO REACHABLE PATIENT WITH SUITABLE SUPPLIES');
  }
  case 'ctxBreakGlass':
   return finish(planNearbyInteraction(state,selected,'break-window',node?.id),
     'NO INTACT GLASS IN REACH');
  case 'ctxWindow':{
   const at=node?.p??finalPoint(a);
   let nearby:typeof state.windows[number]|undefined;
   let best=54*54;
   for(const w of state.windows){
     if(!w.operable||w.shattered||hardCoveringBlocksPaneContact(w,at))continue;
     const dx=w.x-at.x,dy=w.y-at.y,dist=dx*dx+dy*dy;
     if(dist<best){best=dist;nearby=w;}
   }
   return finish(!!nearby&&planNearbyInteraction(state,selected,
     nearby.open?'close-window':'open-window',node?.id),
     'NO OPERABLE WINDOW IN REACH');
  }
  case 'ctxDelete':{
   const accepted=input.selectedActiveWatch?
     removeActiveWatch(state,selected):
     !!node&&deletePlanNode(state,selected,node.id);
   return finish(accepted,'SELECTED ORDER NO LONGER AVAILABLE',
     accepted?{clearSelection:true,clearDoorFocus:true}:{});
  }
  case 'ctxOpen':
  case 'ctxClose':
  case 'ctxKick':
   return finish(!!door&&doorAtNode(state,selected,door.id,
     action==='ctxOpen'?'open':action==='ctxClose'?'close':'kick',
     node&&distance(node.p,doorCenter(door))<=43?node.id:undefined),
     'DOOR NOT REACHABLE FROM THAT POINT',
     {clearDoorFocus:true,dismissDoorId:door?.id??null});
  default:return {handled:false};
 }
}
