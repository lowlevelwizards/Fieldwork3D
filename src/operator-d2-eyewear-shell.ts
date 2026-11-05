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
