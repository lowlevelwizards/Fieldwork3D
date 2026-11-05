/** E5-C2: physical, bounded refuge options from a person's known
 * building. Perceptual danger is only an estimate; paths must obey actual
 * current doors and walls. No global hostile coordinates or forced flee. */
import type {Pt} from './breach-core.ts';
import type {Site,Room} from './breach-site.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const inside=(p:Pt,r:Room,m=18)=>
 p.x>=r.x+m&&p.x<=r.x+r.w-m&&p.y>=r.y+m&&p.y<=r.y+r.h-m;
export type RefugeRouteWorld={
 canReach:(a:Pt,b:Pt)=>boolean;
 routeTo?:(a:Pt,b:Pt)=>Pt[];
 canSee?:(a:Pt,b:Pt)=>boolean;
 isCrowded?:(p:Pt)=>boolean;
};
/** Called at session creation, never per-frame. A worker or resident can
 * know local room layout without knowing where armed people are. */
export function civilianRefugePoints(site:Site,c:CivilianActor):Pt[]{
 const home=site.rooms.find(r=>r.id===c.homeRoomId);
 if(!home)return c.routine.map(p=>({...p}));
 const center=(r:Room):Pt=>({x:r.x+r.w/2,y:r.y+r.h/2});
 const base=center(home);
 const rooms=[home,...site.rooms.filter(r=>r.id!==home.id&&
   dist(base,center(r))<250)
  .sort((a,b)=>dist(center(a),base)-dist(center(b),base))
  .slice(0,2)];
 const result:Pt[]=[];
 for(const r of rooms){
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  const insetX=Math.min(40,r.w*.26),insetY=Math.min(40,r.h*.26);
  for(const p of [{x:cx,y:cy},
   {x:cx-insetX,y:cy-insetY},{x:cx+insetX,y:cy+insetY},
   {x:cx-insetX,y:cy+insetY},{x:cx+insetX,y:cy-insetY}]){
   if(!inside(p,r)||site.cover.some(o=>
      Math.abs(p.x-o.x)<o.w/2+13&&Math.abs(p.y-o.y)<o.h/2+13))
    continue;
   if(site.doors.some(d=>dist(p,{x:(d.a.x+d.b.x)/2,
      y:(d.a.y+d.b.y)/2})<24))continue;
   if(site.walls.some(w=>{
     const vx=w.b.x-w.a.x,vy=w.b.y-w.a.y;
     const t=Math.max(0,Math.min(1,((p.x-w.a.x)*vx+
       (p.y-w.a.y)*vy)/Math.max(1,vx*vx+vy*vy)));
     return Math.hypot(p.x-(w.a.x+vx*t),
       p.y-(w.a.y+vy*t))<14;
   }))continue;
   if(!result.some(q=>dist(q,p)<12))result.push(p);
  }
 }
 return result.slice(0,15);
}
export function chooseCivilianRefuge(c:CivilianActor,
 world:RefugeRouteWorld):{goal:Pt;path:Pt[]}|null{
 const threat=c.threatEstimate;
 if(!threat)return null;
 const current=dist(c.p,threat);
 const candidates=[...c.refugePoints,...c.routine].filter(p=>
   dist(p,c.p)>20&&dist(p,threat)>=current+15&&
   !world.isCrowded?.(p))
  .sort((a,b)=>{
   const grade=(p:Pt)=>
     Math.min(250,dist(p,threat))-
     .17*dist(p,c.p)+
     (world.canSee&&!world.canSee(threat,p)?32:0);
   return grade(b)-grade(a)||
     a.x-b.x||a.y-b.y;
  });
 // Bounded route work, once per new startle decision, NOT each tick.
 for(const p of candidates.slice(0,6)){
  if(world.canReach(c.p,p))return {goal:{...p},path:[]};
  if(!world.routeTo)continue;
  const waypoints=world.routeTo(c.p,p);
  if(!waypoints.length||dist(waypoints.at(-1)!,p)>20)continue;
  const path=waypoints.filter(q=>dist(q,c.p)>5);
  if(!path.length)continue;
  let last=c.p,pass=true;
  for(const next of path){
   if(!world.canReach(last,next)){pass=false;break;}
   last=next;
  }
  if(pass)return {goal:{...p},path};
 }
 return null;
}
