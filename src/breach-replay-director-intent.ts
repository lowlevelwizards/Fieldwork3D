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
export type DirectorIntent={
  actorId:string;position:Pt;heading:number;route:Pt[];
  direction:Pt;destination:Pt|null;door:DirectorDoorAnchor|null;
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
  time=frame?.t??0):DirectorIntent[]{
  if(!frame)return [];
  const result:DirectorIntent[]=[];
  for(const actor of frame.actors){
    if(actor.health<=0)continue;
    // Blue ownership is derived from the manifest integration caller. Frames
    // include enemy actors too, and we deliberately require a known plan.
    const rev=directorRevisionAt(index,actor.id,time);
    const snapshot=actor.plan;
    if(snapshot===undefined&&!rev)continue;
    const nodes:safePlan=Array.isArray(snapshot)?snapshot:rev!.nodes;
    const position={...actor.p};
    const route=meaningfulRoute(position,nodes);
    const direction=routeDirection(route,actor.heading);
    const door=nearestDoor(position,route,nodes,doors);
    const first=nodes[0];
    const nearDoor=!!door&&door.distance<=clamp(
      distance(position,route[1]??position)+24,35,75);
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
      activeRevision:rev?.revisionId??null});
  }
  return result;
}
type safePlan=readonly PlanNode[];
export function directorIntentGroup(intents:readonly DirectorIntent[]){
  const ranked=intents.filter(i=>i.door&&i.door.distance<110);
  const counts=new Map<string,{door:DirectorDoorAnchor;count:number;
    actors:string[]}>();
  for(const intent of ranked){
    const key=intent.door!.id;
    if(!counts.has(key))counts.set(key,
      {door:intent.door!,count:0,actors:[]});
    const group=counts.get(key)!;
    group.count++;group.actors.push(intent.actorId);
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count||
    a.door.distance-b.door.distance||a.door.id.localeCompare(b.door.id))[0]??null;
}
