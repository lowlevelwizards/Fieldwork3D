/** FN FNC P4 Fieldwork front end.
 * ONE continuous sculpted, fluted polymer silhouette from receiver to nose.
 * Two broad molded side channels are actual cross-section geometry, not
 * dark sticker meshes. The forward ventilation marks sit ON this body,
 * rather than a second rectangular gas cover piled on top of it.
 * No hidden legacy fore-end or interchangeable fake P3 gas crown.
 */
import * as THREE from 'three';

type Ring=Readonly<{x:number;scale:number;centerY:number}>;
const RINGS:readonly Ring[]=[
 {x:3.45,scale:.93,centerY:-.58},
 {x:4.30,scale:1,centerY:-.58},
 {x:10.42,scale:1,centerY:-.58},
 {x:11.14,scale:.98,centerY:-.58},
 {x:13.55,scale:.89,centerY:-.65}
];
/** One thick tube/block cross-section: two deeply legible molded channels
 * per side, a very broad belly and four simple corner chamfers. The flute
 * depressions run in X; they are NOT additional floating box geometry.
 */
const PROFILE:readonly (readonly [number,number])[]=[
 [-2.19,-.80],[-2.19,.80],[-1.65,1.36],
 [-1.36,1.36],[-1.13,1.14],[-.95,1.14],[-.73,1.40],
 [-.43,1.40],[-.21,1.16],[-.03,1.16],[.19,1.40],
 [.64,1.06],[.91,.70],
 [.91,-.70],[.64,-1.06],[.19,-1.40],
 [-.03,-1.16],[-.21,-1.16],[-.43,-1.40],
 [-.73,-1.40],[-.95,-1.14],[-1.13,-1.14],
 [-1.36,-1.36],[-1.65,-1.36]
];
const point=(ring:Ring,i:number):[number,number,number]=>{
 const [y,z]=PROFILE[i];
 return [ring.x,ring.centerY+(y+.58)*ring.scale,z*ring.scale];
};
export function addFNCFacetedForearm(
 root:THREE.Group,material:THREE.Material
):THREE.Mesh{
 const vertices:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  vertices.push(...a,...b,...c);
 for(let n=0;n<RINGS.length-1;n++)for(let i=0;i<PROFILE.length;i++){
  const j=(i+1)%PROFILE.length;
  const a=point(RINGS[n],i),b=point(RINGS[n+1],i);
  const c=point(RINGS[n+1],j),d=point(RINGS[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 const a=RINGS[0],z=RINGS[RINGS.length-1];
 for(let i=0;i<PROFILE.length;i++){
  const j=(i+1)%PROFILE.length;
  tri([a.x,a.centerY,0],point(a,j),point(a,i));
  tri([z.x,z.centerY,0],point(z,i),point(z,j));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-handguard-fnc-p4-continuous-fluted-body';
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=PROFILE.length;
 mesh.userData.fncP4UnifiedForearm=true;
 mesh.userData.fncMoldedFlutesPerSide=2;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
/** Three prominent ventilation impressions on the same molded front body,
 * one batched mesh per visible side. Surfaces follow the forward taper in Z,
 * using outward-facing winding. No separate elevated gas-cover geometry.
 */
export function addFNCForearmMarks(root:THREE.Group,
 material:THREE.Material):THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 const scale=(x:number)=>x<=11.14?1-(x-10.42)*(.02/.72):
  .98-(x-11.14)*(.09/2.41);
 for(const side of [-1,1] as const){
  const positions:number[]=[];
  for(const x of [11.15,11.92,12.69]){
   const left=x-.25,right=x+.25;
   const at=(xx:number,yy:number):[number,number,number]=>
    [xx,yy,side*(1.402*scale(xx)+.035)];
   const a=at(left,-.55),b=at(right,-.55),
    c=at(right,-.14),d=at(left,-.14);
   if(side>0)positions.push(...a,...b,...c,...a,...c,...d);
   else positions.push(...a,...c,...b,...a,...d,...c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-handguard-fnc-p4-integrated-vents-'+side;
  mesh.userData.fncVentSide=side;
  mesh.userData.fncGasVentSide=side;
  mesh.userData.fncGasVentCount=3;
  mesh.userData.fncP4FlushVentMarks=true;
  mesh.castShadow=false;mesh.receiveShadow=false;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
