/** FN FNC P8 large-form grammar. Six-face polymer handguard below one
 * rectangular gas cover. Just three bold channels per side, no thin slots.
 * +X muzzle, +Y up, +Z right. Built on weapon selection, never per frame.
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
  // The winding of the longitudinal strips is already outward. End caps
  // must face the *opposite* direction: -X rear, +X muzzle side.
  // P5 had both caps backwards, so Three.js culled their front faces.
  tri([rear.x,-1.11,0],vertex(rear,i),vertex(rear,j));
  tri([front.x,-1.11,0],vertex(front,j),vertex(front,i));
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
 mesh.userData.fncMoldedFlutesPerSide=1;
 mesh.userData.fncP8BroadMolding=true;
 mesh.userData.fncP6OutwardEndcaps=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
/** Tall but NARROW top box, seated over the hex handhold for a recognizable
 * stacked FNC cross-section. Not another full-width receiver-like extrusion.
 * This is the single gas box, not a chain of three small adapter blocks.
 */
export function addFNCUpperGasBox(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const geometry=new THREE.BoxGeometry(9.90,1.25,1.48);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(8.35,.39,0); // X 3.40..13.30, meets sight seat at 13.12
 mesh.name='family-handguard-fnc-p5-upper-gas-box';
 mesh.userData.fncP5UpperGasBox=true;
 mesh.userData.fncP6NarrowGasBox=true;
 mesh.userData.fncP7ConnectedGasHousing=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
/** One broad polymer channel and two continuous gas-cover grooves per side.
 * These low-relief graphic marks are deliberately batched and mirrored;
 * no narrow barcode vents, floating slot blocks or micro-screws.
 */
export function addFNCForearmMarks(root:THREE.Group,
 dark:THREE.Material):THREE.Mesh[]{
 const marks:THREE.Mesh[]=[];
 const addStrokes=(side:-1|1,level:'upper'|'lower')=>{
  const positions:number[]=[];
  const upper=level==='upper';
  const ys=upper?[.18,.72]:[-1.21];
  // Long uninterrupted recesses survive thumbnail scale far better
  // than multiple ranks of fine segmented ventilation stripes.
  const intervals:readonly (readonly [number,number])[]=
   upper?[[4.74,12.47]]:[[4.66,12.28]];
  const height=upper?.29:.34;
  for(const y of ys)for(const [x0,x1] of intervals){
   const h=height/2;
   // Outside the actual side planes, with no surface fighting:
   // gas box Z=.74; lower hex side slopes from Z=.72 to Z=1.05.
   const depth=(yy:number)=>upper?.782:
    (yy>=-1.21?.72+(-.18-yy)*(.33/1.03):
     1.05-(-1.21-yy)*(.44/.83))+.065;
   const v=(x:number,yy:number):[number,number,number]=>
    [x,yy,side*depth(yy)];
   const a=v(x0,y-h),b=v(x1,y-h),
    c=v(x1,y+h),d=v(x0,y+h);
   if(side>0)positions.push(...a,...b,...c,...a,...c,...d);
   else positions.push(...a,...c,...b,...a,...d,...c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,dark);
  mesh.name='family-handguard-fnc-p6-'+level+'-grooves-'+side;
  mesh.userData.fncP5GrooveSide=side;
  mesh.userData.fncP5GrooveLevel=level;
  mesh.userData.fncP5GrooveCount=ys.length;
  mesh.userData.fncP6GrooveSegmentsPerRow=intervals.length;
  mesh.userData.fncP7ReducedUpperMarks=upper;
  mesh.userData.fncP8GroovesPerSide=3;
  mesh.userData.fncP6BoldGrooveHeight=height;
  mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);marks.push(mesh);
 };
 for(const side of [-1,1] as const){
  addStrokes(side,'upper');addStrokes(side,'lower');
 }
 return marks;
}
