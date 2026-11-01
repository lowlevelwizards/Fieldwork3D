/** Bounded generation-time diagnostics for the omniscient Map Lab.
 * Pure geometry calculations; never expose these values in player fog of war. */
import type {Site} from '../breach-site.ts';
export type EncounterSpatialAudit={
  hostiles:number;groups:number;occupiedZones:number;emptyZones:number;
  meanEntryDistance:number;closestPair:number;roles:Record<string,number>;
};
export function auditEncounter(site:Site):EncounterSpatialAudit{
 const actors=site.encounter?.actors??site.enemies.map((p,i)=>({
   position:p,role:'sentry',groupId:String(i)}));
 const zones=new Set(site.rooms.filter(r=>r.kind==='room').map(r=>r.zoneId??r.id));
 const occupied=new Set<string>();
 const roles:Record<string,number>={};
 let entry=0,closest=Infinity;
 for(let i=0;i<actors.length;i++){
   const actor=actors[i];roles[actor.role]=(roles[actor.role]??0)+1;
   entry+=Math.hypot(actor.position.x-site.entrance.x,
     actor.position.y-site.entrance.y);
   const room=site.rooms.find(r=>r.kind==='room'&&
     actor.position.x>=r.x&&actor.position.x<=r.x+r.w&&
     actor.position.y>=r.y&&actor.position.y<=r.y+r.h);
   if(room)occupied.add(room.zoneId??room.id);
   for(let j=i+1;j<actors.length;j++)
     closest=Math.min(closest,Math.hypot(actor.position.x-actors[j].position.x,
       actor.position.y-actors[j].position.y));
 }
 return {hostiles:actors.length,groups:new Set(actors.map(a=>a.groupId)).size,
   occupiedZones:occupied.size,emptyZones:Math.max(0,zones.size-occupied.size),
   meanEntryDistance:actors.length?Math.round(entry/actors.length):0,
   closestPair:Number.isFinite(closest)?Math.round(closest):0,roles};
}
