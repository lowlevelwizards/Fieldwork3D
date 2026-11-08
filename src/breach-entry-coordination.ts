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

/** Stack placement is measured in the real door frame, not world X/Y.
 * A diagonally mounted door has the same approach-side geometry as a
 * horizontal or vertical one. This proposes candidates only: the caller
 * still owns player-intel validation, swept routes and order authoring.
 */
export function stackApproachPositions(door:Door,from:Pt):Pt[]{
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy);
 if(width<.001)return [];
 const tx=dx/width,ty=dy/width,nx=-ty,ny=tx;
 const approach=Math.sign((from.x-center.x)*nx+
   (from.y-center.y)*ny)||1;
 return [-38,38,-12,12].map(lateral=>({
   x:center.x+tx*lateral+nx*approach*19,
   y:center.y+ty*lateral+ny*approach*19
 }));
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
