/** Door mechanism policy. Geometry and fixed-step leaf motion remain authoritative. */
import {pointToSegment,type Door,type Pt} from './breach-core.ts';
import {doorSecuredFrom} from './breach-door-security.ts';
import type {Session} from './breach-game.ts';

export const AUTOMATIC_SENSOR_RANGE=44;
export const AUTOMATIC_CLOSE_DELAY=1.6;
export function operatingLeaves(doors:readonly Door[],door:Door):Door[]{
 if(!door.pairedWith||!door.operatingMode||door.operatingMode==='independent')return [door];
 const pair=doors.find(d=>d.id===door.pairedWith&&d.pairedWith===door.id&&
   d.operatingMode===door.operatingMode&&d.kind===door.kind);
 return pair?[door,pair]:[door];
}
export function automaticDoorPowered(s:Pick<Session,'sitePower'>):boolean{
 return s.sitePower?.circuits['mains:0']??true;
}
export function automaticAssemblyAvailable(leaves:readonly Door[]):boolean{
 return leaves.every(d=>!d.locked&&!d.jammed&&!d.wedged&&!d.heldBy&&
   !d.latchBroken);
}
export function manualAssemblyBlocked(leaves:readonly Door[],position:Pt):boolean{
 return leaves.some(d=>d.jammed||d.wedged||d.heldBy||
   doorSecuredFrom(d,position));
}
/** Evaluate once per assembly in the authoritative simulation phase.
 * Occupancy uses the fixed doorway, not the animated leaf position.
 * Power loss stops motor commands without snapping any panel.
 */
export function advanceAutomaticDoors(doors:readonly Door[],bodies:readonly Pt[],
 now:number,powered:boolean):void{
 if(!powered)return;
 const handled=new Set<string>();
 for(const door of doors){
   if(door.operatingMode!=='automatic'||handled.has(door.id))continue;
   const leaves=operatingLeaves(doors,door);
   for(const leaf of leaves)handled.add(leaf.id);
   if(!automaticAssemblyAvailable(leaves))continue;
   const occupied=bodies.some(p=>leaves.some(leaf=>
      pointToSegment(p,leaf)<=AUTOMATIC_SENSOR_RANGE));
   if(occupied){
     for(const leaf of leaves){
       leaf.sensorOccupiedAt=now;
       if(!leaf.open){leaf.open=true;leaf.openedAt=now;}
       leaf.pushTarget=1;
     }
   }else{
     const last=Math.max(...leaves.map(d=>d.sensorOccupiedAt??d.openedAt));
     if(now-last>=AUTOMATIC_CLOSE_DELAY)
       for(const leaf of leaves)if(leaf.open){leaf.open=false;leaf.openedAt=now;}
   }
 }
}
