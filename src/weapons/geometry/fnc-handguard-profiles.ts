/** FNC P22: sculptural polymer, lip and integrated gas block/front sight. Vents and
 * grooves are pixel art mapped onto the three-dimensional surfaces. The P13
 * layout contract owns all relative positions; meshes build on demand only.
 * +X muzzle, +Y up, +Z right. No physical assembly or firing changes.
 */
import * as THREE from 'three';
import {FNC_FRONT_P13} from './fnc-front-layout.ts';
import {applyFNCPixelDetails} from './fnc-pixel-details.ts';
type Station=Readonly<{x:number;scale:number}>;
const POLY=FNC_FRONT_P13.polymer;
const GAS=FNC_FRONT_P13.gas;
const STOP=FNC_FRONT_P13.handstop;
// Established Fieldwork six-face polymer cross-section. One simple
// angular silhouette, never a smoothed cylindrical handguard.
const HEX:readonly (readonly [number,number])[]=[
 [-2.04,-.84],[-2.04,.84],[-1.21,1.42],
 [-.18,.94],[-.18,-.94],[-1.21,-1.42]
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
// Reuse the same vertical transform for body, molded stop and side grooves.
const polymerY=(y:number)=>{
 const yy=POLY.pivotY+(y-POLY.pivotY)*POLY.heightScale+POLY.liftY;
 // Add mass to the underside only; leave upper gas-cover sightline intact.
 return yy+Math.min(0,yy+1.0)*POLY.lowerFlare;
};
function polymerCross(scale:number,i:number):[number,number]{
 const [y,z]=HEX[i];
 return [polymerY(POLY.pivotY+(y-POLY.pivotY)*scale),z*scale];
}
const POLY_STATIONS:readonly Station[]=[
 {x:POLY.startX,scale:.93},
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
  'family-handguard-fnc-p16-extended-root-polymer',
  POLY_STATIONS.map(s=>s.x),(x,i)=>polymerCross(scaleAt(x),i));
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=6;
 mesh.userData.fncP5LowerHex=true;
 mesh.userData.fncMoldedFlutesPerSide=2;
 mesh.userData.fncP11ShortWidePolymer=true;
 mesh.userData.fncP13ExtendedPolymer=true;
 mesh.userData.fncP14ReceiverSeatedPolymer=true;
 mesh.userData.fncP15RaisedPolymer=true;
 mesh.userData.fncP16ConcealedReceiverRoot=true;
 mesh.userData.fncP22ExposedMetalNeck=true;
 mesh.userData.fncP17TaperedReceiverRoot=true;
 mesh.userData.fncP17LowerMass=true;
 mesh.userData.fncP22RaisedPolymerBelly=true;
 mesh.userData.fncP18MonumentalPolymer=true;
 mesh.userData.fncP6OutwardEndcaps=true;
 applyFNCPixelDetails(mesh,'polymer');
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
 mesh.userData.fncP15RaisedCollar=true;
 mesh.userData.fncP17BroadHandstop=true;
 mesh.userData.fncP18DeepEndLip=true;
 return mesh;
}
// One gas-cover root grows into the sight-supporting block. Two nearby
// shoulder stations establish an intentional change of breadth without
// separating the actual metal gas housing or adding a second mesh.
function gasCross(x:number,i:number):readonly [number,number]{
 const sight=FNC_FRONT_P13.sight;
 const t=Math.max(0,Math.min(1,
  (x-GAS.transitionStartX)/(GAS.transitionEndX-GAS.transitionStartX)));
 const top=GAS.topY+(sight.baseTopY-GAS.topY)*
  Math.max(0,Math.min(1,(x-GAS.transitionStartX)/
   (GAS.endX-GAS.transitionStartX)));
 const bottom=GAS.bottomY+(sight.baseBottomY-GAS.bottomY)*t;
 const side=GAS.sideHalfZ+(.98-GAS.sideHalfZ)*t;
 const roof=GAS.roofHalfZ+(.73-GAS.roofHalfZ)*t;
 const shoulder=GAS.shoulderY+(.50-GAS.shoulderY)*t;
 const yyzz:readonly (readonly [number,number])[]=[
  [bottom,-GAS.bottomHalfZ],[bottom,GAS.bottomHalfZ],
  [shoulder,side],[top,roof],[top,-roof],[shoulder,-side]
 ];
 return yyzz[i];
}
export function addFNCUpperGasBox(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 // One six-face metal envelope; no extra bridge boxes.
 const mesh=makeSixFacePrism(root,material,
  'family-handguard-fnc-p15-upper-gas-spine',
  [GAS.startX,GAS.transitionStartX,GAS.transitionEndX,GAS.endX],
  gasCross);
 mesh.userData.fncP5UpperGasBox=true;
 mesh.userData.fncP6NarrowGasBox=true;
 mesh.userData.fncP7ConnectedGasHousing=true;
 mesh.userData.fncP11LongSlimVentedCover=true;
 mesh.userData.fncP12CompressedGasCover=true;
 mesh.userData.fncP13NestedFacetedGasCover=true;
 mesh.userData.fncP14LoweredGasCover=true;
 mesh.userData.fncP15UpperGasSpine=true;
 mesh.userData.fncP16ExtendedGasRoot=true;
 mesh.userData.fncP18RaisedFourVentSpine=true;
 mesh.userData.fncP22ContinuousGasBlock=true;
 mesh.userData.fncP13CompactIntegratedSightBase=true;
 mesh.userData.fncP14LowSightBase=true;
 mesh.userData.fncP15AlignedGasSightBase=true;
 mesh.userData.fncP16CompactGasSightBase=true;
 mesh.userData.fncP17SimplifiedSightSeat=true;
 mesh.userData.fncP7ContinuousGasSightSeat=true;
 mesh.userData.fncFrontSightBase=true;
 mesh.userData.fncP4IntegratedGasSeat=true;
 applyFNCPixelDetails(mesh,'gas');
 return mesh;
}
