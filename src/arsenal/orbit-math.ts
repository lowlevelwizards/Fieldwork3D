/** One workbench orbit convention for primary and secondary viewers.
 * Positive pointer movement to the right decreases the camera yaw; never
 * mirror controls independently in a new weapon family UI.
 */
import type * as THREE from 'three';

export const inspectOrbitYaw=(yaw:number,deltaX:number):number=>
 yaw-deltaX*.009;

export const inspectOrbitPitch=(pitch:number,deltaY:number,
 sensitivity:number,min:number,max:number):number=>
 Math.max(min,Math.min(max,pitch+deltaY*sensitivity));

/** No allocations during a demand-rendered orbit frame. */
export function positionInspectCamera(camera:THREE.PerspectiveCamera,
 target:THREE.Vector3,distance:number,yaw:number,pitch:number):void{
 const cosine=Math.cos(pitch);
 camera.position.set(target.x+distance*Math.sin(yaw)*cosine,
  target.y+distance*Math.sin(pitch),
  target.z+distance*Math.cos(yaw)*cosine);
 camera.lookAt(target);
}
