/** A bounded investigation path derived only from the remembered location. */
import type {Pt} from './breach-core.ts';
import type {Room} from './breach-site.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function searchCandidates(estimate:Pt,uncertainty:number,
 rooms:readonly Room[]):Pt[]{
 const radius=Math.max(48,Math.min(150,uncertainty+35));
 const options:Pt[]=[];
 for(const room of rooms){
  const center={x:room.x+room.w/2,y:room.y+room.h/2};
  if(dist(center,estimate)>radius+Math.max(room.w,room.h)/2)continue;
  // Favor junctions and nearby physical room centers, not hidden actors.
  options.push(center);
 }
 for(const direction of [0,Math.PI/2,Math.PI,Math.PI*1.5])
  options.push({x:estimate.x+Math.cos(direction)*radius*.5,
    y:estimate.y+Math.sin(direction)*radius*.5});
 const visited=new Set<string>();
 return options.filter(p=>{
  const key=Math.round(p.x/8)+','+Math.round(p.y/8);
  if(visited.has(key))return false;visited.add(key);return true;
 }).sort((a,b)=>dist(a,estimate)-dist(b,estimate)||
  a.x-b.x||a.y-b.y).slice(0,6);
}
