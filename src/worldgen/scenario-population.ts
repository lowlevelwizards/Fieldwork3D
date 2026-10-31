/** Allocate guards to believable functional spaces without affecting
 * the mission's required spawn, objective or extraction geometry. */
import {type Site,seeded} from '../breach-site.ts';
import {type Pt,pointToSegment} from '../breach-core.ts';
const roomWeights:Record<string,number>={
 living:3,kitchen:2,bedroom:1,studio:2,dining:2,office:3,
 reception:2,cubicles:2,sales:3,checkout:3,stockroom:2,
 workshop:3,bay:4,loading:3,packing:2,storage:2,aisle:2,
 equipment:3,control:3,maintenance:2,lobby:2,guest:2,
 treatment:1,waiting:2,exam:1
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function populateFunctionalRooms(site:Site,seed:number):Site{
 const rng=seeded(seed^0x6f9e4a31);
 const styles=['routine','guarded','disrupted'] as const;
 const scenarioStyle=styles[(seed>>>0)%styles.length];
 const enemies:Pt[]=[],enemyHeadings:number[]=[];
 const occupancy=new Map<string,number>();
 const rooms=site.rooms.filter(r=>r.kind==='room');
 for(const fallback of site.enemies){
  const weighted=rooms.map(room=>{
   const p={x:room.x+room.w/2,y:room.y+room.h/2};
   const roleWeight=roomWeights[room.purpose??'']??1;
   const remote=distance(p,site.entrance)>105?1:.45;
   const used=occupancy.get(room.id)??0;
   return {room,score:roleWeight*remote/(1+used*1.6)};
  }).sort((a,b)=>b.score-a.score);
  const allWeight=weighted.reduce((n,r)=>n+r.score,0);
  let choice=rng()*allWeight;
  const picked=weighted.find(r=>(choice-=r.score)<=0)?.room??rooms[0];
  let accepted:Pt|null=null;
  if(picked){
   const candidates:Pt[]=[];
   for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    candidates.push({x:picked.x+28+(picked.w-56)*(col+.5)/5,
      y:picked.y+28+(picked.h-56)*(row+.5)/5});
   }
   const offset=Math.floor(rng()*candidates.length);
   for(let i=0;i<candidates.length;i++){
    const p=candidates[(i+offset)%candidates.length];
    if(p.x<picked.x+21||p.y<picked.y+21||
      p.x>picked.x+picked.w-21||p.y>picked.y+picked.h-21)continue;
    if(site.walls.some(w=>pointToSegment(p,w)<22))continue;
    if(site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+22&&
      Math.abs(p.y-c.y)<c.h/2+22))continue;
    if(site.doors.some(d=>distance(p,{x:(d.a.x+d.b.x)/2,
      y:(d.a.y+d.b.y)/2})<38))continue;
    if([...site.spawn,...enemies,site.objective,site.extract].some(q=>
      distance(p,q)<36))continue;
    accepted=p;break;
   }
  }
  const p=accepted??fallback;
  enemies.push(p);
  if(accepted&&picked)occupancy.set(picked.id,(occupancy.get(picked.id)??0)+1);
  const nearest=site.doors.map(d=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2}))
    .sort((a,b)=>distance(p,a)-distance(p,b))[0];
  const direction=nearest??site.entrance;
  enemyHeadings.push(Math.atan2(direction.y-p.y,direction.x-p.x));
 }
 return {...site,enemies,enemyHeadings,scenarioStyle};
}
