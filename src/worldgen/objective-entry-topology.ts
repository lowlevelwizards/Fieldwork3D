/** Scores the actual building access topology, not the straight-line
 * distance from the first spawn. Invoked ONCE at world generation, before
 * furniture, population and objective truth are materialized in a Session.
 * Never makes new doors, changes collision, or forces an unreachable room.
 */
import type {Room,WideOpening} from '../breach-site.ts';
import type {Door,Pt,Segment} from '../breach-core.ts';
import type {OperationKind} from '../breach-operations.ts';
import {rankMissionObjectives} from './mission-objective-placement.ts';

const center=(r:Room):Pt=>({x:r.x+r.w/2,y:r.y+r.h/2});
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const contains=(r:Room,p:Pt)=>p.x>r.x+2&&p.x<r.x+r.w-2&&
 p.y>r.y+2&&p.y<r.y+r.h-2;
/** Two sampling offsets tolerate thick threshold clearances and bays. */
function portalRooms(rooms:readonly Room[],portal:Segment):string[]{
 const len=d(portal.a,portal.b);
 if(len<1)return [];
 const cx=(portal.a.x+portal.b.x)/2,cy=(portal.a.y+portal.b.y)/2;
 const nx=-(portal.b.y-portal.a.y)/len,ny=(portal.b.x-portal.a.x)/len;
 const found:string[]=[];
 for(const sign of [-1,1]){
  for(const offset of [15,29,43]){
   const point={x:cx+nx*sign*offset,y:cy+ny*sign*offset};
   const room=rooms.find(r=>contains(r,point));
   if(room){if(!found.includes(room.id))found.push(room.id);break;}
  }
 }
 return found;
}
export type ObjectiveTopologyGrade={
 roomId:string;entryTransitions:number|null;directExterior:boolean;
 score:number;
};
/** A graph edge represents a physical door/opening, not adjacency through a
 * wall. All exterior doors and wide openings count as possible entries. */
export function objectiveEntryTopology(
 rooms:readonly Room[],doors:readonly Door[],
 openings:readonly WideOpening[],entrance:Pt,
 seed:number,mission:OperationKind
):ObjectiveTopologyGrade[]{
 const nodes=new Map(rooms.map(r=>[r.id,new Set<string>()]));
 const entry=new Set<string>();
 for(const portal of [...doors,...openings]){
  const ids=portalRooms(rooms,portal);
  if(ids.length===1)entry.add(ids[0]);
  if(ids.length===2){
   nodes.get(ids[0])?.add(ids[1]);nodes.get(ids[1])?.add(ids[0]);
  }
 }
 // Authored study sites may not expose an exterior portal in their room
 // representation. Fall back to the room nearest the public entrance.
 if(!entry.size&&rooms.length){
  const closest=[...rooms].sort((a,b)=>
   d(center(a),entrance)-d(center(b),entrance))[0];
  if(closest)entry.add(closest.id);
 }
 const depth=new Map<string,number>();
 const queue=[...entry];
 for(const id of queue)depth.set(id,1);
 for(let i=0;i<queue.length;i++){
  const at=queue[i],distance=depth.get(at)!;
  for(const next of nodes.get(at)??[]){
   if(depth.has(next))continue;
   depth.set(next,distance+1);queue.push(next);
  }
 }
 const rank=rankMissionObjectives(rooms,entrance,seed,mission);
 return rank.map(c=>{
  const transitions=depth.get(c.roomId);
  const direct=transitions===1;
  // Search missions should *usually* avoid direct-access triviality; HOLD
  // may deliberately use a front position. No universal minimum route.
  const penalty=direct?(mission==='hold'?18:90):0;
  const depthBonus=transitions===undefined?-35:
   Math.min(3,transitions-1)*(mission==='hold'?5:18);
  return {roomId:c.roomId,entryTransitions:transitions??null,
   directExterior:direct,score:c.score+depthBonus-penalty};
 }).sort((a,b)=>b.score-a.score||a.roomId.localeCompare(b.roomId));
}
/** Keeps an existing candidate when a new target would coincide with an
 * authored hostile anchor. No secret spawn retargeting or forced distance. */
export function chooseTopologyAwareObjective(
 rooms:readonly Room[],doors:readonly Door[],
 openings:readonly WideOpening[],entrance:Pt,
 seed:number,mission:OperationKind,enemyAnchors:readonly Pt[],
 fallback:Pt
):Pt{
 const byId=new Map(rooms.map(r=>[r.id,r]));
 const candidates=objectiveEntryTopology(rooms,doors,openings,entrance,seed,mission);
 for(const candidate of candidates){
  const r=byId.get(candidate.roomId);
  if(!r||r.kind!=='room'||candidate.entryTransitions===null)continue;
  const p=center(r);
  if(enemyAnchors.some(enemy=>d(p,enemy)<42))continue;
  return p;
 }
 return fallback;
}
