/** Beretta 92 / M9: deliberately exaggerated Fieldwork toy-scale art.
 * ART ONLY: this family does not issue ammunition, magazines or live firing.
 * +X = muzzle; +Y = up; +Z = right side. All coordinates are art units.
 * One M9 master silhouette, with a genuinely different M9A3 grip/muzzle/rail.
 */
import * as THREE from 'three';
import {addCuboid,addOutline,addFacetedTube,addProfileFrame,
 type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_MAG_METAL,
 AR_MUTED_FDE,GLOCK_COYOTE_SLIDE,FAL_LOWER_METAL,
 FAL_VENT_SHADOW,HK_MUZZLE_METAL} from './weapon-visual-palette.ts';

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
  nose:9.23,barrelEnd:9.36,heel:-8.90,gripRear:-9.30,
  gripFront:-4.76,straightGrip:false,rail:false,threaded:false
 },
 'beretta-m9a3':{
  nose:9.32,barrelEnd:10.02,heel:-8.78,gripRear:-8.59,
  gripFront:-4.59,straightGrip:true,rail:true,threaded:true
 }
} as const;
const SLIDE_REAR=-8.82;
const SLIDE_BOTTOM=.34,SLIDE_TOP=3.17;
const SLIDE_DEPTH=3.03,FRAME_DEPTH=2.62,RAIL_DEPTH=.55;
const BARREL_Y=2.58,BARREL_RADIUS=.70;

/** Presentation contacts always come from the authored shape, not a Glock. */
export function m9ArtSockets(id:M9AppearanceId){
 const a=M9_ART[id],heel=(a.gripRear+a.gripFront)/2;
 return Object.freeze({
  muzzle:Object.freeze({x:a.barrelEnd,y:BARREL_Y,z:0}),
  primaryGrip:Object.freeze({x:heel+.26,y:-4.72,z:-.18}),
  supportGrip:Object.freeze({x:heel+.62,y:-3.32,z:.77}),
  slideGrip:Object.freeze({x:-5.25,y:1.50,z:0}),
  magazineBase:Object.freeze({x:heel,y:a.heel-.22,z:0}),
  sightLine:Object.freeze({x:-.85,y:3.53,z:0}),
  holsterPivot:Object.freeze({x:heel,y:-3.80,z:0})
 });
}

export function buildM9Appearance(id:M9AppearanceId,
 options:M9ArtOptions={}):THREE.Group{
 const a=M9_ART[id],clay=options.monochrome===true;
 const showDetails=options.details!==false&&!clay;
 // Use existing shared palette: broad matte value hierarchy, no glossy skin.
 const slideMaterial=clay?HK_BLACK_METAL:
  a.rail?GLOCK_COYOTE_SLIDE:HK_BLACK_METAL;
 const frameMaterial=clay?HK_BLACK_METAL:a.rail?AR_MUTED_FDE:FAL_LOWER_METAL;
 const gripMaterial=clay?HK_BLACK_METAL:HK_DARK_POLYMER;
 const barrelMaterial=clay?HK_BLACK_METAL:HK_MAG_METAL;
 const muzzleMaterial=clay?HK_BLACK_METAL:HK_MUZZLE_METAL;
 const dark=clay?HK_BLACK_METAL:FAL_VENT_SHADOW;
 const root=new THREE.Group();
 root.name='beretta-m9-appearance-'+id;
 root.userData.appearanceOnly=true;
 root.userData.m9Appearance=id;
 root.userData.m9ArtSockets=m9ArtSockets(id);
 let n=0;
 const cuboid=(slot:'receiver'|'barrel'|'magazine',x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material)=>
  addCuboid(root,slot,id,n++,x,y,z,w,h,d,material);

 // The FRONT FRAME is visibly shorter and lower than the upper. The rear
 // body, guard, and swept butt stay ONE contiguous lower silhouette.
 const outer:Outline=[
  [-9.07,.46],[7.68,.46],[7.68,-.38],[6.76,-.82],
  [2.45,-.86],[1.54,-1.09],[1.49,-3.07],
  [1.03,-3.71],[-2.64,-3.71],[-3.16,-3.12],
  [-3.64,-3.26],[-4.10,-4.13],
  [a.gripFront+.21,a.heel+.56],
  [a.gripFront-.23,a.heel],[a.gripRear+.43,a.heel],
  [a.gripRear-.02,a.heel+.49],
  [a.straightGrip?-8.28:-8.65,-4.80],
  [a.straightGrip?-7.93:-8.03,-3.09],
  [-7.97,-2.43],[-8.69,-1.23],[-9.80,-.68],[-9.22,-.04]
 ];
 // Large curved-octagonal hole is genuine through-Z geometry; the lower
 // guard remains thick enough to read at game scale without becoming a box.
 const opening:Outline=[
  [-2.52,-1.37],[.63,-1.37],[1.09,-1.69],
  [1.13,-2.25],[.73,-2.98],[.30,-3.15],
  [-1.93,-3.15],[-2.59,-2.80],[-2.77,-2.11]
 ];
 const localFrame=frameMaterial.clone();localFrame.side=THREE.DoubleSide;
 const frame=addProfileFrame(root,'receiver',id,n++,outer,opening,
  FRAME_DEPTH,localFrame);
 frame.name='family-receiver-'+id+'-integrated-frame';
 frame.userData.m9IntegratedFrame=true;
 frame.userData.m9OpenGuard=true;
 frame.userData.m9OwnsMaterial=true;

 // Strong, short rear slide; its top edge breaks before the characteristic
 // exposed round barrel. Not one uninterrupted Glock-like rectangular slab.
 const breech:Outline=[
  [SLIDE_REAR,SLIDE_BOTTOM],[-2.71,SLIDE_BOTTOM],
  [-2.71,2.88],[-2.98,SLIDE_TOP],
  [SLIDE_REAR+.32,SLIDE_TOP],[SLIDE_REAR,2.91]
 ];
 const rearSlide=addOutline(root,'barrel',id,n++,breech,SLIDE_DEPTH,slideMaterial);
 rearSlide.name='family-barrel-'+id+'-moving-slide';
 rearSlide.userData.m9MovingSlide=true;

 // Open upper = two low left/right rails. Their roofs stop at Y1.65; a
 // real six-sided, brighter barrel is revealed above them from both sides.
 const sideRail:Outline=[
  [-2.74,SLIDE_BOTTOM],[a.nose-.30,SLIDE_BOTTOM],
  [a.nose,SLIDE_BOTTOM+.29],[a.nose,1.63],
  [a.nose-.36,1.76],[-2.74,1.76]
 ];
 for(const side of [-1,1]){
  const rail=addOutline(root,'barrel',id,n++,sideRail,RAIL_DEPTH,slideMaterial);
  rail.position.z=side*(SLIDE_DEPTH-RAIL_DEPTH)/2;
  rail.name='family-barrel-'+id+(side===1?'-right-open-rail':'-left-open-rail');
  rail.userData.m9OpenSlideRail=true;
 }
 const barrel=addFacetedTube(root,'barrel',id,n++,-2.83,a.barrelEnd,
  BARREL_RADIUS,barrelMaterial);
 barrel.position.y=BARREL_Y;
 barrel.name='family-barrel-'+id+'-visible-open-top-barrel';
 barrel.userData.m9ExposedBarrel=true;
 // Only a LOW under-barrel bridge, never a rectangular cap over the opening.
 const bridge=cuboid('barrel',a.nose-.30,.85,0,.56,.84,SLIDE_DEPTH,
  slideMaterial);
 bridge.userData.m9NoseBridge=true;

 // A compact darker six-facet muzzle crown reads clearly from front/quarter
 // without expanding the actual cylinder diameter or plugging the open top.
 const tip=addFacetedTube(root,'barrel',id,n++,a.barrelEnd-.22,
  a.barrelEnd+.035,BARREL_RADIUS*.82,muzzleMaterial);
 tip.position.y=BARREL_Y;
 tip.userData.m9MuzzleCrown=true;

 // Hooked, round-shouldered hammer. Integrated beavertail remains in frame.
 const hammer:Outline=[
  [-8.82,2.41],[-9.22,2.65],[-9.78,3.36],
  [-9.94,3.67],[-9.68,3.88],[-9.31,3.88],
  [-9.00,3.58],[-8.65,3.03]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.52,slideMaterial);
 hammerMesh.userData.m9Hammer=true;

 // Oversize, uncomplicated rear and front sights.
 cuboid('barrel',-8.07,3.39,0,.59,.47,1.33,slideMaterial);
 cuboid('barrel',a.nose-.61,3.33,0,.48,.43,1.23,slideMaterial);
 const buttCenter=(a.gripRear+a.gripFront)/2;
 const floorplate=cuboid('magazine',buttCenter,a.heel-.19,0,
  a.gripFront-a.gripRear+.37,.38,FRAME_DEPTH+.18,gripMaterial);
 floorplate.userData.m9MagazineFloorplate=true;

 if(showDetails){
  // Panels sweep with the real grip, not isolated upright dark trapezoids.
  // Both face pieces are slim broad wedges embedded into the sculpted butt.
  const gripPanel:Outline=a.straightGrip?[
   [-7.66,-3.67],[-5.12,-3.67],
   [-4.66,a.heel+.83],[-4.94,a.heel+.54],
   [-7.91,a.heel+.54],[-8.08,-6.45]
  ]:[
   [-7.72,-3.64],[-5.18,-3.70],
   [-4.83,a.heel+.84],[-5.10,a.heel+.55],
   [-8.55,a.heel+.55],[-8.72,-6.61]
  ];
  for(const side of [-1,1]){
   const pad=addOutline(root,'grip',id,n++,gripPanel,.13,gripMaterial);
   pad.position.z=side*(FRAME_DEPTH/2+.012);
   pad.userData.m9GripPanel=true;
  }
  // Three bold serrations per side in ONE indexed batch: no screws,
  // stippling or per-mark draw calls at miniature resolution.
  const positions:number[]=[],index:number[]=[];
  for(const side of [-1,1]){
   for(let i=0;i<3;i++){
    const x=-7.69+i*.59,z=side*(SLIDE_DEPTH/2+.027);
    const at=positions.length/3;
    positions.push(x,.95,z,x+.23,.95,z,
     x+.45,2.76,z,x+.22,2.76,z);
    if(side>0)index.push(at,at+1,at+2,at,at+2,at+3);
    else index.push(at,at+2,at+1,at,at+3,at+2);
   }
  }
  const marksGeometry=new THREE.BufferGeometry();
  marksGeometry.setAttribute('position',
   new THREE.Float32BufferAttribute(positions,3));
  marksGeometry.setIndex(index);marksGeometry.computeVertexNormals();
  const marks=new THREE.Mesh(marksGeometry,dark);
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.userData.m9SerrationBatch=true;marks.castShadow=false;
  root.add(marks);

  // One oversized silhouette decocker paddle on each slide face; unlike
  // arbitrary tiny dots, these can be read at 128px and at side profile.
  const lever:Outline=[
   [-8.15,2.48],[-7.54,2.48],[-7.27,2.22],
   [-7.70,2.03],[-8.47,2.03],[-8.59,2.28]
  ];
  for(const side of [-1,1]){
   const decocker=addOutline(root,'receiver',id,n++,lever,.18,dark);
   decocker.position.z=side*(SLIDE_DEPTH/2+.07);
   decocker.userData.m9DecockerCue=true;
  }
 }
 if(a.rail){
  // A3-only, readable under-frame rail; sits in dust-cover mass instead of
  // an extra long floating rectangle.
  const rail=cuboid('receiver',5.22,-.64,0,3.60,.23,1.96,frameMaterial);
  rail.userData.m9AccessoryRail=true;
 }
 root.userData.m9ArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,noseX:a.nose,muzzleX:a.barrelEnd,
  slideBottomY:SLIDE_BOTTOM,slideTopY:SLIDE_TOP,
  slideDepth:SLIDE_DEPTH,frameDepth:FRAME_DEPTH,
  gripHeelY:a.heel,guardOpening:true,actualOpenTop:true,
  barrelRadius:BARREL_RADIUS,barrelY:BARREL_Y,
  rail:a.rail,threaded:a.threaded
 });
 return root;
}

/** Palette is shared; only the frame's double-sided clone is disposable. */
export function clearM9Appearance(group:THREE.Group):void{
 group.traverse(child=>{
  if(child instanceof THREE.Mesh){
   child.geometry.dispose();
   if(child.userData.m9OwnsMaterial){
    const materials=Array.isArray(child.material)?child.material:[child.material];
    for(const material of materials)material.dispose();
   }
  }
 });
 group.clear();
}
