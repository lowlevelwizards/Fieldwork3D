/** D3.1: algebraically conservative motor-door broadphase.
 * A real hinge tip lies no farther than 1.5*frameWidth from the
 * original frame center; a sliding panel shifted by one frame width
 * has the same bound. Manhattan frame width is deliberately >= Euclidean.
 * The rectangle includes the entire proposed motor segment. A false
 * positive costs only a narrowphase test; false negatives are forbidden.
 * No cache, scene index, timing dependence or geometry simplification.
 */
import type {Door,Pt} from './breach-core.ts';
export function nearMotorDoorStroke(
 door:Door,from:Pt,to:Pt,padding:number
):boolean{
 const radius=1.5*(Math.abs(door.b.x-door.a.x)+
  Math.abs(door.b.y-door.a.y))+Math.max(0,padding)+.01;
 const cx=(door.a.x+door.b.x)*.5,cy=(door.a.y+door.b.y)*.5;
 return cx>=Math.min(from.x,to.x)-radius&&
  cx<=Math.max(from.x,to.x)+radius&&
  cy>=Math.min(from.y,to.y)-radius&&
  cy<=Math.max(from.y,to.y)+radius;
}
