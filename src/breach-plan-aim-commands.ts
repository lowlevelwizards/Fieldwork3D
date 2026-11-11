/** LOOK/WATCH authored instructions. Keeps the active WATCH and route
 * independent and preserves the existing atomic edit semantics. */
import type {Session,TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {type AimMode,type PlanNode,length,targetAngle} from './breach-plan.ts';
import {edit} from './breach-plan-authoring.ts';
import {party,canEdit} from './breach-session-selectors.ts';
import {addNode,finalPoint} from './breach-plan-node-commands.ts';
const d=(a:Pt,b:Pt)=>length(a,b);
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const clone=(p:Pt):Pt=>({...p});

/**
 * An aim instruction is an order, not a movement geometry.
 * Fixed holds one world heading; track continuously faces a fixed world point.
 * A selected waypoint applies its instruction on arrival, then all subsequent
 * walking inherits it until another aim instruction explicitly overrides it.
 */
export function planAim(s:Session,id:string,mode:AimMode,target:Pt,nodeId?:number,
  label:'look'|'watch'|'strafe'|'pie'=mode==='track'?'watch':'look',
  origin:'end'|'here'='end'){
  const a=party(s,id);
  if(!a||!canEdit(s)||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  const pos=node?.p??(origin==='here'?a.p:finalPoint(a));
  if(d(pos,target)<2)return false;
  const patch:Partial<PlanNode>=mode==='track'?
    {aimMode:'track',facing:undefined,aimPoint:clone(target),aimLabel:label}:
    {aimMode:mode,facing:angle(pos,target),aimPoint:undefined,aimLabel:label};
  if(node)return edit(s,a,()=>{
    node.aimMode=patch.aimMode;node.facing=patch.facing;
    node.aimPoint=patch.aimPoint;node.aimLabel=patch.aimLabel;
  });
  if(origin==='here')return edit(s,a,()=>{
    a.plan.unshift({id:s.nextId++,kind:'look',p:clone(a.p),...patch});
  });
  return addNode(s,id,'look',pos,patch);
}
export function updatePlanFacing(s:Session,id:string,nodeId:number,p:Pt){
  return planAim(s,id,'fixed',p,nodeId);
}
export function planLook(s:Session,id:string,p:Pt,nodeId?:number){
  const a=party(s,id);if(!a)return false;
  const node=nodeId!==undefined?a.plan.find(n=>n.id===nodeId):a.plan.at(-1);
  return planAim(s,id,'free',p,node?.id,'look');
}
/** A WATCH target is world-fixed; heading follows it during movement. */
export function planWatch(s:Session,id:string,p:Pt,nodeId?:number,
  origin:'here'|'end'='end'){
  return planAim(s,id,'track',p,nodeId,'watch',origin);
}
/** Edit the active, already-executed WATCH while paused. Its original
 * order has left the route, so this changes persistent aim state directly
 * without inventing an extra movement waypoint or changing future orders.
 */
export function retargetActiveWatch(s:Session,id:string,target:Pt):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s)||a.aimInstruction?.mode!=='track'||
     !Number.isFinite(target.x)||!Number.isFinite(target.y)||
     d(a.p,target)<2)return false;
  return edit(s,a,()=>{a.aimInstruction={mode:'track',point:clone(target)};});
}
/** DELETE on an active WATCH releases tracking; the path stays untouched. */
export function removeActiveWatch(s:Session,id:string):boolean{
  const a=party(s,id);
  if(!a||!canEdit(s)||a.aimInstruction?.mode!=='track')return false;
  return edit(s,a,()=>{a.aimInstruction=null;});
}
/** Release an existing WATCH using an explicit AUTO transition. */
export function releaseWatch(s:Session,id:string,nodeId?:number,
  origin:'here'|'end'='here'):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=nodeId===undefined?undefined:a.plan.find(n=>n.id===nodeId);
  if(nodeId!==undefined&&!node)return false;
  if(node)return edit(s,a,()=>{
    node.aimMode='free';node.aimPoint=undefined;
    node.facing=undefined;node.aimLabel=undefined;
  });
  const pos=origin==='here'?a.p:finalPoint(a);
  return edit(s,a,()=>{
    const entry:PlanNode={id:s.nextId++,kind:'look',p:clone(pos),aimMode:'free'};
    if(origin==='here')a.plan.unshift(entry);
    else a.plan.push(entry);
  });
}
