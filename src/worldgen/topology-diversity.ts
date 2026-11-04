/** R4: a cheap, seed-stable description of real floor-plan topology.
 * Count only physically authored room/door/passage relationships. Generated
 * layouts are still accepted exclusively by the existing quality contracts.
 */
import type {Site} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
export type TopologyProfile={
 signature:string;roomCount:number;connections:number;
 branchRooms:number;deadEnds:number;circulationCycles:number;
 hallwayShare:number;exteriorThresholds:number;
};
const portal=(item:{a:Pt;b:Pt}):Pt=>({x:(item.a.x+item.b.x)/2,
 y:(item.a.y+item.b.y)/2});
export function describeSiteTopology(site:Site):TopologyProfile{
 const rooms=site.rooms;
 const adjacency=new Map(rooms.map(r=>[r.id,new Set<string>()]));
 const near=(r:Site['rooms'][number],p:Pt)=>{
  if(p.x<r.x-10||p.x>r.x+r.w+10||
     p.y<r.y-10||p.y>r.y+r.h+10)return false;
  return Math.min(Math.abs(p.x-r.x),Math.abs(p.x-r.x-r.w),
    Math.abs(p.y-r.y),Math.abs(p.y-r.y-r.h))<10;
 };
 const connected=new Set<string>();
 for(const connection of [...site.doors,...(site.openings??[])]){
  const p=portal(connection),touching=rooms.filter(r=>near(r,p));
  if(touching.length!==2)continue;
  const [a,b]=touching;
  if(a.id===b.id)continue;
  const key=[a.id,b.id].sort().join('|');
  if(connected.has(key))continue;
  connected.add(key);
  adjacency.get(a.id)?.add(b.id);
  adjacency.get(b.id)?.add(a.id);
 }
 let components=0;
 const visited=new Set<string>();
 for(const room of rooms){
  if(visited.has(room.id))continue;
  components++;
  const pending=[room.id];
  while(pending.length){
   const id=pending.pop()!;
   if(visited.has(id))continue;
   visited.add(id);
   for(const next of adjacency.get(id)??[])pending.push(next);
  }
 }
 const degrees=rooms.map(r=>adjacency.get(r.id)?.size??0);
 const branchRooms=degrees.filter(x=>x>=3).length;
 const deadEnds=degrees.filter(x=>x===1).length;
 const cycles=Math.max(0,connected.size-rooms.length+components);
 const hallwayShare=rooms.length?rooms.filter(r=>r.kind==='hall').length/
   rooms.length:0;
 const exteriorThresholds=site.doors.filter(d=>
  d.id==='FRONT'||d.id.startsWith('SERVICE')||
  d.id.startsWith('COURT')||d.id.startsWith('GARAGE')).length;
 const family=site.planFamily??site.layout;
 const signature=[family,site.circulationStyle??'unset',
  rooms.length,branchRooms,deadEnds,cycles,
  Math.round(hallwayShare*10)].join(':');
 return {signature,roomCount:rooms.length,connections:connected.size,
  branchRooms,deadEnds,circulationCycles:cycles,
  hallwayShare:Math.round(hallwayShare*100)/100,exteriorThresholds};
}
/** A bounded alternate is useful only when the existing physical-contract
 * score is no worse. Diversity chooses a MIX of branching and loop styles
 * by seed, never a universal 'more corridors' or 'more loops' winner.
 */
export function preferTopologyCandidate(
 candidate:TopologyProfile,incumbent:TopologyProfile,
 candidatePenalty:number,incumbentPenalty:number,seed:number):boolean{
 if(candidatePenalty!==incumbentPenalty)
  return candidatePenalty<incumbentPenalty;
 if(candidate.signature===incumbent.signature)return false;
 const preference=(Math.imul(seed^0x7f4a7c15,2654435761)>>>0)%3;
 const value=(t:TopologyProfile)=>preference===0?
  t.branchRooms*4+t.deadEnds:preference===1?
  t.circulationCycles*5+t.connections*.15:
  Math.abs(t.hallwayShare-.24)*-12+t.exteriorThresholds*2;
 const a=value(candidate),b=value(incumbent);
 if(Math.abs(a-b)<.01)return candidate.signature<incumbent.signature;
 return a>b;
}
export const shouldSampleTopologyAlternative=(seed:number,scale:string)=>
 scale!=='large'&&(Math.imul((seed>>>0)^0x83a10551,1597334677)>>>0)%7===0;
