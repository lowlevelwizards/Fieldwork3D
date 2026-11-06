/** Reusable game-art prisms for highly simplified exterior silhouettes.
 * This is an art-only geometry helper. No ballistics, mechanism or assembly data.
 * Coordinates are the existing local XY weapon view, with depth along Z.
 * Construct ONLY on configuration changes; never inside the frame loop.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from '../../rendering/pixel-materials.ts';
export type Outline=readonly (readonly [number,number])[];
export type SlotName='stock'|'receiver'|'grip'|'magazine'|'handguard'|'barrel';
export const GAME_MUZZLE_X=19.5;

const prepare=(root:THREE.Group,slot:SlotName,id:string,n:number,
 geometry:THREE.BufferGeometry,material:THREE.Material)=>{
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-'+slot+'-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
};
/** A single thick wedge or curved stepped silhouette as ONE low-vertex mesh.
 * The polygon is deliberately exterior-only. 3D depth is symmetric about z=0.
 */
export function addOutline(root:THREE.Group,slot:SlotName,id:string,n:number,
 points:Outline,depth:number,material:THREE.Material){
 if(points.length<3||points.length>12||depth<=0)
  throw new Error('Weapon outline must have 3–12 points and positive depth');
 const [first,...rest]=points,shape=new THREE.Shape();
 shape.moveTo(first[0],first[1]);
 for(const point of rest)shape.lineTo(point[0],point[1]);
 shape.closePath();
 const geom=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,
  curveSegments:1});
 geom.translate(0,0,-depth/2);
 return prepare(root,slot,id,n,geom,material);
}
/** Cubes remain appropriate for parts that really ARE simple rectangular masses. */
export function addCuboid(root:THREE.Group,slot:SlotName,id:string,n:number,
 x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){
 const geom=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 const mesh=prepare(root,slot,id,n,geom,material);
 mesh.position.set(x,y,z);
 return mesh;
}
/** Raises a small set of meshed profile segments without filling negative space. */
export function addBar(root:THREE.Group,slot:SlotName,id:string,n:number,
 start:readonly [number,number],end:readonly [number,number],
 width:number,depth:number,material:THREE.Material){
 const dx=end[0]-start[0],dy=end[1]-start[1];
 const l=Math.hypot(dx,dy),nx=-dy/l*width/2,ny=dx/l*width/2;
 return addOutline(root,slot,id,n,[
  [start[0]+nx,start[1]+ny],[end[0]+nx,end[1]+ny],
  [end[0]-nx,end[1]-ny],[start[0]-nx,start[1]-ny]
 ],depth,material);
}

/** Six-sided PRI-style tube: true 3D faceted cross-section with one extrusion.
 * Low-polygon exterior only; matches the regular family slot naming/lighting.
 */
export function addFacetedTube(root:THREE.Group,slot:SlotName,id:string,n:number,
 startX:number,endX:number,radius:number,material:THREE.Material){
 const geometry=new THREE.CylinderGeometry(radius,radius,endX-startX,6,1);
 geometry.rotateZ(-Math.PI/2);
 const mesh=prepare(root,slot,id,n,geometry,material);
 mesh.position.set((startX+endX)/2,0,0);
 return mesh;
}
