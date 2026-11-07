/** Visual-only orthographic/perspective inspection framing.
 * Fits the exterior weapon bounds, never touches combat or model transforms.
 */
import * as THREE from 'three';
export function workbenchFitDistance(bounds:THREE.Box3,width:number,height:number,
 fovDegrees=37,fill=.78,compactPreview=false):number{
 if(bounds.isEmpty()||width<=0||height<=0)return 51;
 const size=bounds.getSize(new THREE.Vector3());
 const halfTan=Math.tan(fovDegrees*Math.PI/360);
 const aspect=width/height;
 // The viewport must contain scopes, longer fixed stocks and muzzle devices.
 // Apply the same margin policy to both axes; never crop a long AR by default.
 const safeFill=THREE.MathUtils.clamp(fill,.55,.82);
 const horizontal=size.x/(2*halfTan*aspect*safeFill);
 // Stockless K is intentionally short. The standard minimum camera distance
 // makes it unnecessarily small on mobile; keep other weapons' fit unchanged.
 const vertical=size.y/(2*halfTan*Math.min(safeFill,compactPreview?.80:.72));
 const depthPad=Math.max(0,size.z*.36);
 return THREE.MathUtils.clamp(Math.max(horizontal,vertical)+depthPad,
  compactPreview?24:27,170);
}

/** True mesh-bounds center; configured stock anchors are not guaranteed to
 * coincide with the rendered back of a stock, especially on AK skeletons.
 * This is display-only; weapon contacts and longitudinal scale stay intact.
 */
export function workbenchFitCenter(bounds:THREE.Box3):readonly [number,number]{
 if(bounds.isEmpty())return [0,0];
 return [(bounds.min.x+bounds.max.x)/2,(bounds.min.y+bounds.max.y)/2];
}
