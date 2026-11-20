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
  nose:9.23,barrelEnd:9.64,heel:-9.04,gripRear:-10.21,
  gripFront:-5.54,straightGrip:false,rail:false,threaded:false
 },
 'beretta-m9a3':{
  nose:9.32,barrelEnd:10.16,heel:-8.87,gripRear:-9.34,
  gripFront:-5.15,straightGrip:true,rail:true,threaded:true
 }
} as const;
const SLIDE_REAR=-8.82;
const SLIDE_BOTTOM=.34,SLIDE_TOP=3.17;
const SLIDE_DEPTH=3.03,UPPER_SLIDE_DEPTH=2.42;
const FRAME_DEPTH=2.62,RAIL_DEPTH=.55;
const BARREL_Y=2.48,BARREL_RADIUS=1.02;
/** One shared 2-sided minimal accent; never created/disposed per-model/frame. */
const SAFETY_RED=new THREE.MeshBasicMaterial({
 color:0xc73c32,side:THREE.DoubleSide,toneMapped:false
});
// Tonal factory M9A3 panels: darker FDE, not an aftermarket black patch.
// One pooled material; no per-view allocation or global material disposal.
const M9A3_GRIP_PANEL=AR_MUTED_FDE.clone();
M9A3_GRIP_PANEL.color.multiplyScalar(.76);

/** Presentation contacts always come from the authored shape, not a Glock. */
export function m9ArtSockets(id:M9AppearanceId){
 const a=M9_ART[id],heel=(a.gripRear+a.gripFront)/2;
 return Object.freeze({
  muzzle:Object.freeze({x:a.barrelEnd,y:BARREL_Y,z:0}),
  primaryGrip:Object.freeze({x:heel+.34,y:-4.92,z:-.18}),
  supportGrip:Object.freeze({x:heel+.69,y:-3.48,z:.77}),
  slideGrip:Object.freeze({x:-5.25,y:1.50,z:0}),
  magazineBase:Object.freeze({x:heel,y:a.heel-.19,z:0}),
  sightLine:Object.freeze({x:-.85,y:3.56,z:0}),
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
  [1.58,-.70],[1.52,-3.10],
  [.97,-3.65],[.22,-3.85],[-1.96,-3.84],
  [-2.82,-3.57],[-4.15,-4.06],
  [a.gripFront+.43,a.heel+1.03],
  [a.gripFront-.05,a.heel+.32],[a.gripRear+.50,a.heel],
  [a.gripRear-.06,a.heel+.52],
  [a.straightGrip?-8.50:-9.12,-5.18],
  [a.straightGrip?-7.95:-8.16,-3.35],
  [-8.20,-2.37],[-10.02,-.72],[-11.25,-.47],
  [-11.45,-.19],[-9.20,-.02]
 ];
 // Large curved-octagonal hole is genuine through-Z geometry; the lower
 // guard remains thick enough to read at game scale without becoming a box.
 const opening:Outline=[
  [-2.69,-1.30],[.78,-1.30],[1.08,-1.80],
  [.93,-2.43],[.34,-3.19],[-1.94,-3.21],
  [-2.78,-2.82],[-2.96,-2.13]
 ];
 const localFrame=frameMaterial.clone();localFrame.side=THREE.DoubleSide;
 const frame=addProfileFrame(root,'receiver',id,n++,outer,opening,
  FRAME_DEPTH,localFrame);
 frame.name='family-receiver-'+id+'-integrated-frame';
 frame.userData.m9IntegratedFrame=true;
 frame.userData.m9OpenGuard=true;
 frame.userData.m9OwnsMaterial=true;

 // D4: forward-reaching NARROW rear upper, with a thicker LOWER skirt.
 // Both have purposeful depth, preventing a single long Glock-like slab.
 // The sloping rear boundary angles toward the muzzle as it rises.
 const breech:Outline=[
  [-8.91,SLIDE_BOTTOM],[-1.22,SLIDE_BOTTOM],
  [-1.22,2.72],[-1.64,SLIDE_TOP],
  [-8.15,SLIDE_TOP],[-8.91,1.22]
 ];
 const rearSlide=addOutline(root,'barrel',id,n++,breech,
  UPPER_SLIDE_DEPTH,slideMaterial);
 // D5: shoulder-depth lower section, tapered crown. Bend the existing
 // shell vertices instead of adding ornamental bevel meshes. The roof
 // becomes 14% narrower in Z, without touching the lower slide footprint.
 const roofPositions=rearSlide.geometry.getAttribute('position');
 for(let i=0;i<roofPositions.count;i++){
  const y=roofPositions.getY(i);
  const t=THREE.MathUtils.clamp((y-1.91)/(SLIDE_TOP-1.91),0,1);
  roofPositions.setZ(i,roofPositions.getZ(i)*(1-.14*t));
 }
 roofPositions.needsUpdate=true;
 rearSlide.geometry.computeVertexNormals();
 rearSlide.geometry.computeBoundingBox();
 rearSlide.geometry.computeBoundingSphere();
 rearSlide.name='family-barrel-'+id+'-moving-slide';
 rearSlide.userData.m9TaperedRoof=true;
 rearSlide.userData.m9MovingSlide=true;
 rearSlide.userData.m9NarrowUpperBridge=true;
 const skirt:Outline=[
  [-8.91,SLIDE_BOTTOM],[-2.74,SLIDE_BOTTOM],
  [-2.74,2.16],[-8.56,2.16]
 ];
 const lowerSkirt=addOutline(root,'barrel',id,n++,skirt,
  SLIDE_DEPTH,slideMaterial);
 lowerSkirt.userData.m9BroadLowerSlide=true;

 // The lower rear band is tall enough to carry controls and serrations;
 // the forward open rails remain low so the exposed cylinder stays dominant.
 const sideRail:Outline=[
  [-2.74,SLIDE_BOTTOM],[a.nose-.42,SLIDE_BOTTOM],
  [a.nose,SLIDE_BOTTOM+.28],[a.nose,1.55],
  [a.nose-.39,1.72],[-2.74,1.72]
 ];
 for(const side of [-1,1]){
  const rail=addOutline(root,'barrel',id,n++,sideRail,RAIL_DEPTH,slideMaterial);
  rail.position.z=side*(SLIDE_DEPTH-RAIL_DEPTH)/2;
  rail.name='family-barrel-'+id+(side===1?'-right-open-rail':'-left-open-rail');
  rail.userData.m9OpenSlideRail=true;
 }
 const barrel=addFacetedTube(root,'barrel',id,n++,-1.57,a.barrelEnd,
  BARREL_RADIUS,barrelMaterial);
 barrel.position.y=BARREL_Y;
 barrel.name='family-barrel-'+id+'-visible-open-top-barrel';
 barrel.userData.m9ExposedBarrel=true;
 // D5: extend the *same physical U* rearward along the low side rails.
 // The short front crown bridge connects its cheeks and carries the sight;
 // only the final nose is bridged, preserving an open top behind it.
 // The local XY cross-section becomes world Z/Y after 90-degree Y rotation.
 const cross:readonly (readonly [number,number])[]=[
  [-1.63,3.02],[-1.63,1.27],[-1.25,.95],
  [1.25,.95],[1.63,1.27],[1.63,3.02],
  [1.12,3.02],[1.12,1.62],[-1.12,1.62],[-1.12,3.02]
 ];
 const wrapShape=new THREE.Shape();
 wrapShape.moveTo(cross[0][0],cross[0][1]);
 for(const [u,v] of cross.slice(1))wrapShape.lineTo(u,v);
 wrapShape.closePath();
 const wrapGeometry=new THREE.ExtrudeGeometry(wrapShape,{
  depth:1.45,steps:1,bevelEnabled:false,curveSegments:1
 });
 wrapGeometry.rotateY(Math.PI/2);
 wrapGeometry.translate(a.nose-1.37,0,0);
 const wrap=new THREE.Mesh(wrapGeometry,slideMaterial);
 wrap.name='family-barrel-'+id+'-open-muzzle-wrap';
 wrap.userData.m9NoseBridge=true;
 wrap.userData.m9FrontUWrap=true;
 wrap.castShadow=true;wrap.receiveShadow=true;root.add(wrap);
 // A shallow front cap ties both side cheeks together (not a long roof).
 // Its top physically carries the longer, squat Beretta front sight.
 const wrapCrown=cuboid('barrel',a.nose-.30,3.22,0,
  .78,.43,3.26,slideMaterial);
 wrapCrown.userData.m9FrontWrapCrown=true;

 // A compact darker six-facet muzzle crown reads clearly from front/quarter
 // without expanding the actual cylinder diameter or plugging the open top.
 const tip=addFacetedTube(root,'barrel',id,n++,a.barrelEnd-.22,
  a.barrelEnd+.035,BARREL_RADIUS*.76,muzzleMaterial);
 tip.position.y=BARREL_Y;
 tip.userData.m9MuzzleCrown=true;

 // D5: taller/leaner hammer without changing the long D4 beavertail.
 const hammer:Outline=[
  [-8.81,2.42],[-9.06,2.76],[-9.35,4.22],
  [-9.12,4.43],[-8.89,4.31],[-8.72,3.10]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.52,slideMaterial);
 hammerMesh.userData.m9Hammer=true;

 // Oversize, uncomplicated rear and front sights.
 cuboid('barrel',-7.93,3.30,0,.53,.37,1.22,slideMaterial);
 // D5: broaden sight front-to-back and root its base into the nose cap.
 const frontSight=cuboid('barrel',a.nose-.32,3.55,0,
  .83,.40,1.14,slideMaterial);
 frontSight.userData.m9AttachedFrontSight=true;
 // D4: slope matches the actual heel rather than leaving a triangular gap
 // above a horizontal box. Upper face penetrates the butt by 0.15 units.
 const plateProfile:Outline=[
  [a.gripRear+.39,a.heel+.15],
  [a.gripFront+.18,a.heel+.46],
  [a.gripFront+.20,a.heel-.09],
  [a.gripRear+.34,a.heel-.36]
 ];
 const floorplate=addOutline(root,'magazine',id,n++,plateProfile,
  FRAME_DEPTH+.27,gripMaterial);
 floorplate.userData.m9MagazineFloorplate=true;
 floorplate.userData.m9HeelContact=true;

 if(showDetails){
  // Panels sweep with the real grip, not isolated upright dark trapezoids.
  // Both face pieces are slim broad wedges embedded into the sculpted butt.
  const gripPanel:Outline=a.straightGrip?[
   [-8.12,-1.64],[-4.57,-1.64],
   [a.gripFront-.12,a.heel+.76],
   [a.gripRear+.68,a.heel+.60],[-8.46,-4.00]
  ]:[
   [-8.25,-1.64],[-4.58,-1.72],
   [a.gripFront-.12,a.heel+.77],
   [a.gripRear+.82,a.heel+.59],[-8.80,-4.02]
  ];
  for(const side of [-1,1]){
   const panelMaterial=clay?HK_BLACK_METAL:a.rail?M9A3_GRIP_PANEL:gripMaterial;
   const pad=addOutline(root,'grip',id,n++,gripPanel,.13,panelMaterial);
   pad.position.z=side*(FRAME_DEPTH/2+.012);
   pad.userData.m9GripPanel=true;
  }
  // D5: grooves belong to the *broad lower skirt*, not the tapering
  // upper slide; move forward, keep their short forward slope and roof gap.
  // One indexed mesh for both side faces (no mesh per mark).
  const positions:number[]=[],index:number[]=[];
  for(const side of [-1,1]){
   for(let i=0;i<4;i++){
    const x=-5.97+i*.58,z=side*(SLIDE_DEPTH/2+.028);
    const at=positions.length/3;
    positions.push(x,.70,z,x+.22,.70,z,
     x+.68,2.04,z,x+.46,2.04,z);
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

  // Lowered decocker sits on the taller broad skirt with the safety dot.
  const lever:Outline=[
   [-8.46,1.98],[-7.73,1.98],[-7.19,1.60],
   [-7.62,1.34],[-8.88,1.52]
  ];
  for(const side of [-1,1]){
   const decocker=addOutline(root,'receiver',id,n++,lever,.20,dark);
   decocker.position.z=side*(SLIDE_DEPTH/2+.09);
   decocker.userData.m9DecockerCue=true;
  }
  // One six-facet red indicator on EACH broad lower slide face.
  // All 12 flat colored facets share one indexed object and one pooled
  // matte accent. It is a visual safety cue, not an operable control.
  const dotPositions:number[]=[],dotIndices:number[]=[];
  for(const side of [-1,1]){
   const z=side*(SLIDE_DEPTH/2+.032),center=dotPositions.length/3;
   const cx=-8.13,cy=1.06,r=.18;
   dotPositions.push(cx,cy,z);
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    dotPositions.push(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r,z);
   }
   for(let i=0;i<6;i++){
    if(side>0)dotIndices.push(center,center+1+i,center+1+(i+1)%6);
    else dotIndices.push(center,center+1+(i+1)%6,center+1+i);
   }
  }
  const safetyGeom=new THREE.BufferGeometry();
  safetyGeom.setAttribute('position',new THREE.Float32BufferAttribute(dotPositions,3));
  safetyGeom.setIndex(dotIndices);safetyGeom.computeVertexNormals();
  const dots=new THREE.Mesh(safetyGeom,SAFETY_RED);
  dots.name='family-receiver-'+id+'-red-safety-indicators';
  dots.userData.m9RedSafetyDots=true;dots.castShadow=false;
  root.add(dots);

  // Three deliberate frame-side identifiers in ONE shared indexed mesh:
  // big slide stop, takedown disc, and high magazine-release button.
  // They are non-operational visual cues, deliberately asymmetric.
  const controlPositions:number[]=[],controlIndices:number[]=[];
  const quad=(points:readonly (readonly [number,number])[],z:number)=>{
   const at=controlPositions.length/3;
   for(const [x,y] of points)controlPositions.push(x,y,z);
   controlIndices.push(at,at+1,at+2,at,at+2,at+3);
  };
  quad([[-3.87,-.32],[-2.92,-.32],[-2.71,-.10],[-3.74,-.10]],
   FRAME_DEPTH/2+.038);
  quad([[-4.81,-1.78],[-4.43,-1.78],[-4.43,-1.40],[-4.81,-1.40]],
   FRAME_DEPTH/2+.045);
  for(const side of [-1,1]){
   const z=side*(FRAME_DEPTH/2+.045),cx=-.43,cy=-.30,r=.23;
   const center=controlPositions.length/3;
   controlPositions.push(cx,cy,z);
   for(let k=0;k<6;k++){
    const theta=k*Math.PI/3;
    controlPositions.push(cx+r*Math.cos(theta),cy+r*Math.sin(theta),z);
   }
   for(let k=0;k<6;k++){
    if(side>0)controlIndices.push(center,center+1+k,center+1+(k+1)%6);
    else controlIndices.push(center,center+1+(k+1)%6,center+1+k);
   }
  }
  const controlGeo=new THREE.BufferGeometry();
  controlGeo.setAttribute('position',
   new THREE.Float32BufferAttribute(controlPositions,3));
  controlGeo.setIndex(controlIndices);controlGeo.computeVertexNormals();
  const controls=new THREE.Mesh(controlGeo,dark);
  controls.name='family-receiver-'+id+'-iconic-control-batch';
  controls.userData.m9FrameControlBatch=true;
  controls.castShadow=false;root.add(controls);
 }
 if(a.rail){
  // A3-only, readable under-frame rail; sits in dust-cover mass instead of
  // an extra long floating rectangle.
  const rail=cuboid('receiver',4.80,-.86,0,2.65,.51,1.96,frameMaterial);
  rail.userData.m9AccessoryRail=true;
  // Three broad slot cues in a single plane, no individual hardware mesh.
  const slotPositions:number[]=[],slotIndices:number[]=[];
  for(const side of [-1,1]){
   const z=side*(1.96/2+.024);
   for(let k=0;k<3;k++){
    const x=3.84+k*.61,at=slotPositions.length/3;
    slotPositions.push(x,-1.09,z,x+.18,-1.09,z,
     x+.18,-.91,z,x,-.91,z);
    if(side>0)slotIndices.push(at,at+1,at+2,at,at+2,at+3);
    else slotIndices.push(at,at+2,at+1,at,at+3,at+2);
   }
  }
  const slotGeometry=new THREE.BufferGeometry();
  slotGeometry.setAttribute('position',
   new THREE.Float32BufferAttribute(slotPositions,3));
  slotGeometry.setIndex(slotIndices);slotGeometry.computeVertexNormals();
  const slots=new THREE.Mesh(slotGeometry,dark);
  slots.name='family-receiver-'+id+'-rail-slot-batch';
  slots.userData.m9RailSlots=true;slots.castShadow=false;
  root.add(slots);
 }
 root.userData.m9ArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,noseX:a.nose,muzzleX:a.barrelEnd,
  slideBottomY:SLIDE_BOTTOM,slideTopY:SLIDE_TOP,
  slideDepth:SLIDE_DEPTH,upperSlideDepth:UPPER_SLIDE_DEPTH,
  frameDepth:FRAME_DEPTH,gripHeelY:a.heel,
  guardOpening:true,actualOpenTop:true,
  barrelRadius:BARREL_RADIUS,barrelY:BARREL_Y,
  muzzleWrapEndX:a.nose+.08,
  upperBridgeFrontX:-1.22,beavertailRearX:-11.45,
  upperRoofInset:.14,lowerSlideTopY:2.16,
  frontWrapDepth:1.45,
  serrationBottomY:.70,serrationTopY:2.04,
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
