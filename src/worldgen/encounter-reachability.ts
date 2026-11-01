/** Final simulation-route guard for expanded encounter placement.
 * Group offsets are locally plausible but can land on a grid-unreachable
 * endpoint after the director has checked architectural anchors.
 * Uses actual tactical A* only for larger maps and retains role identity.
 * Never weakens collision or allows a softlocked hostile spawn.
 */
import type {Site} from '../breach-site.ts';
import {activeSite,activateSite,passable,route,type Pt} from '../breach-core.ts';
import type {EncounterActorSpec} from './encounter-types.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function stabilizeEncounterReachability(site:Site,
  actors:readonly EncounterActorSpec[]):{
    actors:EncounterActorSpec[];rehomed:number}{
 if(site.scale!=='expanded'&&site.scale!=='large')
   return {actors:actors.map(a=>({...a})),rehomed:0};
 const previous=activeSite();
 const checked=new Map<string,boolean>();
 const start=site.spawn[0];
 const connected=(p:Pt)=>{
   const key=p.x.toFixed(2)+':'+p.y.toFixed(2);
   const found=checked.get(key);if(found!==undefined)return found;
   const good=passable(p)&&!!route(start,p).length;
   checked.set(key,good);return good;
 };
 const occupied:Pt[]=[],placed:EncounterActorSpec[]=[];
 let rehomed=0;
 // Preserve essential mission targets first if only limited reachable space.
 const ordered=actors.slice().sort((a,b)=>
  Number(b.role==='target')-Number(a.role==='target'));
 activateSite(site);
 try{
  for(const actor of ordered){
   let position=actor.position;
   if(!connected(position)||occupied.some(q=>dist(q,position)<25)){
     const anchors=site.enemies.slice().sort((a,b)=>
       dist(a,actor.position)-dist(b,actor.position));
     let chosen:Pt|null=null;
     for(const a of anchors){
       for(const [dx,dy] of [[0,0],[16,0],[-16,0],[0,16],[0,-16]]){
         const p={x:a.x+dx,y:a.y+dy};
         if(occupied.some(q=>dist(q,p)<25))continue;
         if(connected(p)){chosen=p;break;}
       }
       if(chosen)break;
     }
     if(!chosen)continue; // Never insert an unreachable hostile.
     position=chosen;rehomed++;
   }
   occupied.push(position);
   placed.push({...actor,position:{...position},
     ...(position===actor.position?{}:{routine:undefined})});
  }
 }finally{activateSite(previous);}
 // Keep prior authored stable actor ordering for deterministic inspector indices.
 const ids=new Map(placed.map(a=>[a.id,a]));
 return {actors:actors.flatMap(a=>ids.has(a.id)?[ids.get(a.id)!]:[]),rehomed};
}
