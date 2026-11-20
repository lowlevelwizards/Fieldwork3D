/** Glock G2: Fieldwork miniature sidearm identity, not a measured firearm CAD model.
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
 {id:'glock-g19-gen3',name:'G19 · Gen 3',description:'Chunky compact · reference master'},
 {id:'glock-g26',name:'G26 · Subcompact',description:'Stout abbreviated grip and short nose'},
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
export const GLOCK_G2_ART={
 'glock-g19-gen3':{frontX:7.52,heelY:-7.22,rearHeelX:-7.76,frontHeelX:-3.52,frontSerrations:false,mos:false},
 'glock-g26':{frontX:5.10,heelY:-5.73,rearHeelX:-7.49,frontHeelX:-3.70,frontSerrations:false,mos:false},
 'glock-g19x':{frontX:7.52,heelY:-8.20,rearHeelX:-7.78,frontHeelX:-3.54,frontSerrations:false,mos:false},
 'glock-g19-gen5-mos':{frontX:7.52,heelY:-7.22,rearHeelX:-7.76,frontHeelX:-3.52,frontSerrations:true,mos:true}
} as const;
const SLIDE_REAR=-8.17,SLIDE_TOP=3.24,SLIDE_BOTTOM=.34;
const SLIDE_DEPTH=3.15,FRAME_DEPTH=2.72;

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
 let n=0;
 const box=(slot:'barrel'|'magazine',x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material)=>
  addCuboid(root,slot,id,n++,x,y,z,w,h,d,material);

 // Deliberately STUBBY broad slab: ~17% shorter, 34% taller, 29% deeper
 // than G1. The rear/slide/chamfer relationship matters more than markings.
 const slideOutline:Outline=[
  [SLIDE_REAR,SLIDE_BOTTOM],[art.frontX-.27,SLIDE_BOTTOM],
  [art.frontX,.65],[art.frontX,2.90],
  [art.frontX-.38,SLIDE_TOP],[-7.89,SLIDE_TOP],
  [SLIDE_REAR,2.95]
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
  [-8.08,.45],[art.frontX-.14,.45],
  [art.frontX-.14,-1.43],[1.46,-1.43],
  [1.46,-3.12],[1.02,-3.48],
  [-2.66,-3.48],[art.frontHeelX,art.heelY],
  [art.rearHeelX,art.heelY],
  [art.rearHeelX+.43,art.heelY+2.30],
  [-6.34,-2.04],[-7.16,-1.28],[-8.08,-1.28]
 ];
 frame.moveTo(perimeter[0][0],perimeter[0][1]);
 for(const [x,y] of perimeter.slice(1))frame.lineTo(x,y);
 frame.closePath();
 const opening=new THREE.Path();
 opening.moveTo(-2.37,-1.93);
 opening.lineTo(.87,-1.93);
 opening.lineTo(.87,-2.94);
 opening.lineTo(-2.37,-2.94);
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
 box('barrel',-7.36,3.43,0,.60,.42,1.46,shadow);
 box('barrel',art.frontX-.75,3.43,0,.43,.42,1.46,shadow);

 if(options.details!==false&&!clay){
  // One mesh for all broad slide serration shadows, front only on the MOS.
  // Smaller/economical than G1; no 3D grooves, tiny knobs or port decal.
  const verts:number[]=[],indices:number[]=[];
  const addMark=(x:number,side:number,w:number,h:number)=>{
   const z=side*(SLIDE_DEPTH/2+.018),y=.75,base=verts.length/3;
   verts.push(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z);
   if(side>0)indices.push(base,base+1,base+2,base,base+2,base+3);
   else indices.push(base,base+2,base+1,base,base+3,base+2);
  };
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)addMark(-7.53+i*.48,side,.27,1.53);
   if(art.frontSerrations)
    for(let i=0;i<2;i++)addMark(art.frontX-2.07+i*.52,side,.24,1.32);
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const marks=new THREE.Mesh(geom,shadow);
  marks.name='family-barrel-'+id+'-serration-batch';
  marks.castShadow=false;marks.receiveShadow=false;
  root.add(marks);
  if(art.mos){
   // One flush top inset only: optic-ready APPEARANCE, not a fictitious
   // optic mount, rail, moving mechanism or live attachment capability.
   const plate=box('barrel',-4.97,SLIDE_TOP+.008,0,2.30,.022,1.88,shadow);
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
