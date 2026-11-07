/** A planned entry cannot begin simply because its WAIT timer elapsed.
 * Verify the authoritative door state. This does not grant clearance,
 * move an actor, or replace collision/doorway reservations.
 */
import {doorClear} from './breach-door.ts';
import {OPERATOR_RADIUS,doorCenter,type Pt} from './breach-core.ts';
import type {Door} from './breach-core.ts';
export type EntryDoorGate='ready'|'pending'|'missing';
export function entryDoorState(door:Door|undefined):EntryDoorGate{
 if(!door)return 'missing';
 return doorClear(door)?'ready':'pending';
}

/** A generated squad-entry MOVE can pick up its own already-authored
 * clearing heading once the full torso has reached the room side of the
 * physical threshold. This is a presentation/aim handoff, not a permission
 * to pass a door: the motor and collision authority still own traversal.
 *
 * Destination side is stable across horizontal, vertical and reversed
 * door endpoint order. A station on the plane or the approach side cannot
 * begin the clearing turn early. No hidden enemies or visibility is read.
 */
export function entryClearanceForLook(door:Door|undefined,
 actorPosition:Pt,destination:Pt):boolean{
 if(!door)return false;
 const center=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy);
 if(width<.001)return false;
 const nx=-dy/width,ny=dx/width;
 const side=(p:Pt)=>(p.x-center.x)*nx+(p.y-center.y)*ny;
 const target=side(destination);
 const current=side(actorPosition);
 // The aim transition is allowed only with a complete shoulder clearance
 // behind the body. The swept motor may still reject forward movement.
 const clearance=OPERATOR_RADIUS+8;
 return Math.abs(target)>clearance&&
   current*target>0&&Math.abs(current)>=clearance;
}
