/** FAL 50.00 one-piece faceted forearm and six graphics batched per side.
 * Its upper shoulders are inset, unlike the older constant-Z extrusion.
 * Unlike the HK/G3 round-tube forearm, the FAL keeps broad central side flats.
 * Meshes are created only on recipe changes, never on render frames.
 */
import * as THREE from 'three';

type Station=Readonly<{x:number;top:number;bottom:number;halfWidth:number}>;
/** Four authored longitudinal stations retain the original XY fore-end. */
export const FAL_HANDGUARD_STATIONS:readonly Station[]=[
 {x:3.65,top:1.06,bottom:-1.32,halfWidth:1.69},
 {x:4.48,top:1.40,bottom:-1.74,halfWidth:1.73},
 {x:12.30,top:1.39,bottom:-1.53,halfWidth:1.73},
 {x:14.10,top:1.01,bottom:-1.05,halfWidth:1.60}
];
const TOP_INSET=.27;
const BOTTOM_INSET=.32;
const TOP_CHAMFER=.46;
const BOTTOM_CHAMFER=.38;
function ringPoint(station:Station,index:number):[number,number,number]{
 const {x,top,bottom,halfWidth:w}=station;
 // Eight broad planar facets. The top stays wide: never an M16 triangle.
 const points:readonly (readonly [number,number])[]=[
  [bottom,-w+BOTTOM_INSET],[bottom,w-BOTTOM_INSET],
  [bottom+BOTTOM_CHAMFER,w],[top-TOP_CHAMFER,w],
  [top,w-TOP_INSET],[top,-w+TOP_INSET],
  [top-TOP_CHAMFER,-w],[bottom+BOTTOM_CHAMFER,-w]
 ];
 return [x,points[index][0],points[index][1]];
}
export function addFALFacetedHandguard(root:THREE.Group,id:string,
 index:number,material:THREE.Material):THREE.Mesh{
 const verts:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  verts.push(...a,...b,...c);
 for(let i=0;i<FAL_HANDGUARD_STATIONS.length-1;i++){
  for(let j=0;j<8;j++){
   const k=(j+1)%8;
   const a=ringPoint(FAL_HANDGUARD_STATIONS[i],j);
   const b=ringPoint(FAL_HANDGUARD_STATIONS[i+1],j);
   const c=ringPoint(FAL_HANDGUARD_STATIONS[i+1],k);
   const d=ringPoint(FAL_HANDGUARD_STATIONS[i],k);
   tri(a,b,c);tri(a,c,d);
  }
 }
 const rear=FAL_HANDGUARD_STATIONS[0];
 const nose=FAL_HANDGUARD_STATIONS[FAL_HANDGUARD_STATIONS.length-1];
 const rearCenter:[number,number,number]=[rear.x,(rear.top+rear.bottom)/2,0];
 const noseCenter:[number,number,number]=[nose.x,(nose.top+nose.bottom)/2,0];
 for(let j=0;j<8;j++){
  const k=(j+1)%8;
  tri(rearCenter,ringPoint(rear,j),ringPoint(rear,k));
  tri(noseCenter,ringPoint(nose,k),ringPoint(nose,j));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-handguard-'+id+'-'+index;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.falFacetedHandguard=true;
 root.add(mesh);
 return mesh;
}
/** Three large vent shadows per side, with one mesh per face.
 * Geometry and material remain owned by the existing handguard part.
 */
export function addFALHandguardVents(root:THREE.Group,id:string,
 material:THREE.Material):THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 for(const side of [-1,1] as const){
  const vertices:number[]=[],indices:number[]=[];
  for(const x of [6.65,9.25,11.75]){
   const first=vertices.length/3,halfWidth=.77,halfHeight=.20;
   const y=.61,z=side*(1.73+.018);
   vertices.push(
    x-halfWidth,y-halfHeight,z,
    x+halfWidth,y-halfHeight,z,
    x+halfWidth,y+halfHeight,z,
    x-halfWidth,y+halfHeight,z);
   if(side===1)indices.push(first,first+1,first+2,first,first+2,first+3);
   else indices.push(first,first+2,first+1,first,first+3,first+2);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-handguard-'+id+'-'+(side===-1?1:2);
  mesh.userData.falVentSide=side;
  mesh.userData.falVentCount=3;
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.renderOrder=3;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
