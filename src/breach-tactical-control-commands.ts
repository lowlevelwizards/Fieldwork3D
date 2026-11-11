/** Domain-owned tactical control edits. This module only edits authored
 * fields through the existing atomic edit path. It never advances the motor. */
import type {Session,Posture} from './breach-game.ts';
import {edit} from './breach-plan-authoring.ts';
import {party,canEdit} from './breach-session-selectors.ts';

const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

export function setWaitDuration(s:Session,id:string,nodeId:number,seconds:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='wait'||!canEdit(s))return false;
  return edit(s,a,()=>{node.duration=clamp(seconds,.3,6);});
}

export function setNodeControl(s:Session,id:string,nodeId:number,
  field:'postureState'|'paceState',value:'stand'|'crouch'|'walk'|'run'){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||!canEdit(s))return false;
  return edit(s,a,()=>{Object.assign(node,{[field]:value});});
}

export function setStartPace(s:Session,id:string,pace:'walk'|'run'){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.pace=pace;});
}

export function plannedControl(s:Session,id:string,nodeId?:number){
  const a=party(s,id);if(!a)return {posture:'stand' as Posture,
    pace:'walk' as const};
  let posture=a.posture,pace=a.pace;
  if(nodeId===undefined)return {posture,pace};
  for(const node of a.plan){
    if(node.postureState)posture=node.postureState;
    if(node.paceState)pace=node.paceState;
    if(node.id===nodeId)break;
  }
  return {posture,pace};
}

export function setMoveSprint(s:Session,id:string,nodeId:number){
  const a=party(s,id),node=a?.plan.find(n=>n.id===nodeId);
  if(!a||!node||node.kind!=='move'||!canEdit(s))return false;
  return edit(s,a,()=>{
    node.moveMode=node.moveMode==='sprint'?'advance':'sprint';
  });
}

export function toggleWeaponLight(s:Session,id:string):boolean{
 const a=party(s,id);
 if(!a||s.phase!=='planning'&&s.phase!=='running'||
  a.weaponConfiguration?.slots.light!=='light-compact')return false;
 a.weaponLightOn=!a.weaponLightOn;
 return true;
}

export function toggleContactRule(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.haltOnContact=!a.haltOnContact;});
}

export function posture(s:Session,id:string){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  return edit(s,a,()=>{a.posture=a.posture==='stand'?'crouch':'stand';});
}
