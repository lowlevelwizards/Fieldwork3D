/** Final tactical path validator. Never undo the insertion safety and room
 * capacity limits established by encounter placement to salvage a bad point.
 */
import type {Site,Room} from '../breach-site.ts';
import {activeSite,activateSite,passable,route,type Pt} from '../breach-core.ts';
import type {EncounterActorSpec} from './encounter-types.ts';
import {clearOfInsertion,roomOccupancyCapacity} from './encounter-spawn-safety.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const findRoom=(site:Site,p:Pt):Room|undefined=>site.rooms.find(r=>
 r.kind==='room'&&p.x>=r.x&&p.x<=r.x+r.w&&
 p.y>=r.y&&p.y<=r.y+r.h);
export function stabilizeEncounterReachability(site:Site,
 actors:readonly EncounterActorSpec[]):{
  actors:EncounterActorSpec[];rehomed:number}{
 // The placement solver has already routed candidates on compact maps.
 if(site.scale!=='expanded'&&site.scale!=='large')
  return {actors:actors.map(a=>({...a})),rehomed:0};
 const previous=activeSite();
 const occupied:{p:Pt;room?:Room}[]=[];
 const placed:EncounterActorSpec[]=[];
 const start=site.spawn[0];
 const reachable=new Map<string,boolean>();
 let rehomed=0;
 activateSite(site);
 try{
  const valid=(p:Pt,outdoor:boolean)=>{
   if(!clearOfInsertion(site,p,outdoor)||!passable(p))return false;
   const key=p.x.toFixed(2)+':'+p.y.toFixed(2);
   const old=reachable.get(key);
   if(old!==undefined)return old;
   const result=!!route(start,p).length;
   reachable.set(key,result);
   return result;
  };
  const fits=(p:Pt,exterior:boolean)=>{
   const room=findRoom(site,p);
   if(!exterior&&!room)return false;
   if(occupied.some(o=>dist(o.p,p)<36))return false;
   if(room){
    const count=occupied.filter(o=>o.room?.id===room.id).length;
    if(count>=roomOccupancyCapacity(room,site.cover))return false;
   }
   return true;
  };
  // Preserve mission-critical capture targets before optional hostiles.
  const ordered=actors.slice().sort((a,b)=>
   Number(b.role==='target')-Number(a.role==='target'));
  for(const actor of ordered){
   const exterior=actor.zoneId?.startsWith('exterior:')??false;
   let p:Pt|null=null;
   if(fits(actor.position,exterior)&&valid(actor.position,exterior))
    p=actor.position;
   // Exterior lookouts may disappear if their route is invalid; never turn
   // them into a guard standing next to the inserting team.
   if(!p&&!exterior){
    for(const original of site.enemies){
     if(!fits(original,false)||!valid(original,false))continue;
     p=original;break;
    }
   }
   if(!p)continue;
   if(p!==actor.position)rehomed++;
   const room=findRoom(site,p);
   occupied.push({p,room});
   placed.push({...actor,position:{...p},
     roomId:room?.id,zoneId:room?(room.zoneId??room.id):actor.zoneId,
     ...(p!==actor.position?{routine:undefined}:{})});
  }
 }finally{activateSite(previous);}
 const ids=new Map(placed.map(a=>[a.id,a]));
 return {actors:actors.flatMap(a=>ids.has(a.id)?[ids.get(a.id)!]:[]),
   rehomed};
}
