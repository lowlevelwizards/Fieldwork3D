/** Authoritative contextual command mutations, independent of button DOM.
 * Input gestures and target-mode arming remain in the application; gameplay
 * legality remains delegated to breach-game, not revalidated here.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,plannedControl,finalPoint,
 setFirePolicy,planCivilianInteraction,planCivilianRelease,
 planCasualtyTransport,planWaitAt,setWaitDuration,setNodeControl,
 posture,setStartPace,planReloadAt,planMedicalTreatment,
 planNearbyInteraction,removeActiveWatch,deletePlanNode,
 doorAtNode,planEntryTool,liveVisibility} from './breach-game.ts';
import type {EntryTool} from './breach-entry-tools.ts';

export type ContextCommandResult={
 handled:boolean;clearDoorFocus?:boolean;dismissDoorId?:string|null;
 clearSelection?:boolean;invalidateFog?:boolean;skipFeedback?:boolean;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function dispatchTacticalContextCommand(input:{
 state:Session;selected:string;actor:TeamActor;
 node:TeamActor['plan'][number]|undefined;door:Door|undefined;
 selectedActiveWatch:boolean;action:string;
 medicalCandidate:(at:Pt)=>TeamActor|null
}):ContextCommandResult{
 const {state,selected,actor:a,node,door,action}=input;
 const handled:ContextCommandResult={handled:true};
 const current=plannedControl(state,selected,node?.id);
 if(door&&action.startsWith('ctxTool-')){
  const method=action.slice('ctxTool-'.length) as EntryTool;
  const nearNode=node&&distance(node.p,doorCenter(door))<=43;
  if(!planEntryTool(state,selected,door.id,method,
      nearNode?node.id:undefined))
   state.events.push('EQUIPPED TOOL CANNOT OPERATE THIS DOOR');
  return {handled:true,clearDoorFocus:true,dismissDoorId:door.id,
   skipFeedback:true};
 }
 switch(action){
  case 'ctxFire':{
   const active=node?.firePolicyState??a.firePolicy;
   const policy=active==='engage'?'hold':
     active==='hold'?'return':'engage';
   setFirePolicy(state,selected,policy,node?.id);return handled;
  }
  case 'ctxSecureCivilian':
  case 'ctxFollowCivilian':{
   const civ=state.civilians.filter(c=>c.health>0&&
    liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0];
   const mode=action==='ctxSecureCivilian'?'secure':'follow';
   if(!civ||!planCivilianInteraction(state,selected,civ.id,mode))
    state.events.push('CIVILIAN INTERACTION NOT REACHABLE');
   return handled;
  }
  case 'ctxReleaseCivilian':
   if(!planCivilianRelease(state,selected))
    state.events.push('NO CIVILIAN TRANSPORT TO RELEASE');
   return handled;
  case 'ctxDragCivilian':
  case 'ctxCarryCivilian':{
   const civ=state.civilians.filter(c=>c.health<=0&&
    (!c.carriedById||c.carriedById===a.id)&&
    liveVisibility(state,c.p)&&distance(finalPoint(a),c.p)<34)
    .sort((x,y)=>distance(finalPoint(a),x.p)-
      distance(finalPoint(a),y.p))[0];
   if(!civ||!planCasualtyTransport(state,selected,civ.id,
       state.scenario.extract,
       action==='ctxCarryCivilian'?'carry':'drag'))
    state.events.push('CIVILIAN TRANSPORT ROUTE NOT AVAILABLE');
   return handled;
  }
  case 'ctxWait':
   if(node?.kind==='wait')setWaitDuration(state,selected,node.id,1);
   else planWaitAt(state,selected,1,node?'end':'here',node?.id);
   return handled;
  case 'ctxStance':{
   const value=current.posture==='stand'?'crouch':'stand';
   if(node)setNodeControl(state,selected,node.id,'postureState',value);
   else posture(state,selected);
   return {handled:true,invalidateFog:true};
  }
  case 'ctxPace':{
   const value=current.pace==='walk'?'run':'walk';
   if(node)setNodeControl(state,selected,node.id,'paceState',value);
   else setStartPace(state,selected,value);
   return handled;
  }
  case 'ctxReload':
   if(!planReloadAt(state,selected,node?.id))
    state.events.push('CANNOT PLAN RELOAD');
   return handled;
  case 'ctxTreat':{
   const patient=input.medicalCandidate(node?.p??finalPoint(a));
   if(!patient||!planMedicalTreatment(state,selected,patient.id,node?.id))
    state.events.push('NO REACHABLE PATIENT WITH SUITABLE SUPPLIES');
   return handled;
  }
  case 'ctxWindow':{
   const at=node?.p??finalPoint(a);
   const nearby=state.windows.filter(w=>w.operable&&!w.shattered&&
     distance(at,{x:w.x,y:w.y})<54)
     .sort((x,y)=>distance(at,{x:x.x,y:x.y})-
       distance(at,{x:y.x,y:y.y}))[0];
   if(!nearby||!planNearbyInteraction(state,selected,
     nearby.open?'close-window':'open-window',node?.id))
    state.events.push('NO OPERABLE WINDOW IN REACH');
   return handled;
  }
  case 'ctxDelete':
   if(input.selectedActiveWatch)removeActiveWatch(state,selected);
   else if(node)deletePlanNode(state,selected,node.id);
   return {handled:true,clearSelection:true,clearDoorFocus:true};
  case 'ctxOpen':
  case 'ctxClose':
  case 'ctxKick':
   if(door&&!doorAtNode(state,selected,door.id,
       action==='ctxOpen'?'open':action==='ctxClose'?'close':'kick',
       node&&distance(node.p,doorCenter(door))<=43?node.id:undefined))
    state.events.push('DOOR NOT REACHABLE FROM THAT POINT');
   return {handled:true,clearDoorFocus:true,dismissDoorId:door?.id??null};
  default:return {handled:false};
 }
}
