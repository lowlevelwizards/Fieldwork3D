/** P5: exaggerated, truncated-triangle FAL receiver crown.
 * Four stations, six vertices in each cross-section: half the P5 shell
 * triangles without sacrificing the main silhouette, but dramatically different massing. +X points muzzleward.
 * Roof and shoulders are intentionally oversized/stylized game-art forms.
 * P6: do not insert transition rings or bevels that do not change the read.
 */
import * as THREE from 'three';

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
function point(s:Station,n:number):[number,number,number]{
 const {x,top,bottom,sideHalfZ:w,roofHalfZ:r}=s;
 const shoulder=falUpperShoulderY(s);
 // Flat bottom, two purposeful long triangular shoulders, flat narrow roof.
 // No redundant lower bevel, no intermediate rings at tiny changes of slope.
 const ring:readonly (readonly [number,number])[]=[
  [bottom,-w],[bottom,w],[shoulder,w],
  [top,r],[top,-r],[shoulder,-w]
 ];
 return [x,ring[n][0],ring[n][1]];
}
export function addFALCrownedReceiver(
 root:THREE.Group,receiverId:string,index:number,material:THREE.Material
):THREE.Mesh{
 const verts:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  verts.push(...a,...b,...c);
 for(let i=0;i<FAL_UPPER_STATIONS.length-1;i++){
  for(let j=0;j<6;j++){
   const k=(j+1)%6,a=point(FAL_UPPER_STATIONS[i],j);
   const b=point(FAL_UPPER_STATIONS[i+1],j);
   const c=point(FAL_UPPER_STATIONS[i+1],k);
   const d=point(FAL_UPPER_STATIONS[i],k);
   tri(a,b,c);tri(a,c,d);
  }
 }
 const rear=FAL_UPPER_STATIONS[0],front=FAL_UPPER_STATIONS.at(-1)!;
 const center=(s:Station):[number,number,number]=>
  [s.x,(s.top+s.bottom)/2,0];
 for(let j=0;j<6;j++){
  const k=(j+1)%6;
  // P6 had inverted cap windings: they were culled from the outside.
  tri(center(rear),point(rear,j),point(rear,k));
  tri(center(front),point(front,k),point(front,j));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
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
  [.14,.12],[.14,.82],[2.64,.82],[2.64,.12]
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
  mesh.position.set(-1.14,-1.84,side*1.80);
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
