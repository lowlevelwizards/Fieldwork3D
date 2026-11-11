/** Stable tactical planning utility commands. Edits are always
 * authoritative Session plan transactions; no execution or DOM authority.
 * Keeps PIE, WAIT, synchronization and reload authorship in the same domain.
 */
import type {Session} from './breach-game.ts';
import {type Pt,doorCenter} from './breach-core.ts';
import {copyNodes,type PieSide} from './breach-plan.ts';
import {edit,atomicTeamEdit,validKnownPieArc,validEditedPlan} from './breach-plan-authoring.ts';
import {party,team,canEdit} from './breach-session-selectors.ts';
import {addNode,finalPoint} from './breach-plan-node-commands.ts';
import {projectReachableGoal} from './breach-nav-diagnostics.ts';
import {intelPassable,routeWithIntel} from './breach-intel.ts';
const clone=(p:Pt):Pt=>({...p});
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

export function setStrafe(s:Session,id:string,nodeId:number):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const node=a.plan.find(n=>n.id===nodeId);
  if(!node||node.kind!=='move')return false;
  return edit(s,a,()=>{
    if(node.moveMode==='strafe'){
      node.moveMode='advance';
    }else{
      node.moveMode='strafe';
      node.facing??=[...a.plan.slice(0,a.plan.indexOf(node))]
        .reverse().find(n=>n.facing!==undefined)?.facing??a.heading;
    }
  });
}

export function planPieAt(s:Session,id:string,pivot:Pt,side:PieSide,degrees=54,
  afterNodeId?:number){
  const a=party(s,id);
  if(!a||!canEdit(s))return false;
  const index=afterNodeId===undefined?a.plan.length:
    a.plan.findIndex(n=>n.id===afterNodeId)+1;
  if(index<=0&&afterNodeId!==undefined)return false;
  const start=index===0?a.p:a.plan[index-1].p;
  const arc=validKnownPieArc(s,start,pivot,side,degrees);
  if(!arc.length)return false;
  if(afterNodeId===undefined)return addNode(s,id,'pie',arc[arc.length-1],{
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  const proposed=copyNodes(a.plan);
  proposed.splice(index,0,{id:s.nextId,kind:'pie',p:clone(arc.at(-1)!),
    pivot:clone(pivot),pieSide:side,pieDegrees:degrees,arc:arc.map(clone)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}

export function planPie(s:Session,id:string,doorId:string,side:PieSide){
  const door=s.doors.find(d=>d.id===doorId);
  return !!door&&planPieAt(s,id,doorCenter(door),side);
}

export function editPie(s:Session,id:string,nodeId:number,
  pivot:Pt,degrees?:number,side?:PieSide){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const proposed=copyNodes(a.plan),index=proposed.findIndex(n=>n.id===nodeId);
  if(index<0||proposed[index].kind!=='pie')return false;
  proposed[index].pivot=clone(pivot);
  if(degrees!==undefined)proposed[index].pieDegrees=clamp(degrees,8,120);
  if(side)proposed[index].pieSide=side;
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;});
}

export function insertPlanNode(s:Session,id:string,index:number,p:Pt){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const position=clamp(index,0,a.plan.length);
  const from=position>0?a.plan[position-1].p:a.p;
  const target=projectReachableGoal(from,p,{
    canStand:at=>intelPassable(at,s.intel),
    routeTo:(origin,goal)=>routeWithIntel(s.intel,origin,goal),
  });
  if(!target)return false;
  const proposed=copyNodes(a.plan);
  proposed.splice(position,0,{id:s.nextId,kind:'move',p:clone(target.point)});
  if(!validEditedPlan(s,a.p,proposed))return false;
  return edit(s,a,()=>{a.plan=proposed;s.nextId++;});
}

export function planWaitAt(s:Session,id:string,seconds=1,
  origin:'here'|'end'='here',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const after=afterNodeId===undefined?-1:
    a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&after<0)return false;
  if(afterNodeId!==undefined||origin==='here'){
    const point=afterNodeId!==undefined?a.plan[after].p:a.p;
    return edit(s,a,()=>a.plan.splice(after+1,0,{
      id:s.nextId++,kind:'wait',p:clone(point),
      duration:clamp(seconds,.3,6)}));
  }
  return planWait(s,id,seconds);
}

export function planWait(s:Session,id:string,seconds=1){
  const a=party(s,id);return a?addNode(s,id,'wait',finalPoint(a),
    {duration:clamp(seconds,.3,6)}):false;
}

export function planSync(s:Session,participantIds?:readonly string[]){
 if(!canEdit(s))return false;
 const participants=team(s).filter(a=>a.health>0&&
   (!participantIds||participantIds.includes(a.id)));
 if(!participants.length)return false;
 return atomicTeamEdit(s,participants,()=>{
  const code='B'+(++s.syncCode);
  return participants.every(a=>addNode(s,a.id,'sync',finalPoint(a),
    {syncCode:code}));
 });
}

export function planHoldClear(s:Session,id:string,origin:'here'|'end'='end',afterNodeId?:number){
  const a=party(s,id);if(!a||!canEdit(s))return false;
  const idx=afterNodeId===undefined?-1:a.plan.findIndex(n=>n.id===afterNodeId);
  if(afterNodeId!==undefined&&idx<0)return false;
  const p=idx>=0?a.plan[idx].p:origin==='here'?a.p:finalPoint(a);
  if(idx>=0||origin==='here')return edit(s,a,()=>{
    a.plan.splice(idx+1,0,{id:s.nextId++,kind:'holdClear',p:clone(p),duration:.5});
  });
  return addNode(s,id,'holdClear',p,{duration:.5});
}

export function planReload(s:Session,id:string):boolean{
  const a=party(s,id);
  return !!a&&canEdit(s)&&addNode(s,id,'reload',finalPoint(a));
}

export function planReloadAt(s:Session,id:string,afterNodeId?:number){
 const a=party(s,id);if(!a||!canEdit(s))return false;
 const index=afterNodeId===undefined?0:a.plan.findIndex(n=>n.id===afterNodeId)+1;
 if(index<0)return false;
 const p=index===0?a.p:a.plan[index-1].p;
 return edit(s,a,()=>a.plan.splice(index,0,{id:s.nextId++,
   kind:'reload',p:clone(p)}));
}
