/** Post-furnishing encounter placement. Only expand around proven, reachable
 * architectural spawn anchors, avoiding another whole-map A* for each actor.
 * Placement never changes walls, cover, doors, or mission geometry. */
import type {Site,Room} from '../breach-site.ts';
import {pointToSegment,type Pt} from '../breach-core.ts';
import type {EncounterActorSpec,EncounterGroup} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const inside=(p:Pt,r:Room,margin=18)=>p.x>=r.x+margin&&
 p.x<=r.x+r.w-margin&&p.y>=r.y+margin&&p.y<=r.y+r.h-margin;
const roomOf=(site:Site,p:Pt)=>site.rooms.find(r=>r.kind==='room'&&inside(p,r,0));
export type PlacementResult={actors:EncounterActorSpec[];
 groups:EncounterGroup[];rejected:number;fallbacks:number};
export function placeEncounterActors(site:Site,planned:EncounterActorSpec[],
 groups:EncounterGroup[],seed:number):PlacementResult{
 const rng=encounterRng(seed,5);
 const anchors=site.enemies.map(p=>({p,room:roomOf(site,p)}))
  .filter((x):x is {p:Pt;room:Room}=>!!x.room);
 const occupied:Pt[]=[],positions=new Map<string,EncounterActorSpec>();
 let rejected=0,fallbacks=0;
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const legal=(p:Pt,room:Room):boolean=>{
  if(!inside(p,room)||p.x<bounds.minX+20||p.y<bounds.minY+20||
   p.x>bounds.maxX-20||p.y>bounds.maxY-20)return false;
  if(site.walls.some(w=>pointToSegment(p,w)<11))return false;
  if(site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+9&&
   Math.abs(p.y-c.y)<c.h/2+9))return false;
  if(site.doors.some(d=>distance(p,{x:(d.a.x+d.b.x)/2,
   y:(d.a.y+d.b.y)/2})<33))return false;
  if([...site.spawn,site.objective,site.extract].some(q=>distance(p,q)<35))
   return false;
  if(occupied.some(q=>distance(p,q)<27))return false;
  return true;
 };
 const localPath=(a:Pt,b:Pt,room:Room):boolean=>{
  const n=Math.max(1,Math.ceil(distance(a,b)/6));
  for(let i=1;i<=n;i++){
   const t=i/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   // Check the actual whole corridor, not just valid endpoints.
   if(!inside(p,room,11)||
     site.walls.some(w=>pointToSegment(p,w)<11)||
     site.cover.some(c=>Math.abs(p.x-c.x)<c.w/2+9&&
      Math.abs(p.y-c.y)<c.h/2+9))return false;
  }
  return true;
 };
 const candidates=(anchor:Pt):Pt[]=>{
  const angle=rng()*Math.PI*2;
  const out:Pt[]=[{...anchor}];
  for(const radius of [27,42,59,78,100,122])
   for(let i=0;i<12;i++){
    const a=angle+i*Math.PI/6+(radius===42?.11:0);
    out.push({x:anchor.x+Math.cos(a)*radius,
      y:anchor.y+Math.sin(a)*radius});
   }
  return out;
 };
 // Each group gets a physical home. Try its original trusted anchor first,
 // then other reached rooms if that room cannot accommodate everyone.
 groups.forEach((group,g)=>{
  const members=group.members.map(id=>planned.find(a=>a.id===id))
   .filter((a):a is EncounterActorSpec=>!!a);
  if(!members.length||!anchors.length)return;
  const first=members[0];
  const prefer=anchors.findIndex(a=>distance(a.p,first.position)<1);
  const start=prefer>=0?prefer:(g+Math.floor(rng()*anchors.length))%anchors.length;
  for(const member of members){
   let chosen:Pt|null=null,which:Room|null=null;
   let chosenAnchor=-1;
   for(let offset=0;offset<anchors.length&&!chosen;offset++){
    const index=(start+offset)%anchors.length;
    const anchor=anchors[index];
    for(const p of candidates(anchor.p)){
     if(!legal(p,anchor.room)||!localPath(anchor.p,p,anchor.room)){
      rejected++;continue;
     }
     chosen=p;which=anchor.room;chosenAnchor=index;break;
    }
   }
   if(!chosen||!which)continue;
   if(chosenAnchor!==start)fallbacks++;
   const heading=member.heading;
   const placed={...member,position:{...chosen},heading,
     roomId:which.id,zoneId:which.zoneId??which.id};
   positions.set(member.id,placed);occupied.push(chosen);
  }
 });
 let actors=planned.flatMap(a=>positions.has(a.id)?[positions.get(a.id)!]:[]);
 // Mission-critical fallback: when every candidate is blocked, preserve
 // architecturally audited original anchors rather than an empty mission.
 if(actors.length<2&&site.enemies.length>=2){
  fallbacks+=2;
  actors=planned.slice(0,2).map((a,i)=>({...a,
   position:{...site.enemies[i]},heading:site.enemyHeadings?.[i]??a.heading,
   roomId:roomOf(site,site.enemies[i])?.id,
   zoneId:roomOf(site,site.enemies[i])?.zoneId}));
  const fallbackGroup:EncounterGroup={id:'fallback',purpose:'security',
   members:actors.map(a=>a.id)};
  actors=actors.map(a=>({...a,groupId:fallbackGroup.id}));
  return {actors,groups:[fallbackGroup],rejected,fallbacks};
 }
 const surviving=new Set(actors.map(a=>a.id));
 const retainedGroups=groups.map(g=>({...g,
   members:g.members.filter(id=>surviving.has(id))}))
  .filter(g=>g.members.length>0).map(g=>({...g,
   zoneId:positions.get(g.members[0])?.zoneId}));
 return {actors,groups:retainedGroups,rejected,fallbacks};
}
