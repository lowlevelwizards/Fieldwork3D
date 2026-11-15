/** P4 R1A: FAL-specific, eight-facet crowned receiver shell.
 * Deliberately replaces the constant-Z side-profile extrusion. The broad
 * trapezoidal shoulder narrowing must be visible from the WORKBENCH camera.
 * +X muzzle, +Y up, +/-Z weapon sides. No live-frame allocations.
 */
import * as THREE from 'three';

type Station=Readonly<{
 x:number;top:number;bottom:number;sideHalfZ:number;roofHalfZ:number
}>;
export const FAL_UPPER_STATIONS:readonly Station[]=[
 {x:-6.60,top:1.08,bottom:-.87,sideHalfZ:1.40,roofHalfZ:1.04},
 {x:-5.84,top:1.66,bottom:-1.14,sideHalfZ:1.64,roofHalfZ:1.15},
 {x:-5.36,top:1.83,bottom:-1.23,sideHalfZ:1.69,roofHalfZ:1.16},
 {x:2.42,top:1.83,bottom:-1.23,sideHalfZ:1.69,roofHalfZ:1.16},
 {x:3.27,top:1.54,bottom:-.95,sideHalfZ:1.55,roofHalfZ:1.08},
 {x:3.85,top:1.04,bottom:-.62,sideHalfZ:1.40,roofHalfZ:.98}
];
/** Side Z on the actual sloping, right/left shoulder at Y.
 * One source for receiver surface marks and their placement. */
export function falUpperSideHalfZ(y:number,x=1):number{
 const stations=FAL_UPPER_STATIONS;
 let a=stations[0],b=stations[1];
 for(let i=1;i<stations.length;i++){
  if(x<=stations[i].x){a=stations[i-1];b=stations[i];break;}
  a=stations[i];b=stations[i];
 }
 const t=a===b?0:Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));
 const top=a.top+(b.top-a.top)*t;
 const bottom=a.bottom+(b.bottom-a.bottom)*t;
 const side=a.sideHalfZ+(b.sideHalfZ-a.sideHalfZ)*t;
 const roof=a.roofHalfZ+(b.roofHalfZ-a.roofHalfZ)*t;
 const shoulder=top-.76;
 if(y>=shoulder)return roof+(side-roof)*
  Math.max(0,Math.min(1,(top-y)/.76));
 if(y>=bottom+.30)return side;
 return side-.14*Math.max(0,Math.min(1,(bottom+.30-y)/.30));
}
function point(s:Station,n:number):[number,number,number]{
 const {x,top,bottom,sideHalfZ:w,roofHalfZ:r}=s;
 const ring:readonly (readonly [number,number])[]=[
  [bottom,-w+.14],[bottom,w-.14],
  [bottom+.30,w],[top-.76,w],
  [top,r],[top,-r],
  [top-.76,-w],[bottom+.30,-w]
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
  [-.05,1.00],[.16,1.36],[.80,1.53],[2.45,1.49],
  [2.92,1.19],[2.87,.79],[2.42,.69],[.55,.70]
 ];
 const vertices:number[]=[];
 for(const [x,y] of outline)
  vertices.push(x,y,falUpperSideHalfZ(y,x)+.035);
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
