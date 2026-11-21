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
M9A3_GRIP_PANEL.color.multiplyScalar(.59);

/** D8: cast-toy Beretta muzzle. Same 12-station U cross-section as D7,
 * but with a more rounded OCTAGONAL shoulder and undercut lower cheeks.
 * The short roof cap narrows as it rises into the integrated front sight.
 * One connected, unroofed shell and no extra meshes; +X muzzle, +Y up.
 */
function m9UnifiedFrontShell(nose:number):THREE.BufferGeometry{
 const yz:readonly (readonly [number,number])[]=[
  [-1.16,3.34],[-1.48,2.91],[-1.56,2.20],
  [-1.39,1.69],[-1.12,1.24],
  [1.12,1.24],[1.39,1.69],[1.56,2.20],
  [1.48,2.91],[1.16,3.34],
  [1.06,1.69],[-1.06,1.69]
 ];
 const vertices:number[]=[];
 type V=readonly [number,number,number];
 const tri=(a:V,b:V,c:V)=>{
  vertices.push(...a,...b,...c);
 };
 const quad=(a:V,b:V,c:V,d:V)=>{
  tri(a,b,c);tri(a,c,d);
 };
 const rear=nose-1.27,front=nose+.08;
 // Stronger chamfer at the front: retreat the underside 0.22 art units
 // and pinch only outer cheeks by 8% toward the crown. The inner opening
 // stays full-width to clear the unchanged chunky six-sided barrel.
 const facePoint=(z:number,y:number):V=>{
  const t=THREE.MathUtils.clamp((y-1.24)/2.10,0,1);
  return [front-.22*(1-t),y,
   Math.abs(z)>1.12?z*(1-.08*t):z];
 };
 // Contour orientation controls outer wall facing. No rear cap is needed:
 // it is seated inside the existing open rails.
 const signed=yz.reduce((sum,p,i)=>{
  const q=yz[(i+1)%yz.length];
  return sum+p[0]*q[1]-q[0]*p[1];
 },0);
 for(let i=0;i<yz.length;i++){
  const [z0,y0]=yz[i],[z1,y1]=yz[(i+1)%yz.length];
  const a:V=[rear,y0,z0],b=facePoint(z0,y0),
   c=facePoint(z1,y1),d:V=[rear,y1,z1];
  if(signed>0)quad(a,b,c,d);else quad(a,d,c,b);
 }
 // The front face is a U, NOT a closed square covering the barrel mouth.
 const contour=yz.map(([z,y])=>new THREE.Vector2(z,y));
 for(const [i,j,k] of THREE.ShapeUtils.triangulateShape(contour,[])){
  const a=facePoint(yz[i][0],yz[i][1]),
   b=facePoint(yz[j][0],yz[j][1]),
   c=facePoint(yz[k][0],yz[k][1]);
  const faceX=(b[1]-a[1])*(c[2]-a[2])-
   (b[2]-a[2])*(c[1]-a[1]);
  if(faceX>0)tri(a,b,c);else tri(a,c,b);
 }
 // Crown slopes inward into one broad cast nose, rather than a square
 // horizontal beam on top of two detached-looking posts. The lower
 // section intersects the upper cheek vertices; no additional geometry.
 const x0=nose-.60,x1=nose+.06,y0=3.30,y1=3.61;
 const lower:V[]=[[x0,y0,-1.21],[x1,y0,-1.21],
  [x1,y0,1.21],[x0,y0,1.21]];
 const upper:V[]=[[x0,y1,-.97],[x1,y1,-.97],
  [x1,y1,.97],[x0,y1,.97]];
 quad(upper[0],upper[3],upper[2],upper[1]); // slim flat crown
 quad(lower[1],upper[1],upper[2],lower[2]); // chamfered muzzle face
 quad(lower[3],upper[3],upper[0],lower[0]); // rear
 quad(lower[0],upper[0],upper[1],lower[1]); // left chamfer
 quad(lower[2],upper[2],upper[3],lower[3]); // right chamfer
 // Stubby front sight stays part of this same contiguous art mesh.
 // Four broad faces and one top; no independent sight box.
 const sx0=nose-.39,sx1=nose+.01,by=y1,ty=3.94;
 const lo:V[]=[[sx0,by,-.56],[sx1,by,-.56],
  [sx1,by,.56],[sx0,by,.56]];
 const hi:V[]=[[sx0+.055,ty,-.38],[sx1-.055,ty,-.38],
  [sx1-.055,ty,.38],[sx0+.055,ty,.38]];
 quad(hi[0],hi[3],hi[2],hi[1]);
 for(let i=0;i<4;i++){
  const j=(i+1)%4;
  quad(lo[i],lo[j],hi[j],hi[i]);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

/** Presentation contacts always come from the authored shape, not a Glock. */
export function m9ArtSockets(id:M9AppearanceId){
 const a=M9_ART[id],heel=(a.gripRear+a.gripFront)/2;
 return Object.freeze({
  muzzle:Object.freeze({x:a.barrelEnd,y:BARREL_Y,z:0}),
  primaryGrip:Object.freeze({x:heel+.34,y:-4.92,z:-.18}),
  supportGrip:Object.freeze({x:heel+.69,y:-3.48,z:.77}),
  slideGrip:Object.freeze({x:-5.25,y:1.50,z:0}),
  magazineBase:Object.freeze({x:heel,y:a.heel-.19,z:0}),
  sightLine:Object.freeze({x:-.85,y:3.94,z:0}),
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
  // D8: shortened, substantially thicker swept frame tang. Blunt rather
  // than razor-ended: the upper lip returns directly into the frame web.
  // Same six silhouette stations as D7 (zero added triangles).
  [-8.20,-2.37],[-9.83,-.87],[-10.44,-.59],
  [-10.65,-.36],[-10.55,.06],[-9.20,.04]
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
 // D7: two broad angled planes at the transition to the exposed barrel.
 // Extend its lower nose slightly forward, without an extra bevel object.
 const breech:Outline=[
  [-8.91,SLIDE_BOTTOM],[-.98,SLIDE_BOTTOM],
  [-.98,1.96],[-1.30,2.63],[-1.72,SLIDE_TOP],
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
  [-2.74,SLIDE_BOTTOM],[a.nose-1.30,SLIDE_BOTTOM],
  [a.nose-1.18,SLIDE_BOTTOM+.28],[a.nose-1.18,1.55],
  [a.nose-1.30,1.72],[-2.74,1.72]
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
 // D6: physically connected single faceted front shell, short crown and
 // stubby front sight. The exposed barrel and open slide remain independent.
 const wrap=new THREE.Mesh(m9UnifiedFrontShell(a.nose),slideMaterial);
 wrap.name='family-barrel-'+id+'-unified-open-muzzle-and-sight';
 wrap.userData.m9NoseBridge=true;
 wrap.userData.m9FrontUWrap=true;
 wrap.userData.m9FrontWrapCrown=true;
 wrap.userData.m9AttachedFrontSight=true;
 wrap.userData.m9UnifiedNose=true;
 wrap.castShadow=true;wrap.receiveShadow=true;root.add(wrap);

 // D6: front-facing low-triangle dark muzzle inset, not a second tiny tube.
 // One planar six-facet cap, with no hidden cylindrical walls or back cap.
 const mouthPositions:number[]=[a.barrelEnd+.038,BARREL_Y,0];
 const mouthIndices:number[]=[];
 const mouthR=BARREL_RADIUS*.75;
 for(let k=0;k<6;k++){
  const theta=k*Math.PI/3;
  mouthPositions.push(a.barrelEnd+.038,
   BARREL_Y+mouthR*Math.cos(theta),mouthR*Math.sin(theta));
 }
 for(let k=0;k<6;k++){
  mouthIndices.push(0,k+1,(k+1)%6+1);
 }
 const mouthGeometry=new THREE.BufferGeometry();
 mouthGeometry.setAttribute('position',
  new THREE.Float32BufferAttribute(mouthPositions,3));
 mouthGeometry.setIndex(mouthIndices);mouthGeometry.computeVertexNormals();
 const tip=new THREE.Mesh(mouthGeometry,muzzleMaterial);
 tip.name='family-barrel-'+id+'-low-poly-muzzle-face';
 tip.userData.m9MuzzleCrown=true;
 tip.castShadow=false;root.add(tip);

 // D8: horizontal, rearward-hooked hammer head instead of an upright tab.
 // Same nine stations and one mesh; crown is lower, heavier and raked
 // backward as a recognizable small silhouette at gameplay distance.
 const hammer:Outline=[
  [-8.88,2.45],[-9.17,2.92],[-9.27,3.28],
  [-9.75,3.43],[-10.03,3.62],[-9.91,3.83],
  [-9.60,3.85],[-9.20,3.60],[-8.98,3.15]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.05,slideMaterial);
 hammerMesh.userData.m9Hammer=true;

 // Oversize, uncomplicated rear and front sights.
 cuboid('barrel',-7.93,3.30,0,.53,.37,1.22,slideMaterial);
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
  // D6: factory panels are large side-plane facets, not extruded slabs.
  // Five landmarks follow the actual frame sweep on each *distinct* grip.
  // D8: one extra meaningful side facet on each panel's front and rear
  // contour, read as an intentional convex grip rather than a dark slab.
  // Keep two *planar* sides batched in ONE mesh (no ornamental bevel).
  // Classic is swept/rounded; the A3's Vertec grip remains visibly straighter.
  const gripPanel:Outline=a.straightGrip?[
   [-7.70,-2.12],[-5.19,-2.17],[-5.55,-5.12],
   [a.gripFront-.59,a.heel+.82],
   [a.gripRear+.63,a.heel+.66],[-8.35,-5.12]
  ]:[
   [-8.02,-2.12],[-5.25,-2.19],[-6.00,-5.12],
   [a.gripFront-.89,a.heel+.84],
   [a.gripRear+.66,a.heel+.66],[-9.16,-5.20]
  ];
  const panelVertices:number[]=[],panelIndices:number[]=[];
  const panelTriangles=THREE.ShapeUtils.triangulateShape(
   gripPanel.map(([x,y])=>new THREE.Vector2(x,y)),[]);
  for(const side of [-1,1]){
   const z=side*(FRAME_DEPTH/2+.022),at=panelVertices.length/3;
   for(const [x,y] of gripPanel)panelVertices.push(x,y,z);
   for(const [i,j,k] of panelTriangles){
    const p=gripPanel[i],q=gripPanel[j],r=gripPanel[k];
    const cross=(q[0]-p[0])*(r[1]-p[1])-
     (q[1]-p[1])*(r[0]-p[0]);
    if(cross*side>0)panelIndices.push(at+i,at+j,at+k);
    else panelIndices.push(at+i,at+k,at+j);
   }
  }
  const panelGeo=new THREE.BufferGeometry();
  panelGeo.setAttribute('position',
   new THREE.Float32BufferAttribute(panelVertices,3));
  panelGeo.setIndex(panelIndices);panelGeo.computeVertexNormals();
  const panelMaterial=a.rail?M9A3_GRIP_PANEL:gripMaterial;
  const panel=new THREE.Mesh(panelGeo,panelMaterial);
  panel.name='family-grip-'+id+'-batched-raked-panels';
  panel.userData.m9GripPanelBatch=true;
  panel.userData.m9GripPanel=true;
  panel.castShadow=false;root.add(panel);
  // D5: grooves belong to the *broad lower skirt*, not the tapering
  // upper slide; move forward, keep their short forward slope and roof gap.
  // One indexed mesh for both side faces (no mesh per mark).
  const positions:number[]=[],index:number[]=[];
  for(const side of [-1,1]){
   for(let i=0;i<3;i++){
    const x=-5.91+i*.80,z=side*(SLIDE_DEPTH/2+.028);
    const at=positions.length/3;
    positions.push(x,.70,z,x+.22,.70,z,
     x+.68,2.04,z,x+.46,2.04,z);
    if(side>0)index.push(at,at+1,at+2,at,at+2,at+3);
    else index.push(at,at+2,at+1,at,at+3,at+2);
   }
  }
  // D6: two decocker silhouette paddles share the existing dark surface
  // batch. No extruded lever bodies or extra draw calls.
  const lever:Outline=[
   [-8.46,1.98],[-7.73,1.98],[-7.19,1.60],
   [-7.62,1.34],[-8.88,1.52]
  ];
  const leverTris=THREE.ShapeUtils.triangulateShape(
   lever.map(([x,y])=>new THREE.Vector2(x,y)),[]);
  for(const side of [-1,1]){
   const z=side*(SLIDE_DEPTH/2+.10),at=positions.length/3;
   for(const [x,y] of lever)positions.push(x,y,z);
   for(const [i,j,k] of leverTris){
    const p=lever[i],q=lever[j],r=lever[k];
    const cross=(q[0]-p[0])*(r[1]-p[1])-
     (q[1]-p[1])*(r[0]-p[0]);
    if(cross*side>0)index.push(at+i,at+j,at+k);
    else index.push(at+i,at+k,at+j);
   }
  }
  const marksGeometry=new THREE.BufferGeometry();
  marksGeometry.setAttribute('position',
   new THREE.Float32BufferAttribute(positions,3));
  marksGeometry.setIndex(index);marksGeometry.computeVertexNormals();
  const marks=new THREE.Mesh(marksGeometry,dark);
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.userData.m9SerrationBatch=true;
  marks.userData.m9DecockerBatched=true;
  marks.castShadow=false;
  root.add(marks);

  // D6: two conspicuous red diamonds, two triangles per side.
  // More rounded micro-facets were invisible in actual gameplay captures.
  const dotPositions:number[]=[],dotIndices:number[]=[];
  for(const side of [-1,1]){
   const z=side*(SLIDE_DEPTH/2+.033),at=dotPositions.length/3;
   const cx=-8.13,cy=1.06,r=.18;
   dotPositions.push(cx-r,cy,z,cx,cy+r,z,
    cx+r,cy,z,cx,cy-r,z);
   if(side>0)dotIndices.push(at,at+2,at+1,at,at+3,at+2);
   else dotIndices.push(at,at+1,at+2,at,at+2,at+3);
  }
  const safetyGeom=new THREE.BufferGeometry();
  safetyGeom.setAttribute('position',new THREE.Float32BufferAttribute(dotPositions,3));
  safetyGeom.setIndex(dotIndices);safetyGeom.computeVertexNormals();
  const dots=new THREE.Mesh(safetyGeom,SAFETY_RED);
  dots.name='family-receiver-'+id+'-red-safety-indicators';
  dots.userData.m9RedSafetyDots=true;dots.castShadow=false;
  root.add(dots);


 }
 if(a.rail){
  // D8: the A3 dust-cover rail is a pronounced chunky _silhouette_,
  // not a shallow engraved stripe. Profile seats inside the frame and
  // drops a full 0.7 art units below it. Seven contour stations, one
  // embedded extrusion, no tiny Picatinny teeth at gameplay scale.
  const railProfile:Outline=[
   [2.35,-.61],[6.35,-.61],[6.25,-.95],
   [5.90,-1.40],[3.20,-1.40],
   [2.68,-1.08],[2.35,-.82]
  ];
  const rail=addOutline(root,'receiver',id,n++,railProfile,2.05,frameMaterial);
  rail.name='family-receiver-'+id+'-integrated-dust-cover-rail';
  rail.userData.m9AccessoryRail=true;
  rail.userData.m9IntegralDustCoverRail=true;
 }
 root.userData.m9ArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,noseX:a.nose,muzzleX:a.barrelEnd,
  slideBottomY:SLIDE_BOTTOM,slideTopY:SLIDE_TOP,
  slideDepth:SLIDE_DEPTH,upperSlideDepth:UPPER_SLIDE_DEPTH,
  frameDepth:FRAME_DEPTH,gripHeelY:a.heel,
  guardOpening:true,actualOpenTop:true,
  barrelRadius:BARREL_RADIUS,barrelY:BARREL_Y,
  muzzleWrapEndX:a.nose+.08,
  upperBridgeFrontX:-.98,beavertailRearX:-10.65,
  upperRoofInset:.14,lowerSlideTopY:2.16,
  frontWrapDepth:1.35,
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
