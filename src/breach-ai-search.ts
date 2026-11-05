/** Bounded investigation candidates from the actor's uncertain last-known
 * position and the real architecture; NEVER a hidden subject coordinate.
 * This is only a proposal. The simulation motor must validate each route. */
import type {Pt} from './breach-core.ts';
import type {Room} from './breach-site.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type SearchDoor={a:Pt;b:Pt};
type SearchCover={x:number;y:number;w:number;h:number};
type Candidate={p:Pt;priority:number};
const inside=(p:Pt,r:Room,margin=12)=>
  p.x>r.x+margin&&p.x<r.x+r.w-margin&&
  p.y>r.y+margin&&p.y<r.y+r.h-margin;
export function searchCandidates(estimate:Pt,uncertainty:number,
  rooms:readonly Room[],doors:readonly SearchDoor[]=[],
  cover:readonly SearchCover[]=[]):Pt[]{
 const radius=Math.max(48,Math.min(150,uncertainty+35));
 const proposals:Candidate[]=[];
 const add=(p:Pt,priority:number)=>{
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  if(dist(p,estimate)>radius+70)return;
  proposals.push({p,priority});
 };
 const eligible=rooms.filter(room=>{
  const center={x:room.x+room.w/2,y:room.y+room.h/2};
  return dist(center,estimate)<=radius+Math.max(room.w,room.h)/2;
 }).slice(0,14);
 // Inspect real thresholds from a stand-off position INSIDE the known room,
 // not at the door-leaf center or across an invisible wall.
 for(const door of doors.slice(0,24)){
  const threshold={x:(door.a.x+door.b.x)/2,
    y:(door.a.y+door.b.y)/2};
  if(dist(threshold,estimate)>radius+45)continue;
  for(const room of eligible){
   if(threshold.x<room.x-7||threshold.x>room.x+room.w+7||
      threshold.y<room.y-7||threshold.y>room.y+room.h+7)continue;
   const center={x:room.x+room.w/2,y:room.y+room.h/2};
   const len=dist(center,threshold);
   if(len<1)continue;
   const point={x:threshold.x+(center.x-threshold.x)/len*29,
     y:threshold.y+(center.y-threshold.y)/len*29};
   if(inside(point,room,13))add(point,-45);
  }
 }
 // Observe around plausible furniture silhouettes within the search area.
 // A cover corner is a *viewing* approach, never a claim the target is there.
 for(const fixture of cover.slice(0,40)){
  const center={x:fixture.x,y:fixture.y};
  if(dist(center,estimate)>radius+35)continue;
  for(const point of [
    {x:fixture.x-fixture.w/2-19,y:fixture.y},
    {x:fixture.x+fixture.w/2+19,y:fixture.y},
    {x:fixture.x,y:fixture.y-fixture.h/2-19},
    {x:fixture.x,y:fixture.y+fixture.h/2+19}
  ]){
   if(eligible.some(r=>inside(point,r)))add(point,-12);
  }
 }
 // Existing room-center and radial probes remain the safe fallback on
 // maps without usable door or cover context.
 for(const room of eligible){
  add({x:room.x+room.w/2,y:room.y+room.h/2},8);
 }
 for(const direction of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  add({x:estimate.x+Math.cos(direction)*radius*.5,
    y:estimate.y+Math.sin(direction)*radius*.5},28);
 }
 const visited=new Set<string>();
 return proposals.sort((a,b)=>a.priority-b.priority||
    dist(a.p,estimate)-dist(b.p,estimate)||
    a.p.x-b.p.x||a.p.y-b.p.y)
  .filter(({p})=>{
   const key=Math.round(p.x/8)+','+Math.round(p.y/8);
   if(visited.has(key))return false;visited.add(key);return true;
  }).slice(0,6).map(({p})=>p);
}
