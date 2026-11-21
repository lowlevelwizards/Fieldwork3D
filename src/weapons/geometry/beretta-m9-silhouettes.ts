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
const SLIDE_REAR=-8.86;
const SLIDE_BOTTOM=.34,SLIDE_TOP=3.17;
const SLIDE_DEPTH=3.03,UPPER_SLIDE_DEPTH=2.42;
const FRAME_DEPTH=2.62;
const BARREL_Y=2.48,BARREL_RADIUS=1.02;
/** One shared 2-sided minimal accent; never created/disposed per-model/frame. */
const SAFETY_RED=new THREE.MeshBasicMaterial({
 color:0xc73c32,side:THREE.DoubleSide,toneMapped:false
});
// Tonal factory M9A3 panels: darker FDE, not an aftermarket black patch.
// One pooled material; no per-view allocation or global material disposal.
const M9A3_GRIP_PANEL=AR_MUTED_FDE.clone();
M9A3_GRIP_PANEL.color.multiplyScalar(.59);

/** D10: one open-nose cast U with a SHORT bridge behind its face.
 * A Beretta has an exposed barrel FROM ABOVE, not an open underside.
 * The front never stacks ornamental muzzle rings, cheeks, or chamfer ladders.
 * The bridge supports the sight without blocking the forward barrel mouth.
 */
function m9UnifiedFrontShell(nose:number):THREE.BufferGeometry{
 // One graphic ten-point cross-section: big parallel cheeks, broad bottom,
 // true open throat. Front face is flat rather than successively inset.
 const yz:readonly (readonly [number,number])[]=[
  [-1.34,3.57],[-1.48,1.65],[-1.14,1.31],
  [1.14,1.31],[1.48,1.65],[1.34,3.57],
  [1.05,3.50],[1.05,1.75],[-1.05,1.75],[-1.05,3.50]
 ];
 type V=readonly [number,number,number];
 const vertices:number[]=[];
 const tri=(a:V,b:V,c:V)=>vertices.push(...a,...b,...c);
 const quad=(a:V,b:V,c:V,d:V)=>{
  tri(a,b,c);tri(a,c,d);
 };
 // Shorter than the former decorative barrel wrap; seated into the U-channel.
 const rear=nose-1.03,front=nose+.04;
 const facePoint=(z:number,y:number):V=>[front,y,z];
 const signed=yz.reduce((sum,p,i)=>{
  const q=yz[(i+1)%yz.length];return sum+p[0]*q[1]-q[0]*p[1];
 },0);
 for(let i=0;i<yz.length;i++){
  const [z0,y0]=yz[i],[z1,y1]=yz[(i+1)%yz.length];
  const a:V=[rear,y0,z0],b=facePoint(z0,y0),
   c=facePoint(z1,y1),d:V=[rear,y1,z1];
  if(signed>0)quad(a,b,c,d);else quad(a,d,c,b);
 }
 // One solid U face, never a disk covering the genuine barrel mouth.
 const contour=yz.map(([z,y])=>new THREE.Vector2(z,y));
 for(const [i,j,k] of THREE.ShapeUtils.triangulateShape(contour,[])){
  const a=facePoint(yz[i][0],yz[i][1]),
   b=facePoint(yz[j][0],yz[j][1]),
   c=facePoint(yz[k][0],yz[k][1]);
  const faceX=(b[1]-a[1])*(c[2]-a[2])-
   (b[2]-a[2])*(c[1]-a[1]);
  if(faceX>0)tri(a,b,c);else tri(a,c,b);
 }
 // The sight is mounted on one plain SHORT crossbridge, BEHIND the open
 // front face. No full-length top roof, chamfer tier, external muzzle ring
 // or second front-support piece. Its sides sink into both U cheeks.
 const x0=nose-.46,x1=nose-.13,y0=3.51,y1=3.65;
 const lower:V[]=[[x0,y0,-1.18],[x1,y0,-1.18],
  [x1,y0,1.18],[x0,y0,1.18]];
 const upper:V[]=[[x0,y1,-1.18],[x1,y1,-1.18],
  [x1,y1,1.18],[x0,y1,1.18]];
 quad(upper[0],upper[3],upper[2],upper[1]);
 quad(lower[0],lower[1],lower[2],lower[3]);
 quad(lower[1],upper[1],upper[2],lower[2]);
 quad(lower[3],upper[3],upper[0],lower[0]);
 // One squat, centered wedge sharing the bridge's upper plane.
 const sx0=nose-.43,sx1=nose-.17,by=y1,ty=3.95;
 const lo:V[]=[[sx0,by,-.45],[sx1,by,-.45],
  [sx1,by,.45],[sx0,by,.45]];
 const hi:V[]=[[sx0+.03,ty,-.31],[sx1-.03,ty,-.31],
  [sx1-.03,ty,.31],[sx0+.03,ty,.31]];
 quad(hi[0],hi[3],hi[2],hi[1]);
 for(let i=0;i<4;i++){
  const j=(i+1)%4;quad(lo[i],lo[j],hi[j],hi[i]);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

/** D10: the two formerly independent open rails become ONE solid U-channel.
 * Sidewalls keep the barrel exposed from above. A continuous thin bottom
 * prevents an accidental see-through view of the barrel from underneath.
 * No extra materials, meshes, fixtures or per-frame geometry are required.
 */
function m9OpenSlideChannelGeometry(front:number):THREE.BufferGeometry{
 const yz:readonly (readonly [number,number])[]=[
  [-1.51,1.73],[-1.51,.35],[1.51,.35],[1.51,1.73],
  [.99,1.73],[.99,.76],[-.99,.76],[-.99,1.73]
 ];
 type V=readonly [number,number,number];
 const vertices:number[]=[];
 const tri=(a:V,b:V,c:V)=>vertices.push(...a,...b,...c);
 const quad=(a:V,b:V,c:V,d:V)=>{tri(a,b,c);tri(a,c,d);};
 const rear=-2.80,signed=yz.reduce((sum,p,i)=>{
  const q=yz[(i+1)%yz.length];return sum+p[0]*q[1]-q[0]*p[1];
 },0);
 for(let i=0;i<yz.length;i++){
  const [z0,y0]=yz[i],[z1,y1]=yz[(i+1)%yz.length];
  const a:V=[rear,y0,z0],b:V=[front,y0,z0],
   c:V=[front,y1,z1],d:V=[rear,y1,z1];
  if(signed>0)quad(a,b,c,d);else quad(a,d,c,b);
 }
 const contour=yz.map(([z,y])=>new THREE.Vector2(z,y));
 for(const [i,j,k] of THREE.ShapeUtils.triangulateShape(contour,[])){
  const point=(x:number,n:number):V=>[x,yz[n][1],yz[n][0]];
  const a=point(front,i),b=point(front,j),c=point(front,k);
  const cross=(b[1]-a[1])*(c[2]-a[2])-
   (b[2]-a[2])*(c[1]-a[1]);
  if(cross>0){tri(a,b,c);tri(point(rear,i),point(rear,k),point(rear,j));}
  else{tri(a,c,b);tri(point(rear,i),point(rear,j),point(rear,k));}
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
  // D10: shorter, tighter guard footprint, not thinner fragile rails.
  [1.10,-.70],[1.02,-3.05],
  [.54,-3.52],[-.04,-3.73],[-1.87,-3.68],
  [-2.83,-3.44],[-4.15,-4.06],
  [a.gripFront+(a.straightGrip ? .15 : .33),a.heel+1.03],
  [a.gripFront-.05,a.heel+.32],[a.gripRear+.50,a.heel],
  [a.gripRear-.06,a.heel+.52],
  [a.straightGrip?-8.73:-9.12,-5.18],
  [a.straightGrip?-7.95:-8.16,-3.35],
  // D9: short, thick beavertail rooted in the continuous rear frame.
  [-8.20,-2.37],[-9.36,-1.04],[-10.00,-.71],
  [-10.23,-.49],[-10.13,-.12],[-9.20,.04]
 ];
 // Large curved-octagonal hole is genuine through-Z geometry; the lower
 // guard remains thick enough to read at game scale without becoming a box.
 // The guard opening remains real; its front and top are a
 // continuous, thick web, with no sliver gap in muzzle-quarter view.
 const opening:Outline=[
  [-2.64,-1.38],[.27,-1.38],[.54,-1.82],
  [.36,-2.42],[-.14,-3.05],[-1.80,-3.02],
  [-2.72,-2.74],[-2.89,-2.10]
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
 // D10: simple square rear termination plus ONE large bevel into the
 // upper plane. Remove the large slanted rear-top wedge and tiny steps.
 const breech:Outline=[
  [SLIDE_REAR,SLIDE_BOTTOM],[-.98,SLIDE_BOTTOM],
  [-.98,1.96],[-1.34,2.73],[-1.78,SLIDE_TOP],
  [-8.44,SLIDE_TOP],[SLIDE_REAR,2.64]
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

 // D10: one real U-profile replaces two side-only ribbons. The floor
 // is closed under the barrel but the characteristic OPEN TOP remains.
 const channel=new THREE.Mesh(
  m9OpenSlideChannelGeometry(a.nose-.86),slideMaterial);
 channel.name='family-barrel-'+id+'-unified-open-slide-channel';
 channel.userData.m9OpenSlideRail=true; // compatibility marker
 channel.userData.m9OpenSlideChannel=true;
 channel.userData.m9ClosedUnderside=true;
 channel.castShadow=true;channel.receiveShadow=true;root.add(channel);
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

 // D10: eight strong outline stations and a substantially thicker depth.
 // Broad hammer head and shoulder sit inside the squared rear slide.
 const hammer:Outline=[
  [-8.18,2.05],[-8.28,2.82],[-8.69,3.47],
  [-9.43,3.77],[-10.12,3.77],[-10.13,3.46],
  [-9.50,3.29],[-8.59,2.05]
 ];
 const hammerMesh=addOutline(root,'receiver',id,n++,hammer,1.37,slideMaterial);
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
  // D10: the panel is a primary visual mass, not a timid sticker.
  // Fully inset six-point contour; classic rake stronger than A3 Vertec.
  const gripPanel:Outline=a.straightGrip?[
   [-7.65,-1.98],[-4.94,-2.06],[-5.56,-5.12],
   [-5.68,-8.27],[-8.91,-8.23],[-8.25,-5.10]
  ]:[
   [-7.75,-1.98],[-4.95,-2.06],[-5.70,-5.12],
   [-5.84,-8.40],[-9.65,-8.45],[-8.57,-5.10]
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
  muzzleWrapEndX:a.nose+.04,
  upperBridgeFrontX:-.98,beavertailRearX:-10.23,
  upperRoofInset:.14,lowerSlideTopY:2.16,
  frontWrapDepth:1.07,
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
