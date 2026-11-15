/** FN FNC P5 shape grammar. Two big volumes, not a 24-face fluted slab:
 * narrow hexagonal lower handguard and a clear rectangular upper gas cover.
 * +X muzzle, +Y up, +Z right. Two long lower grooves and three long upper
 * grooves per side, each batched. Geometry built only on weapon selection.
 */
import * as THREE from 'three';

type Station=Readonly<{x:number;scale:number}>;
const STATIONS:readonly Station[]=[
 {x:3.45,scale:.96},{x:4.12,scale:1},
 {x:11.85,scale:1},{x:13.55,scale:.93}
];
// A deliberately narrow SIX-sided barrel-like handhold, with a broad underside.
// Its top is partly covered by the actual gas box, never a tall square slab.
const HEX:readonly (readonly [number,number])[]=[
 [-2.04,-.61],[-2.04,.61],[-1.21,1.05],
 [-.18,.72],[-.18,-.72],[-1.21,-1.05]
];
const vertex=(s:Station,i:number):[number,number,number]=>{
 const [y,z]=HEX[i];return [s.x,-1.11+(y+1.11)*s.scale,z*s.scale];
};
export function addFNCFacetedForearm(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const vertices:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  vertices.push(...a,...b,...c);
 for(let n=0;n<STATIONS.length-1;n++)for(let i=0;i<6;i++){
  const j=(i+1)%6;
  const a=vertex(STATIONS[n],i),b=vertex(STATIONS[n+1],i),
   c=vertex(STATIONS[n+1],j),d=vertex(STATIONS[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 const rear=STATIONS[0],front=STATIONS[STATIONS.length-1];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri([rear.x,-1.11,0],vertex(rear,j),vertex(rear,i));
  tri([front.x,-1.11,0],vertex(front,i),vertex(front,j));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-fnc-p5-hex-lower';
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=6;
 mesh.userData.fncP5LowerHex=true;
 mesh.userData.fncMoldedFlutesPerSide=2;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
/** Tall but NARROW top box, seated over the hex handhold for a recognizable
 * stacked FNC cross-section. Not another full-width receiver-like extrusion.
 * This is the single gas box, not a chain of three small adapter blocks.
 */
export function addFNCUpperGasBox(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const geometry=new THREE.BoxGeometry(9.20,1.35,1.72);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(8.66,.40,0); // X 4.06..13.26; Y -.275..1.075
 mesh.name='family-handguard-fnc-p5-upper-gas-box';
 mesh.userData.fncP5UpperGasBox=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
/** Two restrained LONG parallel lines on the hex and three on the upper
 * steel box. All four side mark meshes follow the actual exterior faces and
 * are not coplanar. Every stripe is one quad, not rivets or little holes.
 */
export function addFNCForearmMarks(root:THREE.Group,
 dark:THREE.Material):THREE.Mesh[]{
 const marks:THREE.Mesh[]=[];
 const addStrokes=(side:-1|1,level:'upper'|'lower')=>{
  const positions:number[]=[];
  const ys=level==='upper'?[.05,.42,.78]:[-.91,-1.60];
  for(const y of ys){
   const x0=4.66,x1=12.36,h=level==='upper'?.115:.145;
   // Face of the top box, or extrapolated face of the lower hex.
   const z=(yy:number)=>level==='upper'?.889:
    (yy>=-1.21? .72+(-.18-yy)*(.33/1.03):
     1.05-(-1.21-yy)*(.44/.83))+.038;
   const v=(x:number,yy:number):[number,number,number]=>
    [x,yy,side*z(yy)];
   const a=v(x0,y-h/2),b=v(x1,y-h/2),
    c=v(x1,y+h/2),d=v(x0,y+h/2);
   if(side>0)positions.push(...a,...b,...c,...a,...c,...d);
   else positions.push(...a,...c,...b,...a,...d,...c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,dark);
  mesh.name='family-handguard-fnc-p5-'+level+'-grooves-'+side;
  mesh.userData.fncP5GrooveSide=side;
  mesh.userData.fncP5GrooveLevel=level;
  mesh.userData.fncP5GrooveCount=ys.length;
  mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);marks.push(mesh);
 };
 for(const side of [-1,1] as const){
  addStrokes(side,'upper');addStrokes(side,'lower');
 }
 return marks;
}
