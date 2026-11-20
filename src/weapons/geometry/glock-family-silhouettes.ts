/** Glock G1: deliberately symbolic, low-vertex SIDEARM appearance models.
 * These are real shared Three.js geometry, not a 2D gallery illustration.
 * Art-only: no WeaponId, gameplay, inventory, magazine capacity or save migration.
 * Coordinate contract: +X toward muzzle, +Y up, +Z right/ejection side.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,AR_MUTED_FDE,FAL_VENT_SHADOW}
 from './weapon-visual-palette.ts';

export const GLOCK_APPEARANCE_REFERENCES=[
 {id:'glock-g19-gen3',name:'G19 · Gen 3',description:'Classic compact · original master form'},
 {id:'glock-g26',name:'G26 · Subcompact',description:'Shorter slide and abbreviated grip'},
 {id:'glock-g19x',name:'G19X · Crossover',description:'Compact upper and longer coyote frame'},
 {id:'glock-g19-gen5-mos',name:'G19 · Gen 5 MOS',description:'Modern compact with optic-ready slide'}
] as const;
export type GlockAppearanceId=typeof GLOCK_APPEARANCE_REFERENCES[number]['id'];
export function isGlockAppearanceId(value:string):value is GlockAppearanceId{
 return GLOCK_APPEARANCE_REFERENCES.some(ref=>ref.id===value);
}
export type GlockAppearanceOptions={monochrome?:boolean;details?:boolean};

/** Art units: G19 body width 18.8, height 11.4, not firearm dimensions. */
export function buildGlockAppearance(id:GlockAppearanceId,
 options:GlockAppearanceOptions={}):THREE.Group{
 const compact=id==='glock-g26',crossover=id==='glock-g19x';
 const modern=id==='glock-g19-gen5-mos'||compact||crossover;
 const front=compact?6.55:9.40;
 const heelY=compact?-6.75:crossover?-10.15:-8.50;
 const top=2.50;
 const clay=options.monochrome===true;
 const metal=clay?HK_BLACK_METAL:crossover?AR_MUTED_FDE:HK_BLACK_METAL;
 const polymer=clay?HK_BLACK_METAL:crossover?AR_MUTED_FDE:HK_DARK_POLYMER;
 const dark=clay?HK_BLACK_METAL:FAL_VENT_SHADOW;
 const root=new THREE.Group();root.name='glock-appearance-'+id;
 root.userData.glockAppearance=id;root.userData.appearanceOnly=true;
 let n=0;
 const out=(part:'receiver'|'grip'|'magazine'|'barrel',
  profile:Outline,depth:number,material:THREE.Material)=>{
  return addOutline(root,part,id,n++,profile,depth,material);
 };
 const box=(part:'receiver'|'grip'|'magazine'|'barrel',
  x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>
  addCuboid(root,part,id,n++,x,y,z,w,h,d,material);

 // One continuous upper exterior with only two intentional nose chamfers.
 // It is a separate moving object for eventual slide animation.
 const slide=out('barrel',[
  [-9.40,.34],[front-.22,.34],[front,.60],
  [front,2.20],[front-.38,top],[-9.17,top],[-9.40,2.25]
 ],2.45,metal);
 slide.name='family-barrel-'+id+'-slide';
 slide.userData.glockMovingSlide=true;

 // The integrated frame/dust cover is one wedge, not a receiver stacked
 // on a detached spacer. A subtle front lift reads at oblique angles.
 out('receiver',[
  [-9.29,.32],[front-.08,.32],[front-.12,-.96],
  [1.96,-.96],[1.44,-1.33],[-3.72,-1.33],
  [-6.35,-.91],[-8.86,-1.22],[-9.29,-.95]
 ],2.13,polymer);

 // Grip's top directly intersects the frame. No small triangular notch,
 // disconnected upper corner, finger-groove scallops or fake second handle.
 const rearHeel=compact?-8.24:-8.68;
 const frontHeel=compact?-5.18:crossover?-5.25:-5.05;
 const grip=out('grip',[
  [-7.57,-.84],[-3.74,-1.00],[-4.20,-2.65],
  [frontHeel,heelY],[rearHeel,heelY],
  [rearHeel+.42,heelY+2.68],[-7.25,-2.12]
 ],2.04,polymer);
 grip.userData.glockHandle=true;

 // ONE physically open, squared frame. The hole is not a dark decal.
 // Larger, lower legible void pays for its geometry at miniature scale.
 const guard=new THREE.Shape();
 guard.moveTo(-3.78,-1.10);
 guard.lineTo(1.90,-1.10);
 guard.lineTo(1.90,-3.77);
 guard.lineTo(1.56,-4.03);
 guard.lineTo(-3.79,-4.03);
 guard.closePath();
 const hole=new THREE.Path();
 hole.moveTo(-2.92,-1.86);hole.lineTo(1.09,-1.86);
 hole.lineTo(1.09,-3.16);hole.lineTo(-2.92,-3.16);hole.closePath();
 guard.holes.push(hole);
 const guardGeom=new THREE.ExtrudeGeometry(guard,{
  depth:1.10,steps:1,bevelEnabled:false,curveSegments:1});
 guardGeom.translate(0,0,-.55);
 const guardMesh=new THREE.Mesh(guardGeom,polymer);
 guardMesh.name='family-receiver-'+id+'-open-guard';
 guardMesh.userData.glockOpenGuard=true;
 guardMesh.castShadow=true;guardMesh.receiveShadow=true;
 root.add(guardMesh);
 // The guard meshes into frame and front of grip. Never block its hole.

 box('magazine',(rearHeel+frontHeel)/2,heelY-.15,0,
  frontHeel-rearHeel+.28,.42,2.24,polymer);
 // A slightly oversized magazine heel is the only grip-bottom accent.

 // Two intentionally modest sights; keep them recognizable at 128px.
 box('barrel',-8.65,2.67,0,.52,.48,1.26,dark);
 box('barrel',front-.72,2.67,0,.39,.47,1.26,dark);

 if(options.details!==false&&!clay){
  // Four broad rear grooves, and on the newer slide a few front grooves.
  // One batched surface mesh across BOTH correct sides, no bevel ladders.
  const verts:number[]=[],indices:number[]=[];
  const addMark=(x:number,y:number,w:number,h:number,side:number)=>{
   const z=side*1.244;
   const base=verts.length/3;
   verts.push(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z);
   if(side>0)indices.push(base,base+1,base+2,base,base+2,base+3);
   else indices.push(base,base+2,base+1,base,base+3,base+2);
  };
  for(const side of [-1,1]){
   for(let i=0;i<4;i++)addMark(-8.86+i*.48,.73,.22,1.19,side);
   if(modern)for(let i=0;i<3;i++)
    addMark(front-2.78+i*.45,.81,.18,1.04,side);
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const marks=new THREE.Mesh(geom,dark);
  marks.name='family-barrel-'+id+'-batched-serrations';
  marks.castShadow=false;marks.receiveShadow=false;
  root.add(marks);
  // Right-side ejection suggestion. Shallow graphic plane, no 3D port kit.
  const port=box('barrel',1.68,1.74,1.240,2.22,.48,.034,dark);
  port.name='family-barrel-'+id+'-right-port';
  port.castShadow=false;port.receiveShadow=false;
 }
 root.userData.glockArtLandmarks=Object.freeze({
  rearX:-9.4,muzzleX:front,slideTopY:top,gripHeelY:heelY,
  gripRearX:rearHeel,gripFrontX:frontHeel,guardOpen:true
 });
 return root;
}
/** Never dispose globally cached palette materials. */
export function clearGlockAppearance(root:THREE.Group):void{
 root.traverse(child=>{
  if(child instanceof THREE.Mesh)child.geometry.dispose();
 });
 root.clear();
}
