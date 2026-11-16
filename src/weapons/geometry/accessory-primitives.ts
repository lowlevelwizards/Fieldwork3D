/** A3: small, per-weapon-owned faceted attachment geometry constructors.
 * Meshes/geometries are built only when equipment changes and disposed with
 * their owning weapon group. Shared A2 finish materials are never disposed.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mapBoxPixelUV} from '../../rendering/pixel-materials.ts';

export type AccessoryMesh=THREE.Mesh<THREE.BufferGeometry,THREE.Material>;
function attach(root:THREE.Group,geo:THREE.BufferGeometry,
 material:THREE.Material,name:string,shadow=true):AccessoryMesh{
 const mesh=new THREE.Mesh(geo,material);
 mesh.name=name;
 mesh.castShadow=shadow;mesh.receiveShadow=shadow;
 root.add(mesh);
 return mesh;
}
export function accessoryBox(root:THREE.Group,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number,
 material:THREE.Material,shadow=true):AccessoryMesh{
 const mesh=attach(root,mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),
  material,name,shadow);
 mesh.position.set(x,y,z);
 return mesh;
}
/** X-axis barrel/optic/light body, 6 or 8 faceted sides, with +X front. */
export function accessoryTube(root:THREE.Group,name:string,
 x:number,y:number,z:number,length:number,rearRadius:number,frontRadius:number,
 material:THREE.Material,sides:6|8=8,shadow=true):AccessoryMesh{
 if(!(length>0&&rearRadius>0&&frontRadius>0))throw Error('Invalid accessory tube');
 const geo=new THREE.CylinderGeometry(frontRadius,rearRadius,length,sides,1,false);
 geo.rotateZ(-Math.PI/2);
 const mesh=attach(root,geo,material,name,shadow);
 mesh.position.set(x,y,z);
 return mesh;
}
/** Forward-facing sight window: frame spans world Z/Y; opening looks down X. */
export function accessoryFrame(root:THREE.Group,name:string,
 x:number,y:number,z:number,width:number,height:number,
 thickness:number,edge:number,material:THREE.Material):AccessoryMesh{
 const shape=new THREE.Shape();
 shape.moveTo(-width/2,-height/2);
 shape.lineTo(width/2,-height/2);
 shape.lineTo(width/2,height/2);
 shape.lineTo(-width/2,height/2);
 shape.closePath();
 const hole=new THREE.Path();
 const iw=width/2-edge,ih=height/2-edge;
 hole.moveTo(-iw,-ih);hole.lineTo(-iw,ih);hole.lineTo(iw,ih);
 hole.lineTo(iw,-ih);hole.closePath();
 shape.holes.push(hole);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,steps:1,
  bevelEnabled:false,curveSegments:1});
 geo.translate(0,0,-thickness/2);
 // Shape is authored in XY. Turn the completed frame to face the weapon's
 // +X barrel axis: window width becomes world Z, thickness becomes world X.
 // Without this, the operator sees the edge while the side camera sees
 // a misleading square "window" (A3 sideways reflex sight regression).
 geo.rotateY(Math.PI/2);
 const mesh=attach(root,geo,material,name);
 mesh.position.set(x,y,z);
 return mesh;
}
export function accessoryProfile(root:THREE.Group,name:string,
 x:number,y:number,z:number,points:readonly (readonly [number,number])[],
 depth:number,material:THREE.Material):AccessoryMesh{
 const shape=new THREE.Shape();
 shape.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
 shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,
  bevelEnabled:false,curveSegments:1});
 geo.translate(0,0,-depth/2);
 const mesh=attach(root,geo,material,name);
 mesh.position.set(x,y,z);
 return mesh;
}
export type AccessoryBoxSpec=readonly [number,number,number,number,number,number];
/** One draw call for all separated same-finish mounts, without sharing a
 * geometry across owners: disposal remains compatible with weapon teardown.
 */
export function accessoryMergedBoxes(root:THREE.Group,name:string,
 boxes:readonly AccessoryBoxSpec[],material:THREE.Material):AccessoryMesh{
 const geometries=boxes.map(([x,y,z,w,h,d])=>{
  const g=new THREE.BoxGeometry(w,h,d);
  g.translate(x,y,z);
  return g;
 });
 const geo=mergeGeometries(geometries,false);
 for(const g of geometries)g.dispose();
 if(!geo)throw Error('Unable to merge accessory hardware '+name);
 return attach(root,geo,material,name);
}
