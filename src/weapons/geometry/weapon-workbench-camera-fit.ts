/** Visual-only orthographic/perspective inspection framing.
 * Fits the exterior weapon bounds, never touches combat or model transforms.
 */
import * as THREE from 'three';
export function workbenchFitDistance(bounds:THREE.Box3,width:number,height:number,
 fovDegrees=37,fill=.78):number{
 if(bounds.isEmpty()||width<=0||height<=0)return 51;
 const size=bounds.getSize(new THREE.Vector3());
 const halfTan=Math.tan(fovDegrees*Math.PI/360);
 const aspect=width/height;
 const horizontal=size.x/(2*halfTan*aspect*fill);
 const vertical=size.y/(2*halfTan*.68);
 const depthPad=Math.max(0,size.z*.36);
 return THREE.MathUtils.clamp(Math.max(horizontal,vertical)+depthPad,27,110);
}
