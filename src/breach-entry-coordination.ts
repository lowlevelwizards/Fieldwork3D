/** A planned entry cannot begin simply because its WAIT timer elapsed.
 * Verify the authoritative door state. This does not grant clearance,
 * move an actor, or replace collision/doorway reservations.
 */
import {doorClear,doorWouldStrikeActors} from './breach-door.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
import {OPERATOR_RADIUS,doorCenter,type Pt} from './breach-core.ts';
import type {Door} from './breach-core.ts';
export type EntryDoorGate='ready'|'pending'|'missing';
export function entryDoorState(door:Door|undefined,
 world?:SessionWorldGeometry):EntryDoorGate{
 if(!door)return 'missing';
 return doorClear(door,world)?'ready':'pending';
}

/** D3.15A3: a generated squad's leader can physically reach the far
 * side of an already OPEN entrance via a valid (possibly non-straight)
 * 60Hz motor route, while the generic straight body-width sample remains
 * 'pending'. Followers may then attempt their existing authored MOVE.
 * This is NOT doorClear, collision clearance, plan completion or a grant
 * to move across the leaf: each subsequent footstep stays fully swept.
 */
export function leaderBeyondOpenEntry(
 door:Door|undefined,leader:Pt|undefined,
 waiting:Pt,interiorGoal:Pt|undefined
):boolean{
 if(!door||!leader||!interiorGoal||!door.open||
    door.locked||door.wedged||door.jammed||door.heldBy||
    (door.openFraction??0)<.72)return false;
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy);
 if(width<OPERATOR_RADIUS*2+4)return false;
 const center=doorCenter(door),nx=-dy/width,ny=dx/width;
 const side=(p:Pt)=>(p.x-center.x)*nx+(p.y-center.y)*ny;
 const lead=side(leader),follower=side(waiting),goal=side(interiorGoal);
 // Require an entire torso clear of the plane and a stable interior
 // destination opposite the waiter's actual frame side.
 return Math.abs(lead)>=OPERATOR_RADIUS+8&&
   Math.abs(goal)>=OPERATOR_RADIUS+8&&
   Math.abs(follower)>=4&&
   lead*goal>0&&follower*goal<0;
}

/** Stack placement is measured in the real door frame, not world X/Y.
 * A diagonally mounted door has the same approach-side geometry as a
 * horizontal or vertical one. This proposes candidates only: the caller
 * still owns player-intel validation, swept routes and order authoring.
 */
export function doorOpensTowardApproach(door:Door,from:Pt):boolean{
 const center=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy);
 if(width<20||door.swing===undefined||door.kind==='sliding'||door.kind==='shutter')return false;
 const nx=-dy/width,ny=dx/width;
 const side=Math.sign((from.x-center.x)*nx+(from.y-center.y)*ny)||1;
 const check={x:center.x+nx*side*24,y:center.y+ny*side*24};
 return doorWouldStrikeActors({...door,openFraction:0},1.02,[check],OPERATOR_RADIUS+1);
}
export function stackApproachPositions(door:Door,from:Pt):Pt[]{
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy);
 if(width<.001)return [];
 const tx=dx/width,ty=dy/width,nx=-ty,ny=tx;
 const approach=Math.sign((from.x-center.x)*nx+
   (from.y-center.y)*ny)||1;
 const regular=[-38,38,-12,12].map(lateral=>({
   x:center.x+tx*lateral+nx*approach*19,
   y:center.y+ty*lateral+ny*approach*19
 }));
 if(!doorOpensTowardApproach(door,from))return regular;
 // A door swinging toward the team makes the two near-center stack slots
 // unsafe. Keep the front two off the leaf arc; stage the next two behind
 // its swept envelope. These are actual MOVE goals, not per-tick retreats.
 // The previous -14/+14 at 53 and -25/+25 at 62 produced
 // same-side pockets only ~14 units apart: two full-size operators
 // physically cannot hold those two slots simultaneously. The rear four
 // must be pairwise >23 apart while remaining inside the existing 68-unit
 // handle-reach envelope. Actual leaf sweep and intel route validation
 // are still owned by planStack; these are only candidate positions.
 const rear=[-32,32,-13,13].map((lateral,i)=>({
  x:center.x+tx*lateral+nx*approach*(i<2?48:66),
  y:center.y+ty*lateral+ny*approach*(i<2?48:66)
 }));
 // Q5: pre-opened leaves can be body-pushed all the way to the actual
 // 118-degree hinge stop DURING formation. Keep two fixed outer pockets
 // available from the start rather than assigning an unsafe jamb point
 // that becomes obstructed only after another teammate touches the leaf.
 // The caller still checks actual swept physical clearance and reachability.
 const wide=door.open&&(door.openFraction??0)>.1?
  [-51,51].map(lateral=>({
   x:center.x+tx*lateral+nx*approach*44,
   y:center.y+ty*lateral+ny*approach*44
  })):[];
 return [regular[0],regular[1],...rear,regular[2],regular[3],...wide];
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
