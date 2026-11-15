/** FNC P14: aligned six-sided art front end (polymer + molded lip +
 * slim faceted gas cover + batched groove / vent surfaces). The P13
 * layout contract owns all relative positions; meshes build on demand only.
 * +X muzzle, +Y up, +Z right. No physical assembly or firing changes.
 */
import * as THREE from 'three';
import {FNC_FRONT_P13} from './fnc-front-layout.ts';
type Station=Readonly<{x:number;scale:number}>;
const POLY=FNC_FRONT_P13.polymer;
const GAS=FNC_FRONT_P13.gas;
const STOP=FNC_FRONT_P13.handstop;
// Established Fieldwork six-face polymer cross-section. One simple
// angular silhouette, never a smoothed cylindrical handguard.
const HEX:readonly (readonly [number,number])[]=[
 [-2.04,-.65],[-2.04,.65],[-1.21,1.10],
 [-.18,.76],[-.18,-.76],[-1.21,-1.10]
];
function makeSixFacePrism(root:THREE.Group,material:THREE.Material,
 name:string,stations:readonly number[],
 cross:(x:number,index:number)=>readonly [number,number]):THREE.Mesh{
 const verts:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  verts.push(...a,...b,...c);
 const vertex=(x:number,i:number):[number,number,number]=>{
  const [y,z]=cross(x,i);return [x,y,z];
 };
 for(let n=0;n<stations.length-1;n++)for(let i=0;i<6;i++){
  const j=(i+1)%6;
  const a=vertex(stations[n],i),b=vertex(stations[n+1],i),
   c=vertex(stations[n+1],j),d=vertex(stations[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 const rear=stations[0],front=stations[stations.length-1];
 const center=(x:number):[number,number,number]=>[
  x,Array.from({length:6},(_,i)=>cross(x,i)[0]).reduce((a,b)=>a+b,0)/6,0
 ];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri(center(rear),vertex(rear,i),vertex(rear,j));
  tri(center(front),vertex(front,j),vertex(front,i));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
function polymerCross(scale:number,i:number):[number,number]{
 const [y,z]=HEX[i];
 return [-1.11+(y+1.11)*scale,z*scale];
}
const POLY_STATIONS:readonly Station[]=[
 {x:POLY.startX,scale:.96},
 {x:POLY.fullStartX,scale:POLY.fullScale},
 {x:POLY.fullEndX,scale:POLY.fullScale},
 {x:POLY.endX,scale:POLY.endScale}
];
export function addFNCFacetedForearm(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const scaleAt=(x:number)=>{
  for(let i=0;i<POLY_STATIONS.length-1;i++){
   const a=POLY_STATIONS[i],b=POLY_STATIONS[i+1];
   if(x<=b.x){
    const t=(x-a.x)/(b.x-a.x);
    return a.scale+(b.scale-a.scale)*Math.max(0,Math.min(1,t));
   }
  }
  return POLY_STATIONS[POLY_STATIONS.length-1].scale;
 };
 const mesh=makeSixFacePrism(root,material,
  'family-handguard-fnc-p13-extended-polymer',
  POLY_STATIONS.map(s=>s.x),(x,i)=>polymerCross(scaleAt(x),i));
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=6;
 mesh.userData.fncP5LowerHex=true;
 mesh.userData.fncMoldedFlutesPerSide=2;
 mesh.userData.fncP11ShortWidePolymer=true;
 mesh.userData.fncP13ExtendedPolymer=true;
 mesh.userData.fncP14ReceiverSeatedPolymer=true;
 mesh.userData.fncP6OutwardEndcaps=true;
 return mesh;
}
export function addFNCHandstopLip(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 // One short molded collar, with the front face pulled back toward
 // the polymer profile. Tapering is longitudinal; no overlay plate.
 const rearX=STOP.centerX-STOP.length/2;
 const frontX=STOP.centerX+STOP.length/2;
 const mesh=makeSixFacePrism(root,material,
  'family-handguard-fnc-p14-tapered-molded-endstop',
  [rearX,frontX],(x,i)=>polymerCross(
   x===rearX?STOP.rearScale:STOP.frontScale,i));
 mesh.userData.fncP11HandstopLip=true;
 mesh.userData.fncP12ChunkyHandstop=true;
 mesh.userData.fncP13MoldedCollar=true;
 mesh.userData.fncP14TaperedMoldedCollar=true;
 return mesh;
}
const GAS_PROFILE:readonly (readonly [number,number])[]=[
 [GAS.bottomY,-GAS.bottomHalfZ],[GAS.bottomY,GAS.bottomHalfZ],
 [GAS.shoulderY,GAS.sideHalfZ],[GAS.topY,GAS.roofHalfZ],
 [GAS.topY,-GAS.roofHalfZ],[GAS.shoulderY,-GAS.sideHalfZ]
];
export function addFNCUpperGasBox(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 // One six-face metal envelope; no extra bridge boxes.
 const mesh=makeSixFacePrism(root,material,
  'family-handguard-fnc-p13-integrated-vented-cover',
  [GAS.startX,GAS.endX],(_,i)=>GAS_PROFILE[i]);
 mesh.userData.fncP5UpperGasBox=true;
 mesh.userData.fncP6NarrowGasBox=true;
 mesh.userData.fncP7ConnectedGasHousing=true;
 mesh.userData.fncP11LongSlimVentedCover=true;
 mesh.userData.fncP12CompressedGasCover=true;
 mesh.userData.fncP13NestedFacetedGasCover=true;
 mesh.userData.fncP14LoweredGasCover=true;
 return mesh;
}
const GAS_SLOTS:readonly (readonly [number,number])[]=
 Array.from({length:GAS.ventCount},(_,i)=>{
  const x=GAS.ventFirstX+i*GAS.ventPitch;
  return [x,x+GAS.ventLength] as const;
 });
const quad=(out:number[],a:readonly number[],b:readonly number[],
 c:readonly number[],d:readonly number[],flip=false)=>{
 if(flip)out.push(...a,...c,...b,...a,...d,...c);
 else out.push(...a,...b,...c,...a,...c,...d);
};
function gasSurfaceZ(y:number){
 const t=(y-GAS.shoulderY)/(GAS.topY-GAS.shoulderY);
 return GAS.sideHalfZ+(GAS.roofHalfZ-GAS.sideHalfZ)*t;
}
function polymerSurfaceZ(y:number){
 // Interpolate the current full-width polymer facets, not the
 // previously hard-coded gas-box side planes.
 const scale=POLY.fullScale;
 const mid=-1.11+(-1.21+1.11)*scale;
 const top=-1.11+(-.18+1.11)*scale;
 const bottom=-1.11+(-2.04+1.11)*scale;
 const zm=1.10*scale,zt=.76*scale,zb=.65*scale;
 return y>=mid
  ?zm+(y-mid)*(zt-zm)/(top-mid)
  :zm+(mid-y)*(zb-zm)/(mid-bottom);
}
export function addFNCForearmMarks(root:THREE.Group,
 dark:THREE.Material):THREE.Mesh[]{
 const marks:THREE.Mesh[]=[];
 const addSide=(side:-1|1,level:'upper'|'lower')=>{
  const pos:number[]=[],upper=level==='upper';
  const ys=upper?GAS.ventSideYs:POLY.grooveYs;
  const spans=upper?GAS_SLOTS:[[POLY.grooveStartX,POLY.grooveEndX]] as const;
  const height=upper?GAS.ventHeight:.24;
  const depth=(y:number)=>
   (upper?gasSurfaceZ(y):polymerSurfaceZ(y))+GAS.ventOffset;
  for(const y of ys)for(const [x0,x1] of spans){
   const h=height/2;
   const v=(x:number,yy:number):[number,number,number]=>
    [x,yy,side*depth(yy)];
   quad(pos,v(x0,y-h),v(x1,y-h),v(x1,y+h),v(x0,y+h),side<0);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,dark);
  mesh.name='family-handguard-fnc-p13-'+level+'-marks-'+side;
  mesh.userData.fncP5GrooveSide=side;
  mesh.userData.fncP5GrooveLevel=level;
  mesh.userData.fncP5GrooveCount=ys.length;
  mesh.userData.fncP6GrooveSegmentsPerRow=spans.length;
  mesh.userData.fncP7ReducedUpperMarks=upper;
  mesh.userData.fncP6BoldGrooveHeight=height;
  mesh.userData.fncP11BrokenGasSideSlots=upper;
  mesh.userData.fncP11PolymerLongRibs=!upper;
  mesh.userData.fncP13DerivedSurfaceMarks=true;
  mesh.castShadow=false;mesh.receiveShadow=false;
  root.add(mesh);marks.push(mesh);
 };
 for(const side of [-1,1] as const){
  addSide(side,'upper');addSide(side,'lower');
 }
 const roofPosition:number[]=[];
 for(const [x0,x1] of GAS_SLOTS){
  const y=GAS.topY+GAS.ventOffset,z=GAS.ventRoofHalfZ;
  quad(roofPosition,[x0,y,-z],[x1,y,-z],
   [x1,y,z],[x0,y,z],true);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',
  new THREE.Float32BufferAttribute(roofPosition,3));
 geometry.computeVertexNormals();
 const roof=new THREE.Mesh(geometry,dark);
 roof.name='family-handguard-fnc-p13-roof-vent-row';
 roof.userData.fncP11TopGasVentRow=true;
 roof.userData.fncP11TopGasVentCount=GAS.ventCount;
 roof.userData.fncP13DerivedSurfaceMarks=true;
 roof.castShadow=false;roof.receiveShadow=false;
 root.add(roof);marks.push(roof);
 return marks;
}
