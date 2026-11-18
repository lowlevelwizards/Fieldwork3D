/** Authoritative contextual command mutations, independent of button DOM.
 * Input gestures and target-mode arming remain in the application; gameplay
 * legality remains delegated to breach-game, not revalidated here.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,plannedControl,finalPoint,
 setFirePolicy,planCivilianInteraction,planCivilianRelease,planSuspectChallenge,
 inSight,team,enemies,
 planCasualtyTransport,planWaitAt,setWaitDuration,setNodeControl,
 posture,setStartPace,planReloadAt,planMedicalTreatment,
 planNearbyInteraction,planSitePowerControl,removeActiveWatch,deletePlanNode,
 doorAtNode,planEntryTool,liveVisibility,resumeInterruptedDoorPlan,
 resumeInterruptedSquadEntry} from './breach-game.ts';
import type {EntryTool} from './breach-entry-tools.ts';
import {SUSPECT_CHALLENGE_RANGE} from './breach-suspect-compliance.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';

export type ContextCommandResult={
 handled:boolean;outcome?:'accepted'|'rejected';failureReason?:string;
 clearDoorFocus?:boolean;dismissDoorId?:string|null;
 clearSelection?:boolean;invalidateFog?:boolean;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function dispatchTacticalContextCommand(input:{
 state:Session;selected:string;actor:TeamActor;
 node:TeamActor['plan'][number]|undefined;door:Door|undefined;
 selectedActiveWatch:boolean;action:string;
 medicalCandidate:(at:Pt)=>TeamActor|null
}):ContextCommandResult{
 const {state,selected,actor:a,node,door,action}=input;
 const current=plannedControl(state,selected,node?.id);
 // Command rules remain authoritative. Keep the old event-log messages, but
 // never infer acceptance from whether another system happened to log text.
 const finish=(accepted:boolean,failureReason:string,
   options:Partial<ContextCommandResult>={}):ContextCommandResult=>{
   if(!accepted)state.events.push(failureReason);
   return {handled:true,outcome:accepted?'accepted':'rejected',
     ...(!accepted?{failureReason}:{}),...options};
 };
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
   const target=enemies(state).filter(e=>e.health>0&&
      distance(from,e.p)<SUSPECT_CHALLENGE_RANGE&&
      team(state).some(observer=>inSight(observer,e,state))&&
      sweptBodyClear(from,e.p,state.doors,5.5,sessionWorldGeometry(state)))
     .sort((x,y)=>distance(from,x.p)-distance(from,y.p))[0];
   return finish(!!target&&planSuspectChallenge(state,selected,target.id),
     'SUSPECT CHALLENGE NOT AVAILABLE');
  }
  case 'ctxSecureCivilian':
  case 'ctxFollowCivilian':{
   const civ=state.civilians.filter(c=>c.health>0&&
    liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0];
   const mode=action==='ctxSecureCivilian'?'secure':'follow';
   return finish(!!civ&&planCivilianInteraction(state,selected,civ.id,mode),
     'CIVILIAN INTERACTION NOT REACHABLE');
  }
  case 'ctxReleaseCivilian':
   return finish(planCivilianRelease(state,selected),
     'NO CIVILIAN TRANSPORT TO RELEASE');
  case 'ctxDragCivilian':
  case 'ctxCarryCivilian':{
   const civ=state.civilians.filter(c=>c.health<=0&&
    (!c.carriedById||c.carriedById===a.id)&&
    liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0];
   return finish(!!civ&&planCasualtyTransport(state,selected,civ.id,
     state.scenario.extract,action==='ctxCarryCivilian'?'carry':'drag'),
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
  case 'ctxReload':
   return finish(planReloadAt(state,selected,node?.id),
     'CANNOT PLAN RELOAD');
  case 'ctxTreat':{
   const patient=input.medicalCandidate(node?.p??finalPoint(a));
   return finish(!!patient&&
     planMedicalTreatment(state,selected,patient.id,node?.id),
     'NO REACHABLE PATIENT WITH SUITABLE SUPPLIES');
  }
  case 'ctxWindow':{
   const at=node?.p??finalPoint(a);
   let nearby:typeof state.windows[number]|undefined;
   let best=54*54;
   for(const w of state.windows){
     if(!w.operable||w.shattered)continue;
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
