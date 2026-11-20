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
  nose:9.23,barrelEnd:9.36,heel:-9.04,gripRear:-10.21,
  gripFront:-5.54,straightGrip:false,rail:false,threaded:false
 },
 'beretta-m9a3':{
  nose:9.32,barrelEnd:10.02,heel:-8.87,gripRear:-9.34,
  gripFront:-5.15,straightGrip:true,rail:true,threaded:true
 }
} as const;
const SLIDE_REAR=-8.82;
const SLIDE_BOTTOM=.34,SLIDE_TOP=3.17;
const SLIDE_DEPTH=3.03,FRAME_DEPTH=2.62,RAIL_DEPTH=.55;
const BARREL_Y=2.46,BARREL_RADIUS=.88;

/** Presentation contacts always come from the authored shape, not a Glock. */
export function m9ArtSockets(id:M9AppearanceId){
 const a=M9_ART[id],heel=(a.gripRear+a.gripFront)/2;
 return Object.freeze({
  muzzle:Object.freeze({x:a.barrelEnd,y:BARREL_Y,z:0}),
  primaryGrip:Object.freeze({x:heel+.34,y:-4.92,z:-.18}),
  supportGrip:Object.freeze({x:heel+.69,y:-3.48,z:.77}),
  slideGrip:Object.freeze({x:-5.25,y:1.50,z:0}),
  magazineBase:Object.freeze({x:heel,y:a.heel-.19,z:0}),
  sightLine:Object.freeze({x:-.85,y:3.39,z:0}),
  holsterPivot:Object.freeze({x:heel,y:-4.08,z:0})
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
  [-9.07,.44],[6.71,.44],[6.71,-.28],[5.92,-.70],
  [2.48,-.82],[1.64,-1.10],[1.64,-3.06],
  [.99,-3.59],[-2.69,-3.59],[-3.75,-3.25],
  [-4.15,-4.06],[a.gripFront+.43,a.heel+1.03],
  [a.gripFront-.05,a.heel+.32],[a.gripRear+.50,a.heel],
  [a.gripRear-.06,a.heel+.52],
  [a.straightGrip?-8.50:-9.12,-5.18],
  [a.straightGrip?-7.95:-8.16,-3.35],
  [-8.20,-2.37],[-9.88,-.57],[-9.20,-.02]
 ];
 // Large curved-octagonal hole is genuine through-Z geometry; the lower
 // guard remains thick enough to read at game scale without becoming a box.
 const opening:Outline=[
  [-2.69,-1.27],[.78,-1.27],[1.18,-1.76],
  [1.19,-2.31],[.55,-3.12],[-1.95,-3.18],
  [-2.82,-2.77],[-2.95,-2.12]
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
  [SLIDE_REAR,SLIDE_BOTTOM],[-2.69,SLIDE_BOTTOM],
  [-2.69,2.62],[-3.17,SLIDE_TOP],
  [SLIDE_REAR+.35,SLIDE_TOP],[SLIDE_REAR,2.88]
 ];
 const rearSlide=addOutline(root,'barrel',id,n++,breech,SLIDE_DEPTH,slideMaterial);
 rearSlide.name='family-barrel-'+id+'-moving-slide';
 rearSlide.userData.m9MovingSlide=true;

 // Open upper = two low left/right rails. Their roofs stop at Y1.65; a
 // real six-sided, brighter barrel is revealed above them from both sides.
 const sideRail:Outline=[
  [-2.74,SLIDE_BOTTOM],[a.nose-.42,SLIDE_BOTTOM],
  [a.nose,SLIDE_BOTTOM+.28],[a.nose,1.48],
  [a.nose-.39,1.61],[-2.74,1.61]
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
 const bridge=cuboid('barrel',a.nose-.30,1.02,0,.49,.91,SLIDE_DEPTH,
  slideMaterial);
 bridge.userData.m9NoseBridge=true;

 // A compact darker six-facet muzzle crown reads clearly from front/quarter
 // without expanding the actual cylinder diameter or plugging the open top.
 const tip=addFacetedTube(root,'barrel',id,n++,a.barrelEnd-.22,
  a.barrelEnd+.035,BARREL_RADIUS*.76,muzzleMaterial);
 tip.position.y=BARREL_Y;
 tip.userData.m9MuzzleCrown=true;

 // Hooked, round-shouldered hammer. Integrated beavertail remains in frame.
 const hammer:Outline=[
  [-8.86,2.44],[-9.27,2.69],[-9.78,3.17],
  [-10.02,3.57],[-9.82,3.75],[-9.54,3.74],
  [-9.24,3.51],[-8.83,3.03]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.52,slideMaterial);
 hammerMesh.userData.m9Hammer=true;

 // Oversize, uncomplicated rear and front sights.
 cuboid('barrel',-8.07,3.34,0,.56,.36,1.30,slideMaterial);
 cuboid('barrel',a.nose-.61,3.37,0,.49,.35,1.22,slideMaterial);
 const buttCenter=(a.gripRear+a.gripFront)/2;
 const floorplate=cuboid('magazine',buttCenter,a.heel-.19,0,
  a.gripFront-a.gripRear+.37,.38,FRAME_DEPTH+.18,gripMaterial);
 floorplate.userData.m9MagazineFloorplate=true;

 if(showDetails){
  // Panels sweep with the real grip, not isolated upright dark trapezoids.
  // Both face pieces are slim broad wedges embedded into the sculpted butt.
  const gripPanel:Outline=a.straightGrip?[
   [-7.72,-3.71],[-5.20,-3.87],
   [a.gripFront-.09,a.heel+.83],[a.gripFront-.30,a.heel+.56],
   [a.gripRear+.63,a.heel+.55]
  ]:[
   [-7.88,-3.77],[-5.26,-3.90],
   [a.gripFront-.07,a.heel+.83],[a.gripFront-.25,a.heel+.53],
   [a.gripRear+.78,a.heel+.52]
  ];
  for(const side of [-1,1]){
   const pad=addOutline(root,'grip',id,n++,gripPanel,.13,gripMaterial);
   pad.position.z=side*(FRAME_DEPTH/2+.012);
   pad.userData.m9GripPanel=true;
  }
  // Four full-height slide serrations from near upper to lower edge.
  // One indexed geometry batch, no per-groove mesh or z-fighting overlay.
  const positions:number[]=[],index:number[]=[];
  for(const side of [-1,1]){
   for(let i=0;i<4;i++){
    const x=-7.42+i*.54,z=side*(SLIDE_DEPTH/2+.027);
    const at=positions.length/3;
    positions.push(x,SLIDE_BOTTOM+.065,z,x+.21,SLIDE_BOTTOM+.065,z,
     x+.40,SLIDE_TOP-.045,z,x+.19,SLIDE_TOP-.045,z);
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
   [-8.38,2.50],[-7.93,2.50],[-7.70,2.23],
   [-7.99,2.03],[-8.59,2.03],[-8.70,2.29]
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
  serrationBottomY:SLIDE_BOTTOM+.065,
  serrationTopY:SLIDE_TOP-.045,
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
