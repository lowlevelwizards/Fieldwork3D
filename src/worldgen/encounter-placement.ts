/** Physically grounded encounter placement. Functional rooms are evaluated
 * after furnishing, rather than cloning the same few compiler anchors until
 * a crowd forms. Each usable room is route-checked once (bounded on mobile).
 */
import type {Site,Room} from '../breach-site.ts';
import {activeSite,activateSite,passable,route,pointToSegment,type Pt}
 from '../breach-core.ts';
import type {EncounterActorSpec,EncounterGroup} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
import {clearOfInsertion,roomOccupancyCapacity} from './encounter-spawn-safety.ts';

const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const roomOf=(site:Site,p:Pt)=>site.rooms.find(r=>r.kind==='room'&&
 p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
const inside=(p:Pt,r:Room,margin=20)=>p.x>=r.x+margin&&
 p.x<=r.x+r.w-margin&&p.y>=r.y+margin&&p.y<=r.y+r.h-margin;

export type PlacementResult={actors:EncounterActorSpec[];
 groups:EncounterGroup[];rejected:number;fallbacks:number};
type Anchor={room:Room;p:Pt;capacity:number;choices:Pt[]};

export function placeEncounterActors(site:Site,planned:EncounterActorSpec[],
 groups:EncounterGroup[],seed:number):PlacementResult{
 const rng=encounterRng(seed,5);
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 let rejected=0,fallbacks=0;
 const staticLegal=(p:Pt,r:Room):boolean=>{
  if(!inside(p,r)||p.x<bounds.minX+18||p.y<bounds.minY+18||
    p.x>bounds.maxX-18||p.y>bounds.maxY-18||
    !clearOfInsertion(site,p))return false;
  if(site.walls.some(w=>pointToSegment(p,w)<15))return false;
  if(site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+13&&
    Math.abs(p.y-c.y)<c.h/2+13))return false;
  if(site.doors.some(d=>dist(p,{x:(d.a.x+d.b.x)/2,
    y:(d.a.y+d.b.y)/2})<38))return false;
  if(dist(p,site.objective)<38)return false;
  return true;
 };
 const localClear=(a:Pt,b:Pt,r:Room):boolean=>{
  const steps=Math.max(1,Math.ceil(dist(a,b)/8));
  for(let i=1;i<=steps;i++){
   const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   if(!inside(p,r,14)||
     site.walls.some(w=>pointToSegment(p,w)<13)||
     site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+12&&
       Math.abs(p.y-c.y)<c.h/2+12))return false;
  }
  return true;
 };
 const sample=(r:Room):Pt[]=>{
  const fractions=[.19,.32,.45,.55,.68,.81];
  const points=fractions.flatMap(y=>fractions.map(x=>({
   x:r.x+r.w*x,y:r.y+r.h*y,k:rng()
  })));
  const originals=site.enemies.filter(p=>roomOf(site,p)?.id===r.id)
   .map(p=>({x:p.x,y:p.y,k:-1}));
  return [...originals,...points.sort((a,b)=>a.k-b.k)]
   .map(p=>({x:p.x,y:p.y}));
 };
 // Most sites have far more usable rooms than initial architectural anchors.
 // The cap bounds room-level route checks on large mobile maps.
 const rooms=site.rooms.filter(r=>r.kind==='room')
  .map(r=>({r,k:rng()})).sort((a,b)=>a.k-b.k)
  .slice(0,22).map(x=>x.r);
 const anchors:Anchor[]=[];
 const previous=activeSite();
 activateSite(site);
 try{
  for(const room of rooms){
   const points=sample(room);
   let anchor:Pt|undefined;
   for(const p of points){
    if(!staticLegal(p,room))continue;
    if(!passable(p)){rejected++;continue;}
    // Only a bounded number of actual A* checks per functional room.
    if(!route(site.spawn[0],p).length){rejected++;break;}
    anchor=p;break;
   }
   if(!anchor)continue;
   const choices=[anchor,...points.filter(p=>dist(p,anchor)>18&&
     staticLegal(p,room)&&localClear(anchor,p,room))];
   anchors.push({room,p:anchor,capacity:roomOccupancyCapacity(room,site.cover),
     choices});
  }
 }finally{activateSite(previous);}
 const placed=new Map<string,EncounterActorSpec>();
 const used=new Map<string,number>();
 const occupied:{p:Pt;roomId:string;groupId:string}[]=[];
 const eligible=(p:Pt,anchor:Anchor,groupId:string)=>{
  if(!staticLegal(p,anchor.room))return false;
  const conflicts=occupied.some(o=>{
   const separation=o.roomId!==anchor.room.id?29:
     o.groupId===groupId?43:65;
   return dist(p,o.p)<separation;
  });
  return !conflicts;
 };
 // Distribute distinct groups across different functional rooms first.
 // Members prefer their shared room but can spill to nearby free rooms.
 for(const group of groups){
  const members=group.members.map(id=>planned.find(a=>a.id===id))
   .filter((a):a is EncounterActorSpec=>!!a);
  if(!members.length)continue;
  const ranked=anchors.map(anchor=>{
   const count=used.get(anchor.room.id)??0;
   const roomCenter={x:anchor.room.x+anchor.room.w/2,
     y:anchor.room.y+anchor.room.h/2};
   const originalDist=dist(roomCenter,members[0].position);
   // Empty rooms win over repeated group stacks; location still varies by seed.
   const score=(count===0?110:-90)+
     (anchor.capacity-count)*12-Math.min(32,originalDist*.065)+rng()*32;
   return {anchor,score};
  }).filter(x=>(used.get(x.anchor.room.id)??0)<x.anchor.capacity)
   .sort((a,b)=>b.score-a.score);
  const home=ranked[0]?.anchor;
  if(!home)break;
  const preferred=anchors.slice().sort((a,b)=>{
   if(a===home)return -1;if(b===home)return 1;
   const d1=dist(a.p,home.p),d2=dist(b.p,home.p);
   const empty1=(used.get(a.room.id)??0)===0;
   const empty2=(used.get(b.room.id)??0)===0;
   return Number(empty2)-Number(empty1)||d1-d2||
     a.room.id.localeCompare(b.room.id);
  });
  for(const member of members){
   let accepted=false;
   for(const anchor of preferred){
    if((used.get(anchor.room.id)??0)>=anchor.capacity)continue;
    for(const p of anchor.choices){
     if(!eligible(p,anchor,group.id)){rejected++;continue;}
     placed.set(member.id,{...member,position:{...p},
       roomId:anchor.room.id,zoneId:anchor.room.zoneId??anchor.room.id});
     occupied.push({p,roomId:anchor.room.id,groupId:group.id});
     used.set(anchor.room.id,(used.get(anchor.room.id)??0)+1);
     if(anchor!==home)fallbacks++;
     accepted=true;break;
    }
    if(accepted)break;
   }
   if(!accepted)fallbacks++;
  }
 }
 const actors=planned.flatMap(a=>placed.has(a.id)?[placed.get(a.id)!]:[]);
 const surviving=new Set(actors.map(a=>a.id));
 const retainedGroups=groups.map(g=>({...g,
   members:g.members.filter(id=>surviving.has(id))}))
  .filter(g=>g.members.length>0).map(g=>({...g,
   zoneId:placed.get(g.members[0])?.zoneId}));
 return {actors,groups:retainedGroups,rejected,fallbacks};
}
