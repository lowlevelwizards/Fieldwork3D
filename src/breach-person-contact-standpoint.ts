/** Grounded hand-contact standoff for restrained or compliant people.
 * The actor approaches a free space beside the person, never their
 * collision center. Simulation still verifies sightline and reach.
 */
import type {Pt} from './breach-core.ts';
export const PERSON_CONTACT_REACH=42;
/** Prefer a comfortable full-body gap; the last few units are hand reach. */
export const PERSON_CONTACT_STANDOFF=39;
/** Fixed angular preference shared by R6.2 person-contact episodes. */
export const PERSON_CONTACT_OFFSETS=Object.freeze([0,.52,-.52,1.04,-1.04,1.57,-1.57]);
/** Geometry-only candidate selection; the caller validates actual body/route
 * swept clearance and occupancy. Never returns an occupied target center. */
export function contactStandpointAtRadius(
 from:Pt,target:Pt,radius:number,offsets:readonly number[],
 valid:(point:Pt)=>boolean
):Pt|null{
 if(!Number.isFinite(radius)||radius<=0)return null;
 const bearing=Math.atan2(from.y-target.y,from.x-target.x);
 for(const offset of offsets){
  const theta=bearing+offset;
  const point={x:target.x+Math.cos(theta)*radius,
    y:target.y+Math.sin(theta)*radius};
  if(valid(point))return point;
 }
 return null;
}
