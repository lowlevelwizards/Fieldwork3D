/** Glock G2.7: identity-lock miniatures with honest open guards, not CAD.
 * One exaggerated slide and ONE integrated polymer frame/grip/guard with a true
 * opening. No floaters, secondary lower spacers or false trigger-guard boxes.
 * Art-only: not a primary weapon, an equipable secondary or a simulation change.
 * +X muzzle, +Y up, +Z right face; geometry built on preview configuration.
 */
import * as THREE from 'three';
import {normalizeGlockCustomization,
 glockHasAccessoryRail,glockHasOpticMount,
 type GlockCustomization} from './glock-customization.ts';
import {addOutline,addCuboid,type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,AR_MUTED_FDE,FAL_VENT_SHADOW,
 GLOCK_COYOTE_SLIDE,GLOCK_PORT_SHADOW} from './weapon-visual-palette.ts';

export const GLOCK_APPEARANCE_REFERENCES=[
 {id:'glock-g19-gen3',name:'G19 · Gen 3',description:'Balanced compact · reference master'},
 {id:'glock-g26',name:'G26 · Subcompact',description:'Short upper and compact grip · distinctly stout'},
 {id:'glock-g19x',name:'G19X · Crossover',description:'Compact slide · fuller coyote grip'},
 {id:'glock-g19-gen5-mos',name:'G19 · Gen 5 MOS',description:'Modern compact · restrained optic-cut identity'}
] as const;
export type GlockAppearanceId=typeof GLOCK_APPEARANCE_REFERENCES[number]['id'];
export function isGlockAppearanceId(value:string):value is GlockAppearanceId{
 return GLOCK_APPEARANCE_REFERENCES.some(ref=>ref.id===value);
}
export type GlockAppearanceOptions={monochrome?:boolean;details?:boolean;
 customization?:GlockCustomization};
/** S1: authoring-space sockets, never guessed from a screenshot or independent
 * combat offsets. +X muzzle, +Y up, +Z operator-right. Visual rig/shot solver
 * must transform these through the SAME held-weapon world matrix. */
export type GlockArtPoint=Readonly<{x:number;y:number;z:number}>;
export type GlockArtSockets=Readonly<{
 muzzle:GlockArtPoint;primaryGrip:GlockArtPoint;supportGrip:GlockArtPoint;
 slideGrip:GlockArtPoint;magazineSeat:GlockArtPoint;magazineBase:GlockArtPoint;
 sightLine:GlockArtPoint;holsterPivot:GlockArtPoint;
}>;
const point=(x:number,y:number,z:number):GlockArtPoint=>Object.freeze({x,y,z});
export function glockArtSockets(id:GlockAppearanceId):GlockArtSockets{
 const art=GLOCK_G2_ART[id],heel=(art.frontHeelX+art.rearHeelX)/2;
 return Object.freeze({
  muzzle:point(art.frontX,1.62,0),
  primaryGrip:point(heel,-4.20,-.18),
  supportGrip:point(heel+.30,-3.35,.85),
  slideGrip:point(-4.50,1.45,0),
  magazineSeat:point(heel,-3.55,0),
  magazineBase:point(heel,art.heelY-.18,0),
  sightLine:point(-1.0,3.26,0),
  holsterPivot:point(heel,-3.25,0)
 });
}

/** All coordinates below are symbolic Fieldwork ART UNITS, not real dimensions.
 * Explicit variant profiles prevent the G26 and G19X from being scaled copies.
 */
/** G2.5 hand-authored middle ground: approximately 65% G2 / 35% G1,
 * with decisive adjustments rather than uniformly scaling any weapon.
 * Kept GLOCK_G2_ART export name for existing tooling compatibility.
 */
export const GLOCK_G2_ART={
 'glock-g19-gen3':{frontX:8.30,heelY:-7.65,rearHeelX:-8.05,frontHeelX:-4.06,frontSerrations:false,mos:false},
 'glock-g26':{frontX:5.78,heelY:-5.88,rearHeelX:-7.86,frontHeelX:-4.17,frontSerrations:false,mos:false},
 'glock-g19x':{frontX:8.30,heelY:-8.96,rearHeelX:-8.11,frontHeelX:-3.82,frontSerrations:false,mos:false},
 'glock-g19-gen5-mos':{frontX:8.30,heelY:-7.65,rearHeelX:-8.05,frontHeelX:-4.06,frontSerrations:true,mos:true}
} as const;
// G2.8: subtly fuller slide, with the real muzzle X and grip sockets fixed.
const SLIDE_REAR=-8.66,SLIDE_TOP=3.17,SLIDE_BOTTOM=.21;
const SLIDE_DEPTH=3.20,FRAME_DEPTH=2.62;
export function glockMagazineArtDimensions(id:GlockAppearanceId){
 const a=GLOCK_G2_ART[id],w=a.frontHeelX-a.rearHeelX;
 return {bodyWidth:w-.36,bodyDepth:FRAME_DEPTH-.48,bodyHeight:-a.heelY-.18,plateWidth:w+.48,plateDepth:FRAME_DEPTH+.40,plateHeight:.56};
}

export function buildGlockAppearance(id:GlockAppearanceId,
 options:GlockAppearanceOptions={}):THREE.Group{
 const art=GLOCK_G2_ART[id];
 const customization=normalizeGlockCustomization(id,options.customization);
 const coyote=customization.finish==='factory'?
  id==='glock-g19x':customization.finish==='coyote';
 const clay=options.monochrome===true;
 const steel=clay?HK_BLACK_METAL:coyote?GLOCK_COYOTE_SLIDE:HK_BLACK_METAL;
 const polymer=clay?HK_BLACK_METAL:coyote?AR_MUTED_FDE:HK_DARK_POLYMER;
 const shadow=clay?HK_BLACK_METAL:FAL_VENT_SHADOW;
 const marksFinish=GLOCK_PORT_SHADOW;
 const root=new THREE.Group();root.name='glock-appearance-'+id;
 root.userData.glockAppearance=id;root.userData.appearanceOnly=true;
 root.userData.glockG2FieldworkProportions=true;
 root.userData.glockG25BalancedProportions=true;
 root.userData.glockG26IdentityRefinement=true;
 root.userData.glockG27IdentityLock=true;
 root.userData.glockArtSockets=glockArtSockets(id);
 root.userData.glockCustomization=customization;
 let n=0;
 const box=(slot:'barrel'|'magazine',x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material)=>
  addCuboid(root,slot,id,n++,x,y,z,w,h,d,material);

 // G2.8: fuller slide while preserving real muzzle and grip sockets.
 const slideOutline:Outline=[
  [SLIDE_REAR,SLIDE_BOTTOM],[art.frontX-.26,SLIDE_BOTTOM],
  [art.frontX,.63],[art.frontX,SLIDE_TOP-.29],
  [art.frontX-.32,SLIDE_TOP],[SLIDE_REAR+.29,SLIDE_TOP],
  [SLIDE_REAR,SLIDE_TOP-.30]
 ];
 const slide=addOutline(root,'barrel',id,n++,slideOutline,SLIDE_DEPTH,steel);
 slide.name='family-barrel-'+id+'-slide';
 slide.userData.glockMovingSlide=true;

 // A SINGLE physically continuous side profile for frame, handle and
 // trigger guard. Extrusion with a genuine open aperture eliminates G1's
 // rear wedge artifacts, paper-thin underside and detached guard junction.
 // No cosmetic separate grip skin; no duplicate nearly coplanar slabs.
 const frame=new THREE.Shape();
 const perimeter:Outline=[
  [SLIDE_REAR+.12,.44],[art.frontX-.17,.44],
  // Shallow nose band, subtly deepening toward the front guard.
  // Preserve the lower as a single continuous extrusion, not two slabs.
  [art.frontX-.17,-1.01],[3.00,-1.07],[1.76,-1.24],
  [1.76,-3.40],[1.30,-3.88],
  [-2.83,-3.88],[art.frontHeelX,art.heelY],
  [art.rearHeelX,art.heelY],
  // A broad, deliberate backstrap sweep; remove G2.6's pinched V.
  [art.rearHeelX+.28,art.heelY+1.28],
  [art.rearHeelX+.58,art.heelY+2.55],
  [-7.03,-2.64],[-7.26,-2.13],[SLIDE_REAR+.12,-1.39]
 ];
 frame.moveTo(perimeter[0][0],perimeter[0][1]);
 for(const [x,y] of perimeter.slice(1))frame.lineTo(x,y);
 frame.closePath();
 const opening=new THREE.Path();
 // One authentic, taller open guard with a simple diagonal rear transition.
 // ~3.1 × 1.4 void: retains .75 lower rim and .93 front pillar.
 // The 5-point aperture (not an extra mesh) restores sidearm anatomy.
 opening.moveTo(-2.25,-1.72);
 opening.lineTo(.83,-1.72);
 opening.lineTo(.83,-3.13);
 opening.lineTo(-1.98,-3.13);
 opening.lineTo(-2.25,-2.82);
 opening.closePath();
 frame.holes.push(opening);
 const frameGeom=new THREE.ExtrudeGeometry(frame,{
  depth:FRAME_DEPTH,steps:1,bevelEnabled:false,curveSegments:1});
 frameGeom.translate(0,0,-FRAME_DEPTH/2);
 // Two-sided inside aperture/side wall, without mutating pooled palette.
 const guardMaterial=polymer.clone();guardMaterial.side=THREE.DoubleSide;
 const frameMesh=new THREE.Mesh(frameGeom,guardMaterial);
 frameMesh.userData.glockOwnsMaterial=true;
 frameMesh.userData.glockGuardInteriorFaces=true;
 frameMesh.name='family-receiver-'+id+'-integrated-polymer';
 frameMesh.castShadow=true;frameMesh.receiveShadow=true;
 frameMesh.userData.glockOpenGuard=true;
 frameMesh.userData.glockHandle=true;
 frameMesh.userData.glockIntegratedFrameGrip=true;
 root.add(frameMesh);

 // G2.8: a visibly chunkier magazine floorplate, without changing capacity.
 const magazineArt=glockMagazineArtDimensions(id);
 const floorplate=box('magazine',(art.rearHeelX+art.frontHeelX)/2,
  art.heelY-.24,0,magazineArt.plateWidth,magazineArt.plateHeight,magazineArt.plateDepth,polymer);
 floorplate.userData.glockMagazineFloorplate=true;

 // Two simplified chunky low-profile landmarks (not rail-height sights).
 box('barrel',SLIDE_REAR+.83,SLIDE_TOP+.19,0,.59,.40,1.44,shadow);
 box('barrel',art.frontX-.74,SLIDE_TOP+.19,0,.43,.40,1.44,shadow);

 if(options.details!==false&&!clay){
  // One material and ONE mesh for serrations + an iconic L-shaped port.
  // Its six-vertex continuous panel wraps right (+Z) onto top (+Y).
  // This is a broad graphic seam, not a hollow mechanical chamber.
  const verts:number[]=[],indices:number[]=[],shades:number[]=[];
  const shade=(amount:number,vertices:number)=>{
   for(let i=0;i<vertices;i++)shades.push(amount,amount,amount);
  };
  const addMark=(x:number,y:number,side:number,w:number,h:number)=>{
   const z=side*(SLIDE_DEPTH/2+.018),base=verts.length/3;
   verts.push(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z);
   shade(.91,4);
   if(side>0)indices.push(base,base+1,base+2,base,base+2,base+3);
   else indices.push(base,base+2,base+1,base,base+3,base+2);
  };
  // G2.9: full-height side grooves, with only a hairline inset to stay
  // within the slide's upper/lower edges. All variants keep their original
  // groove widths, count and lateral spacing, including Gen 5 front grooves.
  const grooveBottom=SLIDE_BOTTOM+.08,grooveTop=SLIDE_TOP-.08;
  const grooveHeight=grooveTop-grooveBottom;
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)
    addMark(SLIDE_REAR+.74+i*.68,grooveBottom,side,.35,grooveHeight);
   if(art.frontSerrations)
    for(let i=0;i<2;i++)
     addMark(art.frontX-2.63+i*.76,grooveBottom,side,.31,grooveHeight);
  }
  // G2.7 retains the wrapped panel; lower its contrast rather than
  // changing its silhouette or adding a hole to the slide.
  // One small +X muzzle-face inset also shares this batch (two triangles).
  // From the right side to the top in ONE continuous, four-triangle
  // six-vertex ribbon; side 3.15 × .92, top ~3.15 × 1.12.
  // x=0.26..3.41 keeps it distinct from rear serrations and nose.
  // Corner points are shared; no separate floating top decal/mesh.
  // A low-contrast front face mark is only an inspectable muzzle cue,
  // not a modeled bore, barrel mechanism or additional draw mesh.
  const face=verts.length/3;
  const muzzleX=art.frontX+.018;
  verts.push(muzzleX,1.25,-.53,muzzleX,1.25,.53,
   muzzleX,2.04,.53,muzzleX,2.04,-.53);
  shade(.81,4);
  indices.push(face,face+2,face+1,face,face+3,face+2);
  const x0=.26,x1=3.41,y0=2.11,y1=SLIDE_TOP+.018;
  const zOuter=SLIDE_DEPTH/2+.018,zInner=.36;
  const first=verts.length/3;
  verts.push(
   x0,y0,zOuter, x1,y0,zOuter,
   x1,y1,zOuter, x0,y1,zOuter,
   x1,y1,zInner, x0,y1,zInner
  );
  // Darker port in the same batched detail mesh; no overlay object.
  shade(.43,6);
  indices.push(
   first,first+1,first+2,first,first+2,first+3,
   first+3,first+2,first+4,first+3,first+4,first+5
  );
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const detailMaterial=marksFinish.clone();detailMaterial.vertexColors=true;
  const marks=new THREE.Mesh(geom,detailMaterial);
  marks.userData.glockOwnsMaterial=true;
  marks.userData.glockPortShade=.43;
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.userData.glockRightEjectionPort=true;
  marks.userData.glockRightEjectionPortGeometry='shared-edge-side-to-top-six-vertex-ribbon';
  marks.userData.glockPortFaceCount=2;
  marks.userData.glockMuzzleFaceCue=true;
  marks.castShadow=false;marks.receiveShadow=false;
  root.add(marks);
  if(art.mos){
   // One flush top inset only: optic-ready APPEARANCE, not a fictitious
   // optic mount, rail, moving mechanism or live attachment capability.
   const plate=box('barrel',SLIDE_REAR+3.50,SLIDE_TOP+.008,0,2.30,.022,1.88,shadow);
   plate.name='family-barrel-'+id+'-mos-top-inset';
   plate.userData.glockMOSAppearanceOnly=true;
   plate.castShadow=false;plate.receiveShadow=false;
  }
 }
 // P6 real low-poly installed accessories. Only physical compatible
 // sockets draw models; no free-floating labels or pretend optic housing.
 // Material reuse and a maximum of 5 chunky cuboids maintain art economy.
 if(customization.optic==='micro'&&glockHasOpticMount(id)){
  const optic=box('barrel',SLIDE_REAR+3.6,SLIDE_TOP+.58,0,
   2.10,.93,1.68,steel);
  optic.name='glock-installed-micro-optic';
  optic.userData.glockInstalledOptic='micro';
  const glass=box('barrel',SLIDE_REAR+4.66,SLIDE_TOP+.68,0,
   .045,.48,1.12,GLOCK_PORT_SHADOW);
  glass.name='glock-optic-window';
  const base=box('barrel',SLIDE_REAR+3.6,SLIDE_TOP+.11,0,
   2.34,.24,1.96,polymer);
  base.name='glock-mos-optic-footprint';
 }
 if(customization.light==='compact'&&glockHasAccessoryRail(id)){
  const body=box('barrel',art.frontX-2.37,-1.74,0,
   3.05,1.12,2.12,polymer);
  body.name='glock-installed-rail-light';
  body.userData.glockInstalledLight='compact';
  const lens=box('barrel',art.frontX-.75,-1.72,0,
   .24,.87,1.42,GLOCK_PORT_SHADOW);
  lens.name='glock-light-lens';
 }
 root.userData.glockArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,muzzleX:art.frontX,
  slideTopY:SLIDE_TOP,slideBottomY:SLIDE_BOTTOM,slideDepth:SLIDE_DEPTH,
  guardInteriorDoubleSided:true,slideGrooveWidth:.35,slideGrooveSpacing:.68,
  slideGrooveBottomY:SLIDE_BOTTOM+.08,slideGrooveTopY:SLIDE_TOP-.08,
  magazineFloorplateHeight:.56,portShade:.43,
  frameDepth:FRAME_DEPTH,gripHeelY:art.heelY,
  gripRearX:art.rearHeelX,gripFrontX:art.frontHeelX,
  guardOpeningX:[-2.25,.83],guardOpeningY:[-3.13,-1.72],
  guardFivePointAperture:true,guardRearDiagonal:true,
  rightEjectionPort:!clay&&options.details!==false,
  portSideRange:[.26,3.41,2.11,SLIDE_TOP+.018],
  portTopRange:[.36,SLIDE_DEPTH/2+.018],
  guardOpen:true,integratedFrame:true
 });
 return root;
}
/** Palette assets are global: dispose weapon-owned buffers ONLY. */
export function clearGlockAppearance(root:THREE.Group):void{
 root.traverse(child=>{
  if(child instanceof THREE.Mesh){
   child.geometry.dispose();
   // Own these two local materials; leave all shared game materials intact.
   if(child.userData.glockOwnsMaterial){
    const materials=Array.isArray(child.material)?child.material:[child.material];
    for(const material of materials)material.dispose();
   }
  }
 });
 root.clear();
}
