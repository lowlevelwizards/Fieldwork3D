/** P5: exaggerated, truncated-triangle FAL receiver crown.
 * Six stations, eight vertices in each cross-section: same low-poly mesh
 * density as P4, but dramatically different massing. +X points muzzleward.
 * Roof and shoulders are intentionally oversized/stylized game-art forms.
 */
import * as THREE from 'three';

type Station=Readonly<{
 x:number;top:number;bottom:number;sideHalfZ:number;roofHalfZ:number
}>;
export const FAL_UPPER_STATIONS:readonly Station[]=[
 {x:-6.60,top:1.08,bottom:-.87,sideHalfZ:1.55,roofHalfZ:.65},
 {x:-5.84,top:1.66,bottom:-1.14,sideHalfZ:1.81,roofHalfZ:.67},
 {x:-5.36,top:1.83,bottom:-1.23,sideHalfZ:1.85,roofHalfZ:.67},
 {x:2.42,top:1.83,bottom:-1.23,sideHalfZ:1.85,roofHalfZ:.67},
 {x:3.27,top:1.54,bottom:-.95,sideHalfZ:1.70,roofHalfZ:.63},
 {x:3.85,top:1.04,bottom:-.62,sideHalfZ:1.51,roofHalfZ:.61}
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
 if(y>=s.bottom+.24)return s.sideHalfZ;
 return s.sideHalfZ-.16*Math.max(0,Math.min(1,(s.bottom+.24-y)/.24));
}
function point(s:Station,n:number):[number,number,number]{
 const {x,top,bottom,sideHalfZ:w,roofHalfZ:r}=s;
 const shoulder=falUpperShoulderY(s);
 const ring:readonly (readonly [number,number])[]=[
  [bottom,-w+.16],[bottom,w-.16],
  [bottom+.24,w],[shoulder,w],
  [top,r],[top,-r],
  [shoulder,-w],[bottom+.24,-w]
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
  for(let j=0;j<8;j++){
   const k=(j+1)%8,a=point(FAL_UPPER_STATIONS[i],j);
   const b=point(FAL_UPPER_STATIONS[i+1],j);
   const c=point(FAL_UPPER_STATIONS[i+1],k);
   const d=point(FAL_UPPER_STATIONS[i],k);
   tri(a,b,c);tri(a,c,d);
  }
 }
 const rear=FAL_UPPER_STATIONS[0],front=FAL_UPPER_STATIONS.at(-1)!;
 const center=(s:Station):[number,number,number]=>
  [s.x,(s.top+s.bottom)/2,0];
 for(let j=0;j<8;j++){
  const k=(j+1)%8;
  tri(center(rear),point(rear,k),point(rear,j));
  tri(center(front),point(front,j),point(front,k));
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

/** One large concave-looking angular shadow following the actual crown
 * surface instead of a floating, fronto-parallel rectangular port decal.
 * It represents the distinctive raised right-side ejection scallop, not
 * its operational internals. One six-triangle face, zero tiny hardware.
 */
export function addFALScoopedPort(root:THREE.Group,
 receiverId:string,index:number,material:THREE.Material):THREE.Mesh{
 const outline:readonly (readonly [number,number])[]=[
  [-.05,1.01],[.15,1.39],[.82,1.61],[2.36,1.56],
  [2.92,1.16],[2.87,.79],[2.36,.70],[.42,.70]
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
 mesh.userData.falSculptedScallop=true;
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
  const geometry=new THREE.CylinderGeometry(.55,.55,.18,8,1);
  geometry.rotateX(Math.PI/2);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-receiver-'+receiverId+'-'+(startIndex+result.length);
  mesh.position.set(-1.14,-1.83,side*1.74);
  mesh.userData.falPivotSide=side;
  mesh.castShadow=true;mesh.receiveShadow=true;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
/** Surface-following angular steel boss / runner: one solid mesh whose
 * inner face intersects the receiver while the exterior follows the tapered
 * top, keeping details attached at ANY silhouette strength. */
export function addFALLeftSurfacePlate(
 root:THREE.Group,receiverId:string,index:number,
 points:readonly (readonly [number,number])[],
 projection:number,material:THREE.Material,tag:string
):THREE.Mesh{
 const n=points.length,vertices:number[]=[],indices:number[]=[];
 for(const outside of [true,false]){
  for(const [x,y] of points){
   const z=falUpperSideHalfZ(y,x)+(outside?projection:-.08);
   vertices.push(x,y,-z);
  }
 }
 for(let i=1;i<n-1;i++){
  indices.push(0,i+1,i);
  indices.push(n,n+i,n+i+1);
 }
 for(let i=0;i<n;i++){
  const j=(i+1)%n;
  indices.push(i,j,n+j,i,n+j,n+i);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-receiver-'+receiverId+'-'+index;
 mesh.userData[tag]=true;
 mesh.userData.falSurfaceFitted=true;
 mesh.castShadow=false;mesh.receiveShadow=false;
 root.add(mesh);return mesh;
}
/** A single thick angled support, physically connected to receiver's new
 * shoulder below and the existing polymer handle above. */
export function addFALAngledCarrySupport(
 root:THREE.Group,receiverId:string,index:number,material:THREE.Material
):THREE.Mesh{
 const a=new THREE.Vector3(3.18,1.28,-1.12),
  b=new THREE.Vector3(2.89,3.25,-1.60);
 const axis=b.clone().sub(a),length=axis.length();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.52,length,.56),material);
 mesh.name='family-receiver-'+receiverId+'-'+index;
 mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
 mesh.userData.falCarrySupport=true;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
