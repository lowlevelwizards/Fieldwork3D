/** R7: retrospective intent. Only uses plans that existed at the sampled
 * replay time. Never reconstruct future orders from the completed mission.
 * Does not read live AI, camera state, or visibility information. */
import type {ReplayFrame} from './breach-replay.ts';
import type {ReplayPlanRevision} from './breach-replay-plans.ts';
import type {PlanNode,Pt} from './breach-plan.ts';
import type {Door} from './breach-core.ts';

export type DirectorIntentKind='travel'|'approach'|'stack'|'breach'|'entry'|
  'overwatch'|'hold';
export type DirectorDoorAnchor={
  id:string;mid:Pt;a:Pt;b:Pt;approachSide:-1|1;
  distance:number;normal:Pt
};
export type DirectorPlannedAttention={
  kind:'watch'|'action';at:Pt;direction:Pt;distance:number
};
export type DirectorIntent={
  actorId:string;position:Pt;heading:number;route:Pt[];
  direction:Pt;destination:Pt|null;door:DirectorDoorAnchor|null;
  /** Actual replay speed, used to follow action rather than idle teammates. */
  speed:number;
  /** An already executed WATCH/LOOK, never a future-only instruction. */
  watchDirection:Pt|null;
  /** Next authored action in the remaining plan, BEFORE it becomes active. */
  plannedAttention:DirectorPlannedAttention|null;
  kind:DirectorIntentKind;activeRevision:number|null;
};
export type DirectorPlanIndex=ReadonlyMap<string,readonly ReplayPlanRevision[]>;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const signed=(a:Pt,b:Pt,p:Pt)=>
  (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const midpoint=(a:Pt,b:Pt):Pt=>({x:(a.x+b.x)*.5,y:(a.y+b.y)*.5});

export function buildDirectorPlanIndex(
  revisions:readonly ReplayPlanRevision[]):DirectorPlanIndex{
  const grouped=new Map<string,ReplayPlanRevision[]>();
  for(const rev of revisions){
    if(!grouped.has(rev.actorId))grouped.set(rev.actorId,[]);
    grouped.get(rev.actorId)!.push(rev);
  }
  for(const records of grouped.values())
    records.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  return grouped;
}
export function directorRevisionAt(index:DirectorPlanIndex,
  actorId:string,time:number):ReplayPlanRevision|null{
  const list=index.get(actorId);
  if(!list?.length)return null;
  const tick=Math.round(Math.max(0,time)*60);
  let lo=0,hi=list.length;
  while(lo<hi){
    const i=(lo+hi)>>>1;
    if(list[i].tick<=tick)lo=i+1;else hi=i;
  }
  return list[lo-1]??null;
}
function meaningfulRoute(position:Pt,nodes:readonly PlanNode[]):Pt[]{
  const result:Pt[]=[{...position}];
  for(const node of nodes){
    if(!['move','door','interact','flash','tool','look','holdClear']
      .includes(node.kind))continue;
    if(!Number.isFinite(node.p.x)||!Number.isFinite(node.p.y))continue;
    if(distance(result[result.length-1],node.p)<5)continue;
    result.push({...node.p});
    if(result.length>=7)break;
  }
  return result;
}
function directionTo(from:Pt,to:Pt):Pt|null{
  const dx=to.x-from.x,dy=to.y-from.y;
  const d=Math.hypot(dx,dy);
  return d>2&&Number.isFinite(d)?{x:dx/d,y:dy/d}:null;
}
function aimDirection(position:Pt,
  aim:{mode:string;angle?:number;point?:Pt}|null|undefined):Pt|null{
  if(!aim||aim.mode==='free')return null;
  if(aim.mode==='track'&&aim.point)
    return directionTo(position,aim.point);
  if(aim.mode==='fixed'&&Number.isFinite(aim.angle))
    return {x:Math.cos(aim.angle!),y:Math.sin(aim.angle!)};
  return null;
}
/** Only orders already authored at this frame are allowed to predict a
 * future composition. Their authored direction is evidence of intent,
 * never a revelation of an enemy or completed replay event. */
function plannedAttention(position:Pt,nodes:readonly PlanNode[],
  doors:readonly Door[]):DirectorPlannedAttention|null{
  let previous=position,traveled=0;
  for(const node of nodes.slice(0,12)){
    if(!Number.isFinite(node.p.x)||!Number.isFinite(node.p.y))continue;
    const segment=distance(previous,node.p);
    if(segment>3)traveled+=segment;
    previous=node.p;
    const lookPoint=node.aimPoint;
    const aim=lookPoint&&(node.aimMode==='track'||node.kind==='look'||
      node.aimLabel==='watch')?
      directionTo(node.p,lookPoint):null;
    const fixed=node.facing!==undefined&&Number.isFinite(node.facing)&&
      (node.aimMode==='fixed'||node.kind==='look')?
      {x:Math.cos(node.facing),y:Math.sin(node.facing)}:null;
    if(aim||fixed)return {kind:'watch',at:{...node.p},
      direction:aim??fixed!,distance:traveled};
    if(['door','flash','tool','interact'].includes(node.kind)||
      node.doorId||node.stackDoorId||node.entryDoorId){
      const id=node.doorId??node.stackDoorId??node.entryDoorId;
      const door=doors.find(d=>d.id===id);
      const at=door?midpoint(door.a,door.b):node.p;
      const direction=directionTo(node.p,at)??
        directionTo(position,node.p);
      if(direction)return {kind:'action',at:{...at},
        direction,distance:traveled};
    }
  }
  return null;
}
function routeDirection(route:readonly Pt[],heading:number):Pt{
  const first=route[0],next=route.find(p=>distance(p,first)>8);
  if(next){
    const dx=next.x-first.x,dy=next.y-first.y,d=Math.hypot(dx,dy);
    return {x:dx/d,y:dy/d};
  }
  return {x:Math.cos(heading),y:Math.sin(heading)};
}
function nearestDoor(position:Pt,route:readonly Pt[],
  nodes:readonly PlanNode[],doors:readonly Door[]):DirectorDoorAnchor|null{
  if(!nodes.length||route.length<2&&!nodes.some(n=>
    n.doorId||n.stackDoorId||n.entryDoorId))return null;
  const upcoming=nodes.slice(0,8);
  const tagged=upcoming.find(node=>
    node.doorId||node.stackDoorId||node.entryDoorId);
  const taggedId=tagged?.doorId??tagged?.stackDoorId??tagged?.entryDoorId;
  const taggedDoor=taggedId?doors.find(d=>d.id===taggedId):undefined;
  const target=route.slice(1,4).at(-1)??position;
  const fallback=doors.map(door=>({door,mid:midpoint(door.a,door.b)}))
    .filter(x=>distance(position,x.mid)<125&&
      (route.slice(1).some(p=>distance(p,x.mid)<34)||
       distance(target,x.mid)<32))
    .sort((a,b)=>distance(position,a.mid)-distance(position,b.mid))[0]?.door;
  const door=taggedDoor??fallback;
  if(!door)return null;
  const mid=midpoint(door.a,door.b);
  const d=distance(position,mid);
  if(d>175)return null;
  // A tagged historical node is not proof the door is still ahead. Once
  // the operator is moving away on the same side of the threshold, stop
  // attaching yesterday's door to the current camera shot.
  const currentSide=signed(door.a,door.b,position);
  const crossesThreshold=route.slice(1).some(p=>
    currentSide*signed(door.a,door.b,p)<-36);
  const next=route.find(p=>distance(p,position)>8);
  if(d>22&&next&&!crossesThreshold&&
    distance(next,mid)>d+10)return null;
  const x=door.b.x-door.a.x,y=door.b.y-door.a.y;
  const mag=Math.hypot(x,y)||1;
  const side:signedSide= signed(door.a,door.b,position)>=0?1:-1;
  // The normal points toward the same side as the approaching squad.
  return {id:door.id,mid,a:{...door.a},b:{...door.b},
    approachSide:side,distance:d,
    normal:{x:-y/mag*side,y:x/mag*side}};
}
type signedSide=-1|1;
/** The actor's own snapshot plan takes precedence over the journal.
 * An explicitly empty snapshot is authoritative: never resurrect spent orders.
 * Old archives without frame plans may fall back to timestamped revisions.
 */
export function directorIntentsAt(frame:ReplayFrame|null,
  index:DirectorPlanIndex,doors:readonly Door[],
  time=frame?.t??0,
  friendlyIds?:ReadonlySet<string>):DirectorIntent[]{
  if(!frame)return [];
  const result:DirectorIntent[]=[];
  for(const actor of frame.actors){
    if(actor.health<=0||friendlyIds&&!friendlyIds.has(actor.id))continue;
    // Blue ownership is derived from the manifest integration caller. Frames
    // include enemy actors too, and we deliberately require a known plan.
    const rev=directorRevisionAt(index,actor.id,time);
    const snapshot=actor.plan;
    if(snapshot===undefined&&!rev)continue;
    const nodes:safePlan=Array.isArray(snapshot)?snapshot:rev!.nodes;
    const position={...actor.p};
    const route=meaningfulRoute(position,nodes);
    const direction=routeDirection(route,actor.heading);
    const directAim=aimDirection(position,actor.aimInstruction);
    const watchDirection=directAim??
      (actor.watch?directionTo(position,actor.watch):null);
    const nextAttention=plannedAttention(position,nodes,doors);
    const speed=Number.isFinite(actor.velocity)?
      Math.max(0,actor.velocity):0;
    const door=nearestDoor(position,route,nodes,doors);
    const first=nodes[0];
    const nearDoor=!!door&&door.distance<=clamp(
      distance(position,route[1]??position)+35,35,75);
    let kind:DirectorIntentKind='hold';
    if(first?.kind==='look'||first?.kind==='holdClear'||actor.watch)
      kind='overwatch';
    if(route.length>=2)kind='travel';
    if(door&&nearDoor)kind='approach';
    if(door&&door.distance<34&&
      (nodes.some(n=>n.stackDoorId===door.id)||route.length<3))
      kind='stack';
    if(door&&door.distance<32&&nodes.some(n=>
      n.doorId===door.id&&(n.kind==='door'||n.kind==='tool')))
      kind='breach';
    if(door&&door.distance<40&&nodes.some(n=>n.entryDoorId===door.id))
      kind='entry';
    result.push({actorId:actor.id,position,heading:actor.heading,
      route,direction,destination:route.at(-1)??null,door,kind,
      speed,watchDirection,plannedAttention:nextAttention,
      activeRevision:rev?.revisionId??null});
  }
  return result;
}
type safePlan=readonly PlanNode[];
export function directorIntentGroup(intents:readonly DirectorIntent[]){
  // A door only earns a dedicated shot while members are actually
  // approaching, stacked, breaching or entering. Never group operators
  // on opposite faces as one stack; that would put the camera in a wall.
  const ranked=intents.filter(i=>i.door&&i.door.distance<90&&
    ['approach','stack','breach','entry'].includes(i.kind));
  const counts=new Map<string,{door:DirectorDoorAnchor;count:number;
    actors:string[]}>();
  for(const intent of ranked){
    const key=intent.door!.id+':'+intent.door!.approachSide;
    if(!counts.has(key))counts.set(key,
      {door:intent.door!,count:0,actors:[]});
    const group=counts.get(key)!;
    group.count++;group.actors.push(intent.actorId);
    if(intent.door!.distance<group.door.distance)
      group.door=intent.door!;
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count||
    a.door.distance-b.door.distance||a.door.id.localeCompare(b.door.id))[0]??null;
}
