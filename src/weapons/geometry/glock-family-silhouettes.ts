/** Glock G2.6: iconic compact miniatures and a wrapped port, not firearm CAD.
 * One exaggerated slide and ONE integrated polymer frame/grip/guard with a true
 * opening. No floaters, secondary lower spacers or false trigger-guard boxes.
 * Art-only: not a primary weapon, an equipable secondary or a simulation change.
 * +X muzzle, +Y up, +Z right face; geometry built on preview configuration.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,AR_MUTED_FDE,FAL_VENT_SHADOW}
 from './weapon-visual-palette.ts';

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
export type GlockAppearanceOptions={monochrome?:boolean;details?:boolean};

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
const SLIDE_REAR=-8.55,SLIDE_TOP=3.04,SLIDE_BOTTOM=.34;
const SLIDE_DEPTH=2.96,FRAME_DEPTH=2.62;

export function buildGlockAppearance(id:GlockAppearanceId,
 options:GlockAppearanceOptions={}):THREE.Group{
 const art=GLOCK_G2_ART[id],coyote=id==='glock-g19x';
 const clay=options.monochrome===true;
 const steel=clay?HK_BLACK_METAL:coyote?AR_MUTED_FDE:HK_BLACK_METAL;
 const polymer=clay?HK_BLACK_METAL:coyote?AR_MUTED_FDE:HK_DARK_POLYMER;
 const shadow=clay?HK_BLACK_METAL:FAL_VENT_SHADOW;
 const root=new THREE.Group();root.name='glock-appearance-'+id;
 root.userData.glockAppearance=id;root.userData.appearanceOnly=true;
 root.userData.glockG2FieldworkProportions=true;
 root.userData.glockG25BalancedProportions=true;
 root.userData.glockG26IdentityRefinement=true;
 let n=0;
 const box=(slot:'barrel'|'magazine',x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material)=>
  addCuboid(root,slot,id,n++,x,y,z,w,h,d,material);

 // G2.5: keep G2 mass, but undo ~one third of its exaggeration:
 // G19 slide 16.85 long / 2.70 high / 2.96 deep, down from G1's
 // long wafer (18.8) and G2's over-tall slab (15.69 × 2.90 × 3.15).
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
  [1.76,-3.36],[1.31,-3.80],
  [-2.79,-3.80],[art.frontHeelX,art.heelY],
  [art.rearHeelX,art.heelY],
  // Two restrained facets make the backstrap sweep rather than kink.
  [art.rearHeelX+.24,art.heelY+1.23],
  [art.rearHeelX+.61,art.heelY+2.64],
  [-6.73,-2.59],[-7.24,-1.68],[SLIDE_REAR+.12,-1.29]
 ];
 frame.moveTo(perimeter[0][0],perimeter[0][1]);
 for(const [x,y] of perimeter.slice(1))frame.lineTo(x,y);
 frame.closePath();
 const opening=new THREE.Path();
 // Extra substantial perimeter: ~0.8 lower bar and ~1.0 front pillar,
 // while maintaining one open ~3.1 × 1.1 graphic negative-space landmark.
 opening.moveTo(-2.36,-1.91);
 opening.lineTo(.78,-1.91);
 opening.lineTo(.78,-3.02);
 opening.lineTo(-2.36,-3.02);
 opening.closePath();
 frame.holes.push(opening);
 const frameGeom=new THREE.ExtrudeGeometry(frame,{
  depth:FRAME_DEPTH,steps:1,bevelEnabled:false,curveSegments:1});
 frameGeom.translate(0,0,-FRAME_DEPTH/2);
 const frameMesh=new THREE.Mesh(frameGeom,polymer);
 frameMesh.name='family-receiver-'+id+'-integrated-polymer';
 frameMesh.castShadow=true;frameMesh.receiveShadow=true;
 frameMesh.userData.glockOpenGuard=true;
 frameMesh.userData.glockHandle=true;
 frameMesh.userData.glockIntegratedFrameGrip=true;
 root.add(frameMesh);

 // One wide blunt magazine heel, deliberately a little bigger than grip.
 box('magazine',(art.rearHeelX+art.frontHeelX)/2,art.heelY-.18,0,
  art.frontHeelX-art.rearHeelX+.24,.40,FRAME_DEPTH+.16,polymer);

 // Two simplified chunky low-profile landmarks (not rail-height sights).
 box('barrel',SLIDE_REAR+.83,SLIDE_TOP+.19,0,.59,.40,1.44,shadow);
 box('barrel',art.frontX-.74,SLIDE_TOP+.19,0,.43,.40,1.44,shadow);

 if(options.details!==false&&!clay){
  // One material and ONE mesh for serrations + an iconic L-shaped port.
  // Its six-vertex continuous panel wraps right (+Z) onto top (+Y).
  // This is a broad graphic seam, not a hollow mechanical chamber.
  const verts:number[]=[],indices:number[]=[];
  const addMark=(x:number,y:number,side:number,w:number,h:number)=>{
   const z=side*(SLIDE_DEPTH/2+.018),base=verts.length/3;
   verts.push(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z);
   if(side>0)indices.push(base,base+1,base+2,base,base+2,base+3);
   else indices.push(base,base+2,base+1,base,base+3,base+2);
  };
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)
    addMark(SLIDE_REAR+.70+i*.50,.72,side,.26,1.35);
   if(art.frontSerrations)
    for(let i=0;i<2;i++)
     addMark(art.frontX-2.20+i*.55,.80,side,.23,1.19);
  }
  // From the right side to the top in ONE continuous, four-triangle
  // six-vertex ribbon; side 3.15 × .92, top ~3.15 × 1.12.
  // x=0.26..3.41 keeps it distinct from rear serrations and nose.
  // Corner points are shared; no separate floating top decal/mesh.
  const x0=.26,x1=3.41,y0=2.11,y1=SLIDE_TOP+.018;
  const zOuter=SLIDE_DEPTH/2+.018,zInner=.36;
  const first=verts.length/3;
  verts.push(
   x0,y0,zOuter, x1,y0,zOuter,
   x1,y1,zOuter, x0,y1,zOuter,
   x1,y1,zInner, x0,y1,zInner
  );
  indices.push(
   first,first+1,first+2,first,first+2,first+3,
   first+3,first+2,first+4,first+3,first+4,first+5
  );
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const marks=new THREE.Mesh(geom,shadow);
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.userData.glockRightEjectionPort=true;
  marks.userData.glockRightEjectionPortGeometry='shared-edge-side-to-top-six-vertex-ribbon';
  marks.userData.glockPortFaceCount=2;
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
 root.userData.glockArtLandmarks=Object.freeze({
  rearX:SLIDE_REAR,muzzleX:art.frontX,
  slideTopY:SLIDE_TOP,slideBottomY:SLIDE_BOTTOM,slideDepth:SLIDE_DEPTH,
  frameDepth:FRAME_DEPTH,gripHeelY:art.heelY,
  gripRearX:art.rearHeelX,gripFrontX:art.frontHeelX,
  guardOpeningX:[-2.36,.78],guardOpeningY:[-3.02,-1.91],
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
  if(child instanceof THREE.Mesh)child.geometry.dispose();
 });
 root.clear();
}
