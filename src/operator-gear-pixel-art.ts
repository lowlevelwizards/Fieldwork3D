/** BT3R: actual nearest-filtered physical pixel marks, not coplanar quads.
 * Use the second UV channel for detail modulation, retaining the source
 * fabric/print map, existing AO vertices and reversible palette ownership.
 */
import * as THREE from 'three';
import {ART_PIXEL} from './rendering/material-art-scale.ts';
export type GearMark='webbing'|'padding'|'flap'|'band'|'medical'|'utility';
const cache=new Map<string,THREE.DataTexture>();
const linked=new WeakMap<THREE.Material,Map<string,THREE.MeshStandardMaterial>>();
export function gearPixelMap(mark:GearMark,w:number,h:number){
 const nx=Math.max(1,Math.ceil(w/ART_PIXEL)),ny=Math.max(1,Math.ceil(h/ART_PIXEL));
 const key=mark+':'+nx+':'+ny;let map=cache.get(key);if(map)return map;
 const pixels=new Uint8Array(nx*ny*4);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  let tone=255;
  if(mark==='webbing'&&y===Math.floor(ny/2)&&x%4!==3)tone=72;
  if(mark==='padding'&&(x%5===0||y===0))tone=112;
  if(mark==='flap'&&y===Math.max(0,ny-2))tone=94;
  if(mark==='band'&&y===Math.floor(ny*.6))tone=95;
  if(mark==='utility'&&y===Math.max(0,ny-2))tone=95;
  if(mark==='medical'){
   const cx=Math.floor(nx/2),cy=Math.floor(ny/2);
   if((x===cx&&Math.abs(y-cy)<=1)||(y===cy&&Math.abs(x-cx)<=1))tone=38;
  }
  // Reserve the upper-right corner as the neutral sample for non-art faces.
  if(x===nx-1&&y===ny-1)tone=255;
  const i=(y*nx+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=tone;pixels[i+3]=255;
 }
 map=new THREE.DataTexture(pixels,nx,ny,THREE.RGBAFormat);
 map.name='Fieldwork gear pixel '+key;map.channel=1;
 map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestFilter;
 map.generateMipmaps=false;map.wrapS=mark==='webbing'||mark==='padding'?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
 map.wrapT=THREE.ClampToEdgeWrapping;
 map.needsUpdate=true;cache.set(key,map);return map;
}
export function gearMarkedMaterial(source:THREE.Material,mark:GearMark,w:number,h:number):THREE.Material{
 if(!(source instanceof THREE.MeshStandardMaterial))return source;
 const map=gearPixelMap(mark,w,h),key=map.name;
 let variants=linked.get(source);if(!variants){variants=new Map();linked.set(source,variants);}
 let material=variants.get(key);if(material)return material;
 material=source.clone();material.name=key;
 material.aoMap=map;material.aoMapIntensity=1;material.needsUpdate=true;
 variants.set(key,material);return material;
}
/** Map only the outward +Z face of a box. Other faces sample a white corner.
 * The mark is exactly a physical pixel grid rather than an overlay surface. */
export function gearBoxMarkUV(geometry:THREE.BoxGeometry,w:number,h:number){
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
 const uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  uv[i*2]=n.getZ(i)>.5?p.getX(i)/w+.5:.999;
  uv[i*2+1]=n.getZ(i)>.5?p.getY(i)/h+.5:.999;
 }
 geometry.setAttribute('uv1',new THREE.BufferAttribute(uv,2));
}
export function syncGearMarkedMaterials(source:THREE.MeshStandardMaterial){
 for(const material of linked.get(source)?.values()??[]){
  material.color.copy(source.color);
  if(material.map!==source.map){material.map=source.map;material.needsUpdate=true;}
 }
}
