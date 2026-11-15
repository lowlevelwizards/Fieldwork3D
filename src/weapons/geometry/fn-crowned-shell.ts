/** FN family crown mesh builder.
 * FAL and FNC keep their own length, breadth, top slope and station counts.
 * Shared mechanics only: six-sided cross sections, deterministic outside
 * triangle winding and closed endcaps. NEVER adjust weapon gameplay anchors.
 */
import * as THREE from 'three';

export type FNCrownStation=Readonly<{
 x:number;top:number;bottom:number;sideHalfZ:number;roofHalfZ:number
}>;
export type FNCrownOptions=Readonly<{
 shoulderY:(station:FNCrownStation)=>number;
 capCenterY?:(station:FNCrownStation,end:'rear'|'front')=>number;
}>;
export function buildFNCrownMesh(
 stations:readonly FNCrownStation[],material:THREE.Material,
 options:FNCrownOptions
):THREE.Mesh{
 if(stations.length<2)throw new Error('FN crown needs two end stations');
 const ring=(s:FNCrownStation,i:number):[number,number,number]=>{
  const shoulder=options.shoulderY(s);
  const yz:readonly (readonly [number,number])[]=[
   [s.bottom,-s.sideHalfZ],[s.bottom,s.sideHalfZ],
   [shoulder,s.sideHalfZ],[s.top,s.roofHalfZ],
   [s.top,-s.roofHalfZ],[shoulder,-s.sideHalfZ]
  ];
  return [s.x,yz[i][0],yz[i][1]];
 };
 const vertices:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  vertices.push(...a,...b,...c);
 for(let n=0;n<stations.length-1;n++)for(let i=0;i<6;i++){
  const j=(i+1)%6;
  const a=ring(stations[n],i),b=ring(stations[n+1],i),
   c=ring(stations[n+1],j),d=ring(stations[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 const rear=stations[0],front=stations[stations.length-1];
 const center=(s:FNCrownStation,end:'rear'|'front'):[number,number,number]=>
  [s.x,options.capCenterY?.(s,end)??(s.top+s.bottom)/2,0];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri(center(rear,'rear'),ring(rear,i),ring(rear,j));
  tri(center(front,'front'),ring(front,j),ring(front,i));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.castShadow=true;mesh.receiveShadow=true;
 return mesh;
}
