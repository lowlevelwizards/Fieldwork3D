/** Activity-weighted furniture density budget. Optional furniture
 * must not consume all usable floor area. Essential appliances, sanitary
 * fixtures and workstations are deliberately exempt from this soft budget.
 */
import type {Room} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {maxSolidOccupancy} from './functional-space.ts';
const inRoom=(o:Obstacle,r:Room)=>o.x>r.x&&o.x<r.x+r.w&&
 o.y>r.y&&o.y<r.y+r.h;
const decorativeFrame=(o:Obstacle)=>o.fixture==='window-sill'||
 o.fixture==='glass-barrier' || o.fixture==='porch-post';
export function roomSolidFootprint(room:Room,objects:readonly Obstacle[]):number{
 return objects.reduce((area,o)=>
  area+(!decorativeFrame(o)&&inRoom(o,room)?o.w*o.h:0),0);
}
/** Conservative area accounting. Overlap validation is a separate hard rule. */
export function withinOptionalFurnitureBudget(room:Room,
 existing:readonly Obstacle[],additionalArea:number):boolean{
 if(room.kind==='hall')return false;
 const target=room.w*room.h*maxSolidOccupancy(room);
 return roomSolidFootprint(room,existing)+additionalArea<=target;
}
