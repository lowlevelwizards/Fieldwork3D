/** D2 Eyewear R2: solid, thick polygonal housings instead of tiny rim bars.
 * Coordinates: X across, Y vertical, -Z toward the camera. Shapes are created
 * exactly once and material references stay shared with Wardrobe Head Layers.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';

export type EyePoint=readonly [number,number];
export type EyePolygon=readonly EyePoint[];
export type EyeFamily='open-frame'|'pilot'|'wedge'|'shield'|'compact-seal'|'field-seal'|'cups';
export interface EyeProfile{
 family:EyeFamily;
 width:number;
 height:number;
 frontZ:number;
 housingDepth:number;
 lenses:number;
}
export function eyePolygon(points:EyePolygon):THREE.Shape{
 if(points.length<3)throw new Error('D2 eyewear polygon needs >=3 points');
 const shape=new THREE.Shape();
 points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
 shape.closePath();return shape;
}
function dimension(points:EyePolygon){
 return {
  minX:Math.min(...points.map(p=>p[0])),
  maxX:Math.max(...points.map(p=>p[0])),
  minY:Math.min(...points.map(p=>p[1])),
  maxY:Math.max(...points.map(p=>p[1]))
 };
}
export function offsetPolygon(points:EyePolygon,dx:number,dy=0):EyePoint[]{
 return points.map(([x,y])=>[x+dx,y+dy]);
}
export function solidBlock(parent:THREE.Group,material:THREE.Material,
 name:string,x:number,y:number,z:number,w:number,h:number,d:number):THREE.Mesh{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),material);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
/** One shared highlight material per live lens material: no tiny specular
 * lines, no frame-colored fake lenses, and no pose-time mesh allocations.
 * A WeakMap ties its lifetime to that rig's original lens material.
 */
const lensFacetCache=new WeakMap<THREE.Material,THREE.MeshBasicMaterial>();
export function lensFacetMaterial(lens:THREE.Material):THREE.MeshBasicMaterial{
 let facet=lensFacetCache.get(lens);
 if(!facet){
  facet=new THREE.MeshBasicMaterial({color:0xf3f2df,opacity:.085,
   transparent:true,depthWrite:false,side:THREE.DoubleSide});
  lensFacetCache.set(lens,facet);
 }
 return facet;
}
/** One large diagonal glint per lens, deliberately inset into its opening.
 * Move top vertices toward the polygon center to avoid edge overshoot.
 * The broad four-sided facet uses only two triangles, never microdetail.
 */
function lensFacet(opening:EyePolygon):THREE.ShapeGeometry{
 const ranked=[...opening].sort((a,b)=>b[1]-a[1]).slice(0,2).sort((a,b)=>a[0]-b[0]);
 const center:EyePoint=[
  opening.reduce((total,p)=>total+p[0],0)/opening.length,
  opening.reduce((total,p)=>total+p[1],0)/opening.length
 ];
 const mix=(p:EyePoint,f:number):EyePoint=>[
  p[0]*(1-f)+center[0]*f,p[1]*(1-f)+center[1]*f
 ];
 const shape=eyePolygon([
  mix(ranked[0],.18),mix(ranked[1],.18),
  mix(ranked[1],.52),mix(ranked[0],.66)
 ]);
 return new THREE.ShapeGeometry(shape);
}
/** Front shape with real holes and *extruded* exterior walls. No segmented
 * hairline perimeter pieces; inset 2D lens fills do not change the silhouette.
 */
export function solidFrame(parent:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,name:string,
 outer:EyePolygon,openings:readonly EyePolygon[],
 frontZ:number,housingDepth:number,family:EyeFamily):THREE.Mesh{
 const shape=eyePolygon(outer);
 for(const opening of openings){
  const hole=new THREE.Path();
  opening.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));
  hole.closePath();shape.holes.push(hole);
 }
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:housingDepth,steps:1,bevelEnabled:false,curveSegments:1
 });
 const shell=new THREE.Mesh(geometry,frame);
 shell.name=name+'-housing';shell.position.z=frontZ;
 shell.castShadow=true;shell.receiveShadow=true;
 const extent=dimension(outer);
 const profile:EyeProfile={family,width:extent.maxX-extent.minX,
  height:extent.maxY-extent.minY,frontZ,housingDepth,lenses:openings.length};
 shell.userData.d2EyeProfile=profile;
 parent.add(shell);
 openings.forEach((opening,i)=>{
  const pane=new THREE.Mesh(new THREE.ShapeGeometry(eyePolygon(opening)),lens);
  pane.name=name+'-'+i+'-lens';
  pane.position.z=frontZ+Math.min(.12,housingDepth*.22);
  pane.castShadow=false;pane.receiveShadow=false;
  pane.renderOrder=2;
  parent.add(pane);
  // Single oversized graphic reflection, slightly in front of the lens.
  // This gives even clear glass a material read at mobile thumbnail size.
  const facet=new THREE.Mesh(lensFacet(opening),lensFacetMaterial(lens));
  facet.name=name+'-'+i+'-lens-facet';
  facet.position.z=pane.position.z-.055;
  facet.castShadow=false;facet.receiveShadow=false;facet.renderOrder=3;
  parent.add(facet);
 });
 return shell;
}
/** Silhouette as a Y-Z wedge, given coordinates [negativeZ, Y]. A thick
 * extruded side slab makes wraparound/visor temples visible in profile.
 */
export function sideFin(parent:THREE.Group,material:THREE.Material,
 name:string,side:-1|1,atX:number,width:number,yz:EyePolygon):THREE.Mesh{
 const geometry=new THREE.ExtrudeGeometry(eyePolygon(yz),{
  depth:width,steps:1,bevelEnabled:false,curveSegments:1
 });
 geometry.rotateY(Math.PI/2);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name+(side<0?'-left':'-right');
 mesh.position.x=side*atX-width/2;
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function octagon(cx:number,cy:number,rx:number,ry:number):EyePoint[]{
 const pts:EyePoint[]=[];
 for(let i=0;i<8;i++){
  const a=Math.PI/4*i+Math.PI/8;
  pts.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);
 }
 return pts;
}
