/** P5: exaggerated, truncated-triangle FAL receiver crown.
 * Four stations, six vertices in each cross-section: half the P5 shell
 * triangles without sacrificing the main silhouette, but dramatically different massing. +X points muzzleward.
 * Roof and shoulders are intentionally oversized/stylized game-art forms.
 * P6: do not insert transition rings or bevels that do not change the read.
 */
import * as THREE from 'three';
import {buildFNCrownMesh} from './fn-crowned-shell.ts';

type Station=Readonly<{
 x:number;top:number;bottom:number;sideHalfZ:number;roofHalfZ:number
}>;
export const FAL_UPPER_STATIONS:readonly Station[]=[
 {x:-6.60,top:1.55,bottom:-1.16,sideHalfZ:1.70,roofHalfZ:.62},
 {x:3.10,top:1.55,bottom:-1.16,sideHalfZ:1.70,roofHalfZ:.62}
];
/** Center section slopes for roughly two-thirds of its full vertical height.
 * At the short ends a lower shoulder limit prevents inverted rings. */
export function falUpperShoulderY(s:Station):number{
 return Math.max(s.bottom+.43,s.top-2.06);
}
function stationAt(x:number):Station{
 const stations=FAL_UPPER_STATIONS;
 for(let i=1;i<stations.length;i++){
  if(x<=stations[i].x){
   const a=stations[i-1],b=stations[i];
   const t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));
   return {
    x,top:a.top+(b.top-a.top)*t,bottom:a.bottom+(b.bottom-a.bottom)*t,
    sideHalfZ:a.sideHalfZ+(b.sideHalfZ-a.sideHalfZ)*t,
    roofHalfZ:a.roofHalfZ+(b.roofHalfZ-a.roofHalfZ)*t
   };
  }
 }
 return {...stations[stations.length-1],x};
}
/** EXACT same shoulder surface interpolation used by shell and identity marks.
 * No independently guessed Z for ports, tracks or the face of the receiver. */
export function falUpperSideHalfZ(y:number,x=1):number{
 const s=stationAt(x),shoulder=falUpperShoulderY(s);
 if(y>=shoulder){
  const t=Math.max(0,Math.min(1,(y-shoulder)/(s.top-shoulder)));
  return s.sideHalfZ+(s.roofHalfZ-s.sideHalfZ)*t;
 }
 return s.sideHalfZ;
}
export function addFALCrownedReceiver(
 root:THREE.Group,receiverId:string,index:number,material:THREE.Material
):THREE.Mesh{
 // Exact same vertex layout, triangle order, cap centers and normals as
 // the approved FAL P6 shell; only the duplicative tessellator is shared.
 const mesh=buildFNCrownMesh(FAL_UPPER_STATIONS,material,{
  shoulderY:falUpperShoulderY
 });
 mesh.name='family-receiver-'+receiverId+'-'+index;
 mesh.userData.falCrownedUpper=true;
 mesh.userData.falUpperStationCount=FAL_UPPER_STATIONS.length;
 mesh.userData.falTriangularP5=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

/** P6: intentionally plain rectangular ejection port. Two triangles,
 * directly following the slope; no ornamental chamfers or false scoop.
 */
export function addFALScoopedPort(root:THREE.Group,
 receiverId:string,index:number,material:THREE.Material):THREE.Mesh{
 const outline:readonly (readonly [number,number])[]=[
  [-.80,.12],[-.80,.82],[2.64,.82],[2.64,.12]
 ];
 const vertices:number[]=[];
 for(const [x,y] of outline)
  vertices.push(x,y,falUpperSideHalfZ(y,x)+.055);
 const indices:number[]=[];
 for(let i=1;i<outline.length-1;i++)
  indices.push(0,i+1,i);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-receiver-'+receiverId+'-'+index;
 mesh.userData.falEjectionPort=true;
 mesh.userData.falRectangularPort=true;
 mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.renderOrder=3;
 root.add(mesh);return mesh;
}
/** Two low-resolution steel discs provide the characteristic takedown
 * pivot landmark on each side; they are REPRESENTATIONAL, not operable. */
export function addFALPivotPair(root:THREE.Group,receiverId:string,
 startIndex:number,material:THREE.Material):THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 for(const side of [-1,1] as const){
  const geometry=new THREE.CylinderGeometry(.79,.79,.22,6,1);
  geometry.rotateX(Math.PI/2);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-receiver-'+receiverId+'-'+(startIndex+result.length);
  mesh.position.set(-2.05,-1.84,side*1.80);
  mesh.userData.falPivotSide=side;
  mesh.castShadow=true;mesh.receiveShadow=true;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
/** A single thick angled support, physically connected to receiver's new
 * shoulder below and the existing polymer handle above. */
export function addFALAngledCarrySupport(
 root:THREE.Group,receiverId:string,index:number,material:THREE.Material
):THREE.Mesh{
 const a=new THREE.Vector3(2.64,1.12,-1.10),
  b=new THREE.Vector3(2.52,3.25,-1.60);
 const axis=b.clone().sub(a),length=axis.length();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.52,length,.56),material);
 mesh.name='family-receiver-'+receiverId+'-'+index;
 mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
 mesh.userData.falCarrySupport=true;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
