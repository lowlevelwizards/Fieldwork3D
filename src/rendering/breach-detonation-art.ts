/** V17: bounded, white-hot angular detonation followed by a flattened
 * fading after-flash. Residual dust stays in the existing atmosphere owner.
 * No additional render pass or event state. */
import * as THREE from 'three';
export const DETONATION_ART_LIFETIME=.46;
export type DetonationArtSample={scale:number;verticalScale:number;opacity:number};
export function createDetonationGeometry():THREE.BufferGeometry{
 // Three intersecting angular silhouettes, one mesh, no texture.
 const positions:number[]=[],colors:number[]=[];
 const tip=new THREE.Color(0xffdf91),inner=new THREE.Color(0xfff3cb),core=new THREE.Color(0xffffff);
 for(let plane=0;plane<3;plane++){
  const point=(i:number):number[]=>{
   const angle=i*Math.PI/8;
   const radius=i%2?.33:(i%4===0?1:.78);
   const u=Math.cos(angle)*radius,v=Math.sin(angle)*radius;
   return plane===0?[u,0,v]:plane===1?[u,v,0]:[0,u,v];
  };
  for(let i=0;i<16;i++){
   positions.push(...point(i),...point(i+1),0,0,0);
   const a=i%2?inner:tip,b=i%2?tip:inner;
   colors.push(a.r,a.g,a.b,b.r,b.g,b.b,core.r,core.g,core.b);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingSphere();
 return geometry;
}
export function sampleDetonationArt(age:number,out:DetonationArtSample):boolean{
 if(!Number.isFinite(age)||age<0||age>=DETONATION_ART_LIFETIME)return false;
 // Fast luminous onset, then a brief low-profile outward cue instead of
 // a giant sphere. Exact age sampling is independent of frame rate.
 if(age<.12){
  const t=age/.12;
  out.scale=14+6*t;out.verticalScale=out.scale*(.85-.25*t);
  out.opacity=1-.12*t;
 }else{
  const t=(age-.12)/(DETONATION_ART_LIFETIME-.12);
  out.scale=20+5*t;out.verticalScale=12*(1-t)*(.65+.35*(1-t));
  out.opacity=.88*(1-t)*(1-t)*(1-t);
 }
 return true;
}

/** Residue must not obscure the initial luminous graphic. */
export function detonationSmokeWeight(age:number):number{
 return Math.max(0,Math.min(1,(age-.09)/.23));
}
