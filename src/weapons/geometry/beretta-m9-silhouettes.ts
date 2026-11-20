/** Beretta 92/M9 family: chunky Fieldwork miniature exterior art.
 * ART ONLY. No ammunition, live weapon ID, issued loadout or slide mechanics.
 * +X muzzle, +Y up, +Z right side. Coordinates are symbolic game art units.
 * Two genuinely distinct profiles, not uniformly scaled/recolored clones.
 */
import * as THREE from 'three';
import {addCuboid,addOutline,addFacetedTube,addProfileFrame,
 type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,AR_MUTED_FDE,
 GLOCK_COYOTE_SLIDE,FAL_VENT_SHADOW} from './weapon-visual-palette.ts';

export const M9_APPEARANCE_REFERENCES=[
 {id:'beretta-m9',name:'M9 / 92FS',
  description:'Classic full-size 9mm · exposed barrel, rounded backstrap and hammer'},
 {id:'beretta-m9a3',name:'M9A3',
  description:'Modern Beretta · Vertec grip, railed frame, threaded-muzzle silhouette'}
] as const;
export type M9AppearanceId=typeof M9_APPEARANCE_REFERENCES[number]['id'];
export const isM9AppearanceId=(id:string):id is M9AppearanceId=>
 M9_APPEARANCE_REFERENCES.some(ref=>ref.id===id);
export type M9ArtOptions=Readonly<{monochrome?:boolean;details?:boolean}>;

export const M9_ART={
 'beretta-m9':{
  nose:9.30,barrelEnd:9.40,heel:-8.65,gripRear:-8.15,
  gripFront:-4.05,straightGrip:false,rail:false,threaded:false
 },
 'beretta-m9a3':{
  nose:9.42,barrelEnd:10.00,heel:-8.56,gripRear:-7.95,
  gripFront:-4.04,straightGrip:true,rail:true,threaded:true
 }
} as const;

const SLIDE_REAR=-8.76;
const FRAME_DEPTH=2.72,SLIDE_DEPTH=3.08,RAIL_DEPTH=.55;
const SLIDE_BOTTOM=.38,SLIDE_TOP=3.14;
/** Geometry and presentation contacts deliberately share these art datums. */
export function m9ArtSockets(id:M9AppearanceId){
 const a=M9_ART[id],heel=(a.gripRear+a.gripFront)/2;
 return Object.freeze({
  muzzle:Object.freeze({x:a.barrelEnd,y:2.52,z:0}),
  primaryGrip:Object.freeze({x:heel,y:-4.25,z:-.15}),
  supportGrip:Object.freeze({x:heel+.28,y:-3.25,z:.85}),
  slideGrip:Object.freeze({x:-5.25,y:1.35,z:0}),
  magazineBase:Object.freeze({x:heel,y:a.heel-.22,z:0}),
  sightLine:Object.freeze({x:-.85,y:3.50,z:0}),
  holsterPivot:Object.freeze({x:heel,y:-3.50,z:0})
 });
}

export function buildM9Appearance(id:M9AppearanceId,
 options:M9ArtOptions={}):THREE.Group{
 const a=M9_ART[id],clay=options.monochrome===true;
 const showDetails=options.details!==false&&!clay;
 const steel=clay?HK_BLACK_METAL:a.rail?GLOCK_COYOTE_SLIDE:HK_BLACK_METAL;
 const frameMaterial=clay?HK_BLACK_METAL:a.rail?AR_MUTED_FDE:HK_BLACK_METAL;
 const gripMaterial=clay?HK_BLACK_METAL:HK_DARK_POLYMER;
 const barrelMaterial=clay?HK_BLACK_METAL:a.rail?GLOCK_COYOTE_SLIDE:HK_BLACK_METAL;
 const dark=clay?HK_BLACK_METAL:FAL_VENT_SHADOW;
 const root=new THREE.Group();
 root.name='beretta-m9-appearance-'+id;
 root.userData.appearanceOnly=true;
 root.userData.m9Appearance=id;
 root.userData.m9ArtSockets=m9ArtSockets(id);
 let n=0;
 const cuboid=(slot:'receiver'|'barrel'|'magazine',x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material)=>{
   const mesh=addCuboid(root,slot,id,n++,x,y,z,w,h,d,material);
   return mesh;
  };
 // ONE connected frame including rear swept grip and a true large guard void.
 // The classic model has a rounded graphic backstrap; A3 gets a straighter
 // Vertec profile. No separate dangling grip or guard spacer.
 const outer:Outline=[
  [-8.69,.50],[a.nose-.12,.50],[a.nose-.12,-.86],
  [2.55,-1.04],[1.80,-1.25],[1.80,-3.36],
  [1.20,-3.86],[-3.24,-3.86],
  [a.gripFront,a.heel],[a.gripRear,a.heel],
  [a.straightGrip?-8.12:-8.48,a.heel+1.50],
  [a.straightGrip?-8.08:-8.40,a.heel+2.85],
  [-7.48,-3.06],[-7.80,-2.29],
  [-8.65,-1.28],[-9.55,-.78],[-9.18,-.04]
 ];
 const opening:Outline=[
  [-2.56,-1.64],[.88,-1.64],[1.02,-2.12],
  [.75,-3.09],[-2.16,-3.09],[-2.82,-2.69]
 ];
 // Reuse the actual hole-bearing profile helper; clone only the local frame
 // material so the guard's interior walls remain visible from both sides.
 const localFrame=frameMaterial.clone();localFrame.side=THREE.DoubleSide;
 const frame=addProfileFrame(root,'receiver',id,n++,outer,opening,
  FRAME_DEPTH,localFrame);
 frame.name='family-receiver-'+id+'-integrated-frame';
 frame.userData.m9IntegratedFrame=true;
 frame.userData.m9OpenGuard=true;
 frame.userData.m9OwnsMaterial=true;
 // Rear breech/slide block and TWO forward side rails. No full-width roof
 // across the barrel: the top/quarter view truly reveals exposed barrel.
 const rear:Outline=[
  [SLIDE_REAR,SLIDE_BOTTOM],[-2.37,SLIDE_BOTTOM],
  [-2.37,SLIDE_TOP-.13],[-2.62,SLIDE_TOP],
  [SLIDE_REAR+.25,SLIDE_TOP],[SLIDE_REAR,SLIDE_TOP-.27]
 ];
 const rearSlide=addOutline(root,'barrel',id,n++,rear,SLIDE_DEPTH,steel);
 rearSlide.name='family-barrel-'+id+'-moving-slide';
 rearSlide.userData.m9MovingSlide=true;
 const forward:Outline=[
  [-2.44,SLIDE_BOTTOM],[a.nose-.16,SLIDE_BOTTOM],
  [a.nose,SLIDE_BOTTOM+.34],[a.nose,2.27],
  [a.nose-.31,2.40],[-2.44,2.40]
 ];
 for(const side of [-1,1]){
  const rail=addOutline(root,'barrel',id,n++,forward,RAIL_DEPTH,steel);
  rail.position.z=side*(SLIDE_DEPTH-RAIL_DEPTH)/2;
  rail.name='family-barrel-'+id+(side===1?'-right-open-rail':'-left-open-rail');
  rail.userData.m9OpenSlideRail=true;
 }
 const barrel=addFacetedTube(root,'barrel',id,n++,-2.58,a.barrelEnd,.50,barrelMaterial);
 barrel.position.y=2.57;
 barrel.name='family-barrel-'+id+'-visible-open-top-barrel';
 barrel.userData.m9ExposedBarrel=true;
 // The front bridge joins both rails below the barrel without filling the
 // characteristic wide upper aperture.
 const noseBridge=cuboid('barrel',a.nose-.30,.72,0,.58,.52,SLIDE_DEPTH,steel);
 noseBridge.userData.m9NoseBridge=true;
 // Deliberately oversized exposed hammer and small named sights.
 const hammer:Outline=[
  [-8.84,2.31],[-9.26,2.69],[-9.93,3.47],
  [-9.70,3.74],[-9.20,3.77],[-8.65,3.17]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.44,steel);
 hammerMesh.userData.m9Hammer=true;
 cuboid('barrel',-8.03,3.34,0,.58,.47,1.48,steel);
 cuboid('barrel',a.nose-.76,2.80,0,.48,.45,1.38,steel);
 const heel=(a.gripRear+a.gripFront)/2;
 const floorplate=cuboid('magazine',heel,a.heel-.23,0,
  a.gripFront-a.gripRear+.35,.48,FRAME_DEPTH+.27,gripMaterial);
 floorplate.userData.m9MagazineFloorplate=true;
 if(showDetails){
  // Two matching grip panels are genuine thin surfaces. Profile is
  // deliberately broad: no screw heads, tiny grip dots, or mesh-per-groove.
  const panel:Outline=a.straightGrip?[
   [-7.80,-3.00],[-5.43,-3.00],[-4.52,a.heel+.71],
   [-7.76,a.heel+.71]
  ]:[
   [-7.97,-3.07],[-5.53,-3.03],[-4.49,a.heel+.69],
   [-8.07,a.heel+.69],[-8.29,-5.11]
  ];
  for(const side of [-1,1]){
   const pad=addOutline(root,'grip',id,n++,panel,.065,gripMaterial);
   pad.position.z=side*(FRAME_DEPTH/2+.042);
   pad.userData.m9GripPanel=true;
  }
  // One indexed mark batch for the upper's short, bold grooves. Avoid
  // separate per-serration draw objects and avoid false side mirroring.
  const positions:number[]=[],index:number[]=[];
  const addQuad=(x:number,z:number,side:number)=>{
   const at=positions.length/3,w=.21,y0=.77,y1=2.87;
   positions.push(x,y0,z,x+w,y0,z,x+w+.20,y1,z,x+.20,y1,z);
   if(side>0)index.push(at,at+1,at+2,at,at+2,at+3);
   else index.push(at,at+2,at+1,at,at+3,at+2);
  };
  for(const side of [-1,1])
   for(let i=0;i<4;i++)addQuad(-7.82+i*.52,
    side*(SLIDE_DEPTH/2+.025),side);
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geom.setIndex(index);geom.computeVertexNormals();
  const marks=new THREE.Mesh(geom,dark);
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.userData.m9SerrationBatch=true;marks.castShadow=false;
  root.add(marks);
  // Single broad right-side safety/decocker cue, subordinate to the upper.
  // It is a visual token, not a fabricated functional mechanism.
  const decocker=cuboid('receiver',-7.69,2.25,SLIDE_DEPTH/2+.13,
   1.08,.32,.24,dark);
  decocker.userData.m9DecockerCue=true;
 }
 if(a.rail){
  // Under-barrel dust-cover bridge for A3 only, integrated visually with frame.
  const rail=cuboid('receiver',5.60,-1.03,0,4.05,.44,2.12,frameMaterial);
  rail.userData.m9AccessoryRail=true;
 }
 root.userData.m9ArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,noseX:a.nose,muzzleX:a.barrelEnd,
  slideBottomY:SLIDE_BOTTOM,slideTopY:SLIDE_TOP,
  slideDepth:SLIDE_DEPTH,frameDepth:FRAME_DEPTH,
  gripHeelY:a.heel,guardOpening:true,
  actualOpenTop:true,rail:a.rail,threaded:a.threaded
 });
 return root;
}

/** Dispose owned buffers only; global palette materials must remain pooled. */
export function clearM9Appearance(group:THREE.Group):void{
 group.traverse(child=>{
  if(child instanceof THREE.Mesh){
   child.geometry.dispose();
   if(child.userData.m9OwnsMaterial){
    const mats=Array.isArray(child.material)?child.material:[child.material];
    for(const material of mats)material.dispose();
   }
  }
 });
 group.clear();
}
