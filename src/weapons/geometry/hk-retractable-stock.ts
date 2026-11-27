/** Exaggerated classic HK twin-rail retractable stock, exterior artwork.
 * Extended factory configuration only. No fake collapsible gameplay control.
 * The G3A4 and HK53A3 share the silhouette construction, not the real parts.
 */
import * as THREE from 'three';
import {addCuboid,addOutline,type Outline} from './profile-primitives.ts';
export function addHKRetractableStock(
 root:THREE.Group,id:string,rear:number,
 metal:THREE.Material,dark:THREE.Material):void{
 const start=rear+.58,end=-6.15;
 // WC2.3: give the rear silhouette more visual weight in the miniature,
 // differentiated by family rather than uniform thickness.
 const heavy=id==='hk-g3-retract-stock',compact=id==='hk53-retract-stock';
 for(const [i,z] of [-1.16,1.16].entries()){
  const rail=addCuboid(root,'stock',id,i,
   (start+end)/2,.42,z,end-start,heavy?.84:compact?.72:.64,heavy?.70:.62,metal);
  rail.userData.hkRetractRail=true;
 }
 // One purposely massive, slightly hooked miniature buttplate. The whole
 // rear assembly terminates at the declared stock socket.
 // WC2.2 exterior caricature trials: broader rifle rear, shallower
 // mid-family transition, compact hooked rear. Keep the common vocabulary
 // and original shoulder datum. These are game-art forms, not specifications.
 const profile:Outline=id==='hk-g3-retract-stock'?[
  [rear,1.31],[rear+1.03,1.31],[rear+.97,-1.45],
  [rear+.78,-2.62],[rear+.32,-2.99],[rear,-2.83]
 ]:id==='hk53-retract-stock'?[
  [rear,1.24],[rear+.91,1.18],[rear+.84,-.52],
  [rear+1.18,-1.56],[rear+.75,-2.37],[rear+.24,-2.75],[rear,-2.54]
 ]:[
  [rear,1.28],[rear+.77,1.25],[rear+.79,-1.43],
  [rear+.64,-2.47],[rear+.24,-2.86],[rear,-2.67]
 ];
 const butt=addOutline(root,'stock',id,2,profile,3.52,dark);
 butt.userData.hkRetractButt=true;
 // A shallow coupling overlaps the real receiver rather than hovering.
 const coupling=addCuboid(root,'stock',id,3,-6.34,.42,0,.92,
  1.16,3.02,metal);
 coupling.userData.hkRetractCoupling=true;
}
