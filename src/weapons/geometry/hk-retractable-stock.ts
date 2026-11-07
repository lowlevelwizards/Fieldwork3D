/** Exaggerated classic HK twin-rail retractable stock, exterior artwork.
 * Extended factory configuration only. No fake collapsible gameplay control.
 * The G3A4 and HK53A3 share the silhouette construction, not the real parts.
 */
import * as THREE from 'three';
import {addCuboid,addOutline} from './profile-primitives.ts';
export function addHKRetractableStock(
 root:THREE.Group,id:string,rear:number,
 metal:THREE.Material,dark:THREE.Material):void{
 const start=rear+.58,end=-6.15;
 // Two side-mounted rails visibly hug the receiver and join the butt.
 for(const [i,z] of [-1.16,1.16].entries()){
  const rail=addCuboid(root,'stock',id,i,
   (start+end)/2,.42,z,end-start,.52,.52,metal);
  rail.userData.hkRetractRail=true;
 }
 // One purposely massive, slightly hooked miniature buttplate. The whole
 // rear assembly terminates at the declared stock socket.
 const butt=addOutline(root,'stock',id,2,[
  [rear,1.31],[rear+.58,1.31],[rear+.58,-1.83],
  [rear+.42,-2.72],[rear+.14,-2.99],[rear,-2.78]
 ],3.52,dark);
 butt.userData.hkRetractButt=true;
 // A shallow coupling overlaps the real receiver rather than hovering.
 const coupling=addCuboid(root,'stock',id,3,-6.34,.42,0,.92,
  1.16,3.02,metal);
 coupling.userData.hkRetractCoupling=true;
}
