/** Grounded hand-contact standoff for restrained or compliant people.
 * The actor approaches a free space beside the person, never their
 * collision center. Simulation still verifies sightline and reach.
 */
import type {Pt} from './breach-core.ts';
export const PERSON_CONTACT_REACH=36;
export function personContactStandpoint(from:Pt,target:Pt,valid:(point:Pt)=>boolean):Pt|null{
 const bearing=Math.atan2(from.y-target.y,from.x-target.x);
 for(const offset of [0,.52,-.52,1.04,-1.04,1.57,-1.57]){
  const theta=bearing+offset;
  const point={x:target.x+Math.cos(theta)*31,
    y:target.y+Math.sin(theta)*31};
  if(valid(point))return point;
 }
 return null;
}
