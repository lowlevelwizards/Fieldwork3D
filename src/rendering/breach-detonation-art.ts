/** V17: bounded, white-hot angular detonation followed by a flattened
 * fading after-flash. Residual dust stays in the existing atmosphere owner.
 * No additional render pass or event state. */
import * as THREE from 'three';
import {createMuzzleFlashGeometry} from './breach-muzzle-flash-art.ts';
export const DETONATION_ART_LIFETIME=.46;
export type DetonationArtSample={scale:number;verticalScale:number;opacity:number};
export function createDetonationGeometry():THREE.BufferGeometry{
 const geometry=createMuzzleFlashGeometry();
 geometry.scale(1/3.5,1/3.5,1/3.5);
 const color=geometry.getAttribute('color');
 const tip=new THREE.Color(0xffe1a5),core=new THREE.Color(0xfffdf5);
 for(let i=0;i<color.count;i++){
  const c=i%3===2?core:tip;color.setXYZ(i,c.r,c.g,c.b);
 }
 return geometry;
}
export function sampleDetonationArt(age:number,out:DetonationArtSample):boolean{
 if(!Number.isFinite(age)||age<0||age>=DETONATION_ART_LIFETIME)return false;
 // Fast luminous onset, then a brief low-profile outward cue instead of
 // a giant sphere. Exact age sampling is independent of frame rate.
 if(age<.12){
  const t=age/.12;
  out.scale=5+6*t;out.verticalScale=out.scale*(1-.45*t);
  out.opacity=.94-.24*t;
 }else{
  const t=(age-.12)/(DETONATION_ART_LIFETIME-.12);
  out.scale=11+7*t;out.verticalScale=6.05*(1-t)*(.65+.35*(1-t));
  out.opacity=.70*(1-t)*(1-t);
 }
 return true;
}
