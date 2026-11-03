/** Stage 3B paired historical BDU and modern ACU blouse prototypes.
 * AUTHORING SPACE: chest +X forward, +/-Z shoulders, +Y up.
 * Cosmetic geometry only. Inherit existing articulated arm meshes and all
 * Stage 2 cloth materials without modifying IK, stock, ankles or headwear.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {SleeveState} from './operator-wardrobe-data.ts';

export const FIELD_BLOUSE_CUTS=['bdu-shirt','acu-shirt'] as const;
export type FieldBlouseCut=typeof FIELD_BLOUSE_CUTS[number];
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
export type FieldBlousePrototype={torso:THREE.Group;upper:THREE.Group[];lower:THREE.Group[];
 cuffed:THREE.Group[];cuffedLower:THREE.Group[];rolledUpper:THREE.Group[]};
export type FieldBlousePrototypes=Record<FieldBlouseCut,FieldBlousePrototype>;
type Ring={y:number;front:number;back:number;side:number};

/** Authored measured envelopes, not new anatomy. The locked base body is
 * 10 x 12 x 14; armor and weapons continue to fit their original joints.
 * Historic BDU has longer, looser lower hem and fuller sleeve.
 * Modern ACU is still a LOOSE combat blouse, not a fitted combat shirt.
 */
export const BLOUSE_CUT_PROFILE={
 'bdu-shirt':{
  rings:[
   {y:6.15,front:5.22,back:-5.28,side:7.18},
   {y:4.5,front:5.80,back:-5.65,side:8.63},
   {y:-1.5,front:5.88,back:-5.67,side:8.18},
   {y:-7.30,front:5.83,back:-5.62,side:7.98}
  ],
  collar:'traditional-fold',pockets:'four-front',hem:'loose-untucked',
  upperRadius:[3.35,3.08],lowerRadius:[2.91,2.66]
 },
 'acu-shirt':{
  rings:[
   {y:6.12,front:5.25,back:-5.23,side:7.16},
   {y:4.4,front:5.58,back:-5.47,side:7.84},
   {y:-1.5,front:5.56,back:-5.43,side:7.28},
   {y:-5.98,front:5.42,back:-5.33,side:7.03}
  ],
  collar:'modern-fold-or-mandarin',pockets:'slanted-chest-and-upper-arm',
  hem:'tidy-straight',
  upperRadius:[3.13,2.77],lowerRadius:[2.72,2.49]
 }
} as const;

/** Low-poly cut-and-sewn torso loft. Each perimeter edge is its own fabric
 * panel, with UV length in world units, not a texture stretched to the mesh.
 * Four side faces remain joined while ring width tapers; no per-frame update.
 */
export function fieldBlouseShellGeometry(cut:FieldBlouseCut):THREE.BufferGeometry{
 const rings=BLOUSE_CUT_PROFILE[cut].rings as readonly Ring[];
 const positions:number[]=[],uvs:number[]=[];
 const surface=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,
  uWidth:number)=>{
  const triangles=[a,b,c,a,c,d];
  const width=uWidth/TILE_WORLD_SIZE;
  // UV2 is not required. Tile position is stable in garment-space.
  const yBase=rings[0].y;
  const coords:[[number,number],[number,number],[number,number],
    [number,number],[number,number],[number,number]]=[
   [0,(a.y-yBase)/TILE_WORLD_SIZE],[width,(b.y-yBase)/TILE_WORLD_SIZE],
   [width,(c.y-yBase)/TILE_WORLD_SIZE],[0,(a.y-yBase)/TILE_WORLD_SIZE],
   [width,(c.y-yBase)/TILE_WORLD_SIZE],[0,(d.y-yBase)/TILE_WORLD_SIZE]];
  for(let i=0;i<6;i++){
   const p=triangles[i];positions.push(p.x,p.y,p.z);
   uvs.push(...coords[i]);
  }
 };
 for(let i=0;i<rings.length-1;i++){
  const up=rings[i],dn=rings[i+1];
  // Front, right side, back, left side. All are exterior facing.
  const upper=[
   new THREE.Vector3(up.front,up.y,-up.side),
   new THREE.Vector3(up.front,up.y,up.side),
   new THREE.Vector3(up.back,up.y,up.side),
   new THREE.Vector3(up.back,up.y,-up.side)
  ];
  const lower=[
   new THREE.Vector3(dn.front,dn.y,-dn.side),
   new THREE.Vector3(dn.front,dn.y,dn.side),
   new THREE.Vector3(dn.back,dn.y,dn.side),
   new THREE.Vector3(dn.back,dn.y,-dn.side)
  ];
  for(let j=0;j<4;j++){
   const k=(j+1)%4;
   const a=upper[j],b=upper[k],c=lower[k],d=lower[j];
   // Standard winding outward for X+ face: a front left, b front right,
   // c low right. In chest +X front this is exterior-facing.
   surface(a,b,c,d,Math.hypot(b.x-a.x,b.z-a.z));
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 // Matching indexed formats let the existing mesh consolidation combine
 // collar, pocket, hem and shell into very few mobile draw calls.
 g.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
 g.computeVertexNormals();
 return g;
}
const group=(parent:THREE.Object3D,name:string)=>{
 const g=new THREE.Group();g.name=name;parent.add(g);g.visible=false;return g;
};
function box(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,tilt=0){
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);
 if(tilt)mesh.rotation.x=tilt;
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function sleeve(parent:THREE.Group,cloth:THREE.Material,
 topRadius:number,bottomRadius:number,nominalLength:number,
 height=1.07,offsetY=0){
 // Segment bone.scale.y is actual solved IK length, so a 1.07 high
 // sleeve follows it without ever changing its foot/hand transforms.
 const g=new THREE.CylinderGeometry(topRadius,bottomRadius,height,8,1,false);
 if(offsetY)g.translate(0,offsetY,0);
 const uv=g.getAttribute('uv') as THREE.BufferAttribute;
 const circumference=2*Math.PI*(topRadius+bottomRadius)*.5;
 for(let i=0;i<uv.count;i++){
  const u=uv.getX(i),v=uv.getY(i);
  uv.setXY(i,u*circumference/TILE_WORLD_SIZE,
   v*nominalLength*height/TILE_WORLD_SIZE);
 }
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(g,cloth);
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);
 return mesh;
}
function seamBand(parent:THREE.Group,cloth:THREE.Material,
 radius:number,y:number,height:number){
 // Real cylindrical fold with physical fabric density. The original pixel
 // atlas must not stretch to fill the entire cuff circumference.
 const geometry=new THREE.CylinderGeometry(radius,radius,height,10,1,true);
 const uv=geometry.getAttribute('uv') as THREE.BufferAttribute;
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)*2*Math.PI*radius/TILE_WORLD_SIZE,
   uv.getY(i)*height*10/TILE_WORLD_SIZE);
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(geometry,cloth);
 mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
export function createFieldBlousePrototypes(chest:THREE.Group,
 arms:readonly Arm[],cloth:THREE.Material,trim:THREE.Material):FieldBlousePrototypes{
 const models={} as FieldBlousePrototypes;
 for(const cut of FIELD_BLOUSE_CUTS){
  const historic=cut==='bdu-shirt',profile=BLOUSE_CUT_PROFILE[cut];
  // Exaggerated primary masses remain cosmetic; shoulder sockets and IK stay fixed.
  const torso=group(chest,'field-blouse:'+cut);
  const shell=new THREE.Mesh(fieldBlouseShellGeometry(cut),cloth);
  shell.castShadow=true;shell.receiveShadow=true;torso.add(shell);
  if(historic){
   // Open conventional collar with two broad turned-down lapels.
   box(torso,cloth,-1.5,6.60,0,7.2,1.38,8.6);
   for(const sign of [-1,1]){
    box(torso,cloth,3.55,6.66,sign*3.18,3.9,1.02,3.40,
     sign*.24);
    // Four distinct BDU cargo pockets, two chest and two lower.
    for(const y of [2.1,-4.05]){
     box(torso,cloth,6.14,y,sign*3.66,.58,3.04,4.68);
     box(torso,cloth,6.46,y+1.43,sign*3.66,.36,.88,4.92);
    }
   }
   // Concealed button placket: visible only at close Lab zoom.
   box(torso,trim,5.99,-.20,0,.15,9.05,.40);
   box(torso,cloth,5.91,-7.05,0,.42,.68,15.20);
  }else{
   // Fold-down modern ACU collar. Earlier UCP versions may stand higher;
   // keep the low folded silhouette for the OCP reference in this pass.
   box(torso,cloth,-1.25,6.50,0,7.0,1.32,7.6);
   for(const sign of [-1,1]){
    box(torso,cloth,3.35,6.27,sign*2.6,3.60,.82,2.90,
     sign*.17);
    // Diagonal chest cargo pockets, slimmer and higher than BDU.
    box(torso,cloth,5.86,1.15,sign*3.60,.46,3.40,4.20,
     -sign*.27);
    box(torso,cloth,6.12,2.76,sign*3.75,.28,.78,4.25,
     -sign*.27);
   }
   // Hidden zipper/placket and short hem, rather than BDU four-pocket apron.
   box(torso,trim,5.66,-.14,0,.16,9.85,.35);
   box(torso,cloth,5.52,-5.81,0,.37,.62,13.60);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
  cuffed:THREE.Group[]=[],cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   const a=group(arm.upper,cut+':upper-sleeve:'+index);
   const b=group(arm.lower,cut+':forearm-sleeve:'+index);
   const c=group(arm.lower,cut+':cuffed-wrist:'+index);
   const short=group(arm.lower,cut+':short-cuffed-forearm:'+index);
   const rolled=group(arm.upper,cut+':rolled-upper:'+index);
   sleeve(a,cloth,profile.upperRadius[0],profile.upperRadius[1],10.0);
   sleeve(b,cloth,profile.lowerRadius[0],profile.lowerRadius[1],9.6);
   // Sleeve ends substantially above the wrist when cuffed; the original
   // lower-arm bone becomes bare skin under this shortened cloth shell.
   sleeve(short,cloth,profile.lowerRadius[0]+.07,
    profile.lowerRadius[1]+.17,9.6,.77,-.135);
   // Double-layer rolled fabric, with sleeve shortened to ABOVE elbow.
   // No manipulation of either IK limb transform or hand contact.
   sleeve(rolled,cloth,profile.upperRadius[0],profile.upperRadius[1],
    10.0,.80,-.135);
   seamBand(rolled,cloth,profile.upperRadius[1]+.36,.285,.12);
   if(historic){
    box(b,cloth,0,.38,2.65,2.45,.12,.56);
    seamBand(c,cloth,profile.lowerRadius[0]+.42,.235,.24);
    seamBand(c,cloth,profile.lowerRadius[0]+.30,.125,.21);
   }else{
    // Upper-arm sleeve pockets survive in either regular or rolled fit.
    for(const g of [a,rolled]){
     box(g,cloth,0,.10,3.10,3.05,.30,.95);
     box(g,trim,.02,.290,3.15,2.80,.08,1.00);
    }
    box(b,cloth,0,.40,2.62,2.25,.10,.48);
    seamBand(c,cloth,profile.lowerRadius[0]+.33,.235,.24);
    seamBand(c,cloth,profile.lowerRadius[0]+.21,.125,.18);
   }
   for(const g of [a,b,c,short,rolled])consolidateVisualGroup(g);
   upper.push(a);lower.push(b);cuffed.push(c);cuffedLower.push(short);rolledUpper.push(rolled);
  }
  consolidateVisualGroup(torso);
  models[cut]={torso,upper,lower,cuffed,cuffedLower,rolledUpper};
 }
 return models;
}
export function updateFieldBlousePrototypes(
 models:FieldBlousePrototypes,top:string,state:SleeveState='unrolled'){
 for(const cut of FIELD_BLOUSE_CUTS){
  const show=cut===top,model=models[cut];
  model.torso.visible=show;
  for(const g of model.upper)g.visible=show&&state!=='rolled';
  for(const g of model.lower)g.visible=show&&state==='unrolled';
  for(const g of model.cuffedLower)g.visible=show&&state==='cuffed';
  for(const g of model.cuffed)g.visible=show&&state==='cuffed';
  for(const g of model.rolledUpper)g.visible=show&&state==='rolled';
 }
}
