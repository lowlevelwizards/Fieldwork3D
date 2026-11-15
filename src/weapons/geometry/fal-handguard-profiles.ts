/** P5: one deliberately stout triangular fore-end, matching the FAL
 * receiver crown. Eight cross-section corners, four longitudinal stations,
 * one mesh: fewer faces, larger planes, stronger silhouette.
 */
import * as THREE from 'three';

type Station=Readonly<{x:number;top:number;bottom:number;halfWidth:number}>;
export const FAL_HANDGUARD_STATIONS:readonly Station[]=[
 {x:3.65,top:1.06,bottom:-1.32,halfWidth:1.72},
 {x:4.48,top:1.40,bottom:-1.74,halfWidth:1.78},
 {x:12.30,top:1.39,bottom:-1.53,halfWidth:1.77},
 {x:14.10,top:.96,bottom:-1.05,halfWidth:1.50}
];
export const FAL_HANDGUARD_ROOF_RATIO=.40;
export function falHandguardShoulderY(station:Station):number{
 return Math.max(station.bottom+.38,station.top-2.00);
}
export function falHandguardStationAt(x:number):Station{
 const list=FAL_HANDGUARD_STATIONS;
 for(let i=1;i<list.length;i++)if(x<=list[i].x){
  const a=list[i-1],b=list[i],t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));
  return {x,top:a.top+(b.top-a.top)*t,
   bottom:a.bottom+(b.bottom-a.bottom)*t,
   halfWidth:a.halfWidth+(b.halfWidth-a.halfWidth)*t};
 }
 return {...list[list.length-1],x};
}
/** Actual sloping surface, shared by mesh and dark FN vent markings. */
export function falHandguardSideHalfZAt(x:number,y:number):number{
 const s=falHandguardStationAt(x),w=s.halfWidth;
 const shoulder=falHandguardShoulderY(s);
 if(y>=shoulder){
  const t=Math.max(0,Math.min(1,(y-shoulder)/(s.top-shoulder)));
  return w+(w*FAL_HANDGUARD_ROOF_RATIO-w)*t;
 }
 if(y>=s.bottom+.20)return w;
 return w-.20*Math.max(0,Math.min(1,(s.bottom+.20-y)/.20));
}
function ringPoint(station:Station,index:number):[number,number,number]{
 const {x,top,bottom,halfWidth:w}=station,shoulder=falHandguardShoulderY(station);
 const roof=w*FAL_HANDGUARD_ROOF_RATIO;
 const points:readonly (readonly [number,number])[]=[
  [bottom,-w+.20],[bottom,w-.20],
  [bottom+.20,w],[shoulder,w],
  [top,roof],[top,-roof],
  [shoulder,-w],[bottom+.20,-w]
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
/** Three oversized FN hexagonal slots; each corner is projected
 * to the same height-varying surface as the sloped fore-end.
 * One batched mesh per side, with no new draw calls.
 */
export function addFALHandguardVents(root:THREE.Group,id:string,
 material:THREE.Material):THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 for(const side of [-1,1] as const){
  const vertices:number[]=[],indices:number[]=[];
  for(const x of [6.65,9.22,11.50]){
   const w=.83,h=.29,cap=.24,y=.42;
   const profile:readonly [number,number][]=[
    [x-w+cap,y-h],[x+w-cap,y-h],[x+w,y],
    [x+w-cap,y+h],[x-w+cap,y+h],[x-w,y]
   ];
   const first=vertices.length/3;
   for(const [px,py] of profile)
    vertices.push(px,py,side*(falHandguardSideHalfZAt(px,py)+.035));
   for(let i=1;i<5;i++){
    if(side===1)indices.push(first,first+i,first+i+1);
    else indices.push(first,first+i+1,first+i);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-handguard-'+id+'-'+(side===-1?1:2);
  mesh.userData.falVentSide=side;
  mesh.userData.falVentCount=3;
  mesh.userData.falFaceAligned=true;
  mesh.userData.falTriangularP5=true;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=3;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
