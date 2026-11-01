/** Cheap local activity journeys from validated spawns. No A* at generation;
 * the runtime motor verifies any movement before carrying it out. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec} from './encounter-types.ts';
import {pointToSegment,type Pt} from '../breach-core.ts';
import {encounterRng} from './encounter-rng.ts';
const near=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function assignEncounterRoutines(site:Site,actors:EncounterActorSpec[],
 seed:number):EncounterActorSpec[]{
 const rng=encounterRng(seed,7);
 return actors.map(a=>{
  if(a.readiness!=='relaxed'||!['working','inspecting','idle'].includes(a.activity)||
     rng()>.38)return a;
  const room=site.rooms.find(r=>r.kind==='room'&&a.position.x>=r.x&&
   a.position.x<=r.x+r.w&&a.position.y>=r.y&&a.position.y<=r.y+r.h);
  if(!room)return a;
  const choices=[{x:38,y:0},{x:-38,y:0},{x:0,y:38},{x:0,y:-38},
   {x:50,y:25},{x:-50,y:-25}];
  const offset=Math.floor(rng()*choices.length);
  const valid=(p:Pt)=>p.x>room.x+20&&p.y>room.y+20&&
   p.x<room.x+room.w-20&&p.y<room.y+room.h-20&&
   !site.walls.some(w=>pointToSegment(p,w)<12)&&
   !site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+10&&
    Math.abs(p.y-c.y)<c.h/2+10)&&
   !site.doors.some(d=>near(p,{x:(d.a.x+d.b.x)/2,
    y:(d.a.y+d.b.y)/2})<35);
  const swept=(p:Pt)=>Array.from({length:10},(_,i)=>{
    const t=(i+1)/10;
    return {x:a.position.x+(p.x-a.position.x)*t,
      y:a.position.y+(p.y-a.position.y)*t};
   }).every(valid);
  for(let i=0;i<choices.length;i++){
   const c=choices[(i+offset)%choices.length];
   const p={x:a.position.x+c.x,y:a.position.y+c.y};
   if(valid(p)&&swept(p))
    return {...a,routine:[{...a.position},p]};
  }
  return a;
 });
}
