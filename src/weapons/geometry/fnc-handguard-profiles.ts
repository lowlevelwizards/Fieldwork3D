/** FNC P3: an emphatic low-poly, hand-shaped polymer belly under a separate
 * ventilated steel gas cover. Every vent is an offset face; no coplanar quads.
 * Shared by the live Arsenal and the five-rifle comparison lab.
 */
import * as THREE from 'three';
type Ring=Readonly<{x:number;scale:number;midY?:number}>;
const rings:readonly Ring[]=[
 {x:3.45,scale:1},{x:9.62,scale:1.04},
 {x:11.18,scale:.91},{x:13.55,scale:.67,midY:-1.0}
];
/** Eight broad faces, with lower facets deliberately fuller than the top. */
const yz:readonly (readonly [number,number])[]=[
 [-2.24,-.91],[-2.24,.91],[-1.55,1.46],
 [.24,1.46],[.96,.77],[.96,-.77],
 [.24,-1.46],[-1.55,-1.46]
];
const vertex=(r:Ring,i:number):[number,number,number]=>{
 const [y,z]=yz[i],mid=r.midY??-.58;
 return [r.x,mid+(y+.58)*r.scale,z*r.scale];
};
export function addFNCFacetedForearm(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const vertices:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  vertices.push(...a,...b,...c);
 for(let n=0;n<rings.length-1;n++)for(let i=0;i<8;i++){
  const j=(i+1)%8;
  const a=vertex(rings[n],i),b=vertex(rings[n+1],i),
   c=vertex(rings[n+1],j),d=vertex(rings[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 for(let i=0;i<8;i++){
  const j=(i+1)%8;
  tri([rings[0].x,-.58,0],vertex(rings[0],j),vertex(rings[0],i));
  tri([rings[rings.length-1].x,-1,0],vertex(rings[rings.length-1],i),
   vertex(rings[rings.length-1],j));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-handguard-fnc-p3-polymer';
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=8;
 mesh.userData.fncP3FullerBelly=true;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
/** Batch surface graphics. The deep middle channel is on the flat side,
 * stopping before the sculpted front taper. No tiny micro-texture. */
export function addFNCForearmMarks(root:THREE.Group,material:THREE.Material):
 THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 for(const side of [-1,1] as const){
  const z=side*1.54;
  const a=[4.55,-.91,z],b=[9.54,-.91,z],
   d=[4.55,-1.17,z],e=[9.54,-1.17,z];
  const positions=side>0?[...a,...e,...b,...a,...d,...e]:
   [...a,...b,...e,...a,...e,...d];
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  const mark=new THREE.Mesh(geo,material);
  mark.name='family-handguard-fnc-p3-groove-'+side;
  mark.userData.fncGrooveSide=side;
  mark.userData.fncGrooveCount=1;
  mark.userData.fncVentCount=3;
  mark.userData.fncFaceAligned=true;
  mark.castShadow=false;mark.receiveShadow=false;
  root.add(mark);result.push(mark);
 }
 return result;
}
/** One stepped stamped gas housing, elevated from the end of the long
 * polymer lower belly. Three conspicuous, widely spaced vents PER SIDE
 * are batched into one mesh for each side, never individual screws/holes.
 */
export function addFNCGasCover(root:THREE.Group,metal:THREE.Material,
 dark:THREE.Material):THREE.Mesh{
 const outline:readonly (readonly [number,number])[]=[
  [10.73,.11],[10.73,1.19],[11.20,1.46],
  [13.23,1.46],[13.55,1.11],[13.55,.11]
 ];
 const shape=new THREE.Shape();
 shape.moveTo(outline[0][0],outline[0][1]);
 for(let i=1;i<outline.length;i++)shape.lineTo(outline[i][0],outline[i][1]);
 shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:2.32,bevelEnabled:false,curveSegments:1,steps:1
 });
 geometry.translate(0,0,-1.16);
 const housing=new THREE.Mesh(geometry,metal);
 housing.name='family-handguard-fnc-p3-gas-cover';
 housing.userData.fncDistinctGasCover=true;
 housing.castShadow=true;housing.receiveShadow=true;root.add(housing);
 for(const side of [-1,1] as const){
  const pos:number[]=[];
  for(const x of [11.27,12.03,12.79]){
   const z=side*1.185,w=.37;
   const a:[number,number,number]=[x-w/2,.58,z];
   const b:[number,number,number]=[x+w/2,.58,z];
   const c:[number,number,number]=[x+w/2,.90,z];
   const d:[number,number,number]=[x-w/2,.90,z];
   if(side>0)pos.push(...a,...c,...b,...a,...d,...c);
   else pos.push(...a,...b,...c,...a,...c,...d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.computeVertexNormals();
  const marks=new THREE.Mesh(geo,dark);
  marks.name='family-handguard-fnc-p3-gas-slots-'+side;
  marks.userData.fncGasVentSide=side;
  marks.userData.fncGasVentCount=3;
  marks.castShadow=false;marks.receiveShadow=false;
  root.add(marks);
 }
 return housing;
}
